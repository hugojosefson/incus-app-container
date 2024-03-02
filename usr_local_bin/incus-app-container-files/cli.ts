/*
 * via https://github.com/hugojosefson/incus-app-container
 * License: MIT
 * Copyright (c) 2022 Hugo Josefson
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { breadc, ParseError } from "npm:breadc@0.9.7";
import { s } from "https://deno.land/x/fns@1.1.0/string/s.ts";
import { isString } from "https://deno.land/x/fns@1.1.0/string/is-string.ts";
import { createAppContainer } from "./ct-template.ts";

export type GetterOr<T> = T | (() => T);
export type PromiseOr<T> = T | Promise<T>;
export type AsyncGetterOr<T> = GetterOr<PromiseOr<T>>;
export type ValidValues<T> = AsyncGetterOr<Readonly<T[] | Set<T> | string>>;
async function resolveValidValueMessage<T>(
  validValues: ValidValues<T>,
): Promise<string | undefined> {
  validValues = await validValues;
  if (typeof validValues === "string") {
    const message: string = validValues;
    return message;
  }
  if (typeof validValues === "function") {
    return resolveValidValueMessage(validValues());
  }
  if (validValues instanceof Set) {
    return `one of: ${[...validValues].join(", ")}.`;
  }
  if (Array.isArray(validValues)) {
    return `one of: ${validValues.join(", ")}.`;
  }
  return undefined;
}

export const OUTPUT_FORMATS = ["table", "json", "jsonl", "plain"] as const;
export type OutputFormat = typeof OUTPUT_FORMATS[number];
export const isOutputFormat = (value: unknown): value is OutputFormat =>
  OUTPUT_FORMATS.includes(value as OutputFormat);

export type SshKeyUsernamePrefix = "gh" | "local";
export type PrefixedUsername<Prefix extends SshKeyUsernamePrefix> =
  `${Prefix}:${string}`;
export const PREFIXED_USERNAME_REGEX = /^(gh|local):/;
export type SshKeyRaw = `ssh-{string} {string}`;
export type SshKey =
  | PrefixedUsername<SshKeyUsernamePrefix>
  | SshKeyRaw;

export function isSshKeyRaw(value: unknown): value is SshKeyRaw {
  if (!isString(value)) {
    return false;
  }
  return value.startsWith("ssh-") && value.includes(" ");
}

export function isPrefixedUsername(
  value: unknown,
): value is PrefixedUsername<SshKeyUsernamePrefix> {
  if (!isString(value)) {
    return false;
  }
  return PREFIXED_USERNAME_REGEX.test(value);
}

export function isPrefixedUsernameWith(prefix: SshKeyUsernamePrefix) {
  return (value: unknown): value is PrefixedUsername<typeof prefix> =>
    isPrefixedUsername(value) && value.startsWith(prefix + ":");
}

export function isSshKey(value: unknown): value is SshKey {
  return isSshKeyRaw(value) || isPrefixedUsername(value);
}

export async function enforceType<T>(
  typeGuard: (value: unknown) => value is T,
  validValues: ValidValues<T> = [],
  name = typeGuard.name.replace(/^is/, ""),
): Promise<(value: unknown) => T> {
  const validValueMessage = await resolveValidValueMessage(validValues);
  return (value: unknown): T => {
    if (!typeGuard(value)) {
      const message = `Invalid ${name}: ${value}.` +
        (validValueMessage ? `\nMust be ${validValueMessage}` : "");
      throw new ParseError(message);
    }
    return value;
  };
}

export function isArrayOf<T>(
  typeGuard: (value: unknown) => value is T,
): (value: unknown) => value is T[] {
  return (value: unknown): value is T[] =>
    Array.isArray(value) && value.every(typeGuard);
}

export function optional<T>(
  typeGuard: (value: unknown) => value is T,
): (value: unknown) => value is T | undefined {
  return (value: unknown): value is T | undefined =>
    value === undefined || typeGuard(value);
}

const cli = breadc("incus-app-container", {
  description: "Opinionated script for creating Incus containers for apps.",
  version: "0.0.0",
});

cli
  .command("create <container_name>", "Create a new Incus app container.")
  .option(
    "--cidr <cidr>",
    {
      description:
        "Network address for the container in CIDR format, for example 10.20.30.40/24; or 'dhcp'.",
      default: "dhcp",
    },
  )
  .option(
    "--ssh-key <ssh-key>",
    {
      description:
        "Public ssh key(s) to add to the container's authorized_keys file. Actual key, or `gh:${username}` for importing from GitHub, or `local:${username}` for importing from local user.",
      cast: await enforceType(
        optional(isSshKey),
        "an actual ssh public key, or `gh:${username}` for importing from GitHub, or `local:${username}` for importing from local user.",
        "ssh-key",
      ),
    },
  )
  .action(async (name: string, { cidr, sshKey }) => {
    console.log(s(name));
    const { appdataDir } = await createAppContainer({ name, cidr, sshKey });
    console.log(appdataDir);
  });

cli
  .command("delete <container_name>", "Delete an Incus app container.")
  .action((containerName: string) => {
    console.log(`Deleting container ${s(containerName)}`);
  });

cli
  .command("list", "List all Incus app containers.")
  .option("--format <format>", {
    description: "Output format.",
    default: "table",
    cast: await enforceType(isOutputFormat, OUTPUT_FORMATS, "format"),
  })
  .action(({ format }) => {
    console.log(`Listing containers as ${format}...`);
  });

try {
  await cli.run(Deno.args);
} catch (e) {
  if (e instanceof ParseError) {
    const hr = "-".repeat(Deno.consoleSize().columns);
    await cli.run(["--help"]);
    console.error(
      [
        hr,
        e.message,
        hr,
      ].join("\n"),
    );
    Deno.exit(2);
  }
  throw e;
}
