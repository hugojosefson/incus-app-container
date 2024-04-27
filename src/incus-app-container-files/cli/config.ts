import { AbsolutePath } from "./absolute-path.ts";
import { BridgeName } from "./bridge-name.ts";
import { CreateAppContainerInputOptions } from "./commands/create-app-container/options.ts";
import { SetupIncusOptions } from "./commands/setup-incus/mod.ts";
import { CommandName } from "./create-cli.ts";
import { createDeepMapKeys } from "../deps.ts";
import { camelCase, parseToml } from "../deps.ts";
import { OutputFormat } from "./output-format.ts";

const CONFIG_FILE = `/etc/default/incus-app-container`;

export type Config<AppsDir extends AbsolutePath = AbsolutePath> =
  & Partial<InputOptions<"create", AppsDir>>
  & Partial<InputOptions<"list", AppsDir>>
  & Partial<InputOptions<"setup-incus", AppsDir>>
  & Partial<InputOptionsPerCommand<AppsDir>>;

export type InputOptions<C extends CommandName, AppsDir extends AbsolutePath> =
  C extends "create" ? CreateInputOptions<AppsDir>
    : C extends "list" ? ListInputOptions
    : C extends "setup-incus" ? SetupIncusOptions
    : never;

export type InputOptionsPerCommand<AppsDir extends AbsolutePath> = {
  [K in CommandName]: InputOptions<K, AppsDir>;
};

export type CreateInputOptions<AppsDir extends AbsolutePath> =
  & CreateAppContainerInputOptions<AppsDir>
  & {
    sshKey: string;
    bridgeName: BridgeName;
  };

export type ListInputOptions = {
  format: OutputFormat;
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
