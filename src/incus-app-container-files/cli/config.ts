import { AbsolutePath } from "./things/absolute-path.ts";

import { SetupIncusOptions } from "./commands/setup-incus/mod.ts";
import { CommandName } from "./create-cli.ts";
import { createDeepMapKeys } from "../deps.ts";
import { camelCase, parseToml } from "../deps.ts";

const CONFIG_FILE = `/etc/default/incus-app-container`;

export type Config<AppsDir extends AbsolutePath = AbsolutePath> =
  & Partial<InputOptions<"setup-incus", AppsDir>>
  & Partial<InputOptions<"setpoint", AppsDir>>
  & Partial<InputOptionsPerCommand<AppsDir>>;

export type InputOptions<C extends CommandName, AppsDir extends AbsolutePath> =
  C extends "setup-incus" ? SetupIncusOptions
    : C extends "setpoint" ? SetpointInputOptions<AppsDir>
    : never;

export type InputOptionsPerCommand<AppsDir extends AbsolutePath> = {
  [K in CommandName]: InputOptions<K, AppsDir>;
};

export type SetpointInputOptions<AppsDir extends AbsolutePath> = {
  appsDir: AppsDir;
  wrap: boolean;
};

export async function getConfig<
  AppsDir extends AbsolutePath = AbsolutePath,
>(): Promise<
  Config<AppsDir>
> {
  try {
    const contents: string = await Deno.readTextFile(CONFIG_FILE);
    const toml: Record<string, unknown> = parseToml(contents);
    return camelCaseKeys(toml);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return {};
    }
    throw e;
  }
}

/**
 * Converts all keys in a deep map to camelCase.
 */
export const camelCaseKeys = createDeepMapKeys(camelCase);
