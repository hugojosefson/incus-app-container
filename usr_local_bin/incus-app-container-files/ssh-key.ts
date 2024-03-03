import { isString } from "https://deno.land/x/fns@1.1.0/string/is-string.ts";
import { s } from "./deps.ts";
import { MultiArgument, resolveMultiArgument } from "./multi-argument.ts";
import { getPasswdRowOfLocalUser } from "./passwd-row.ts";
import { readTextFiles } from "./read-text-files.ts";

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

export function parseSshKeyFile(contents: string): SshKeyRaw[] {
  return contents
    .split("\n")
    .filter(isSshKeyRaw)
    .map((k) => k as SshKeyRaw);
}

export async function resolveSshKey(sshKey: SshKey): Promise<SshKeyRaw[]> {
  if (isPrefixedUsername(sshKey)) {
    const [prefix, username] = sshKey.split(":");
    if (prefix === "gh") {
      return parseSshKeyFile(
        await (await fetch(`https://github.com/${username}.keys`))
          .text(),
      );
    }
    if (prefix === "local") {
      const homeDir = (await getPasswdRowOfLocalUser(username)).home;
      return (await readTextFiles(
        `${homeDir}/.ssh`,
        ({ name }) => name.endsWith(".pub"),
      ))
        .map(parseSshKeyFile)
        .flat();
    }
  }
  if (isSshKeyRaw(sshKey)) {
    return [sshKey];
  }
  throw new Error(`Invalid ssh key: ${s(sshKey)}`);
}

export async function resolveSshKeys(sshKeyArg: MultiArgument<SshKey>): Promise<
  SshKeyRaw[]
> {
  const sshKeys: SshKey[] = await resolveMultiArgument(sshKeyArg);
  const promisesOfSshKeys: Promise<SshKeyRaw[]>[] = sshKeys.map(resolveSshKey);
  const sshKeyRawss: SshKeyRaw[][] = await Promise.all(promisesOfSshKeys);
  const sshKeyRaws: SshKeyRaw[] = sshKeyRawss.flat();
  return sshKeyRaws;
}
