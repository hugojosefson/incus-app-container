import { AbsolutePath } from "./absolute-path.ts";
import { CreateAppContainerInputOptions } from "./create-app-container-options.ts";
import { CommandName } from "./create-cli.ts";
import { createDeepMapKeys } from "./deep-map.ts";
import { camelCase, parseToml } from "./deps.ts";
import { OutputFormat } from "./output-format.ts";

const CONFIG_FILE = `/etc/default/incus-app-container`;

export type CreateInputOptions<AppsDir extends AbsolutePath> =
  & CreateAppContainerInputOptions<AppsDir>
  & { sshKey: string };

export type Config<AppsDir extends AbsolutePath = AbsolutePath> =
  & Partial<InputOptions<"create", AppsDir>>
  & Partial<InputOptions<"delete", AppsDir>>
  & Partial<InputOptions<"list", AppsDir>>
  & Partial<InputOptionsPerCommand<AppsDir>>;

export type DeleteInputOptions = {
  force: boolean;
  deleteAppdata: boolean;
};
export type ListInputOptions = {
  format: OutputFormat;
};
export type InputOptions<C extends CommandName, AppsDir extends AbsolutePath> =
  C extends "create" ? CreateInputOptions<AppsDir>
    : C extends "delete" ? DeleteInputOptions
    : C extends "list" ? ListInputOptions
    : never;

export type InputOptionsPerCommand<AppsDir extends AbsolutePath> = {
  [K in CommandName]: InputOptions<K, AppsDir>;
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

export const camelCaseKeys = createDeepMapKeys(camelCase);
