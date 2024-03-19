import { CommandName } from "./create-cli.ts";
import { parseToml } from "./deps.ts";

/**
 * Extracts a table from a parsed TOML config.
 * @param config the parsed TOML config
 * @param tableName the name of the table to extract, or undefined to extract the root table
 */
export function getConfigTable<
  Table extends string,
  Result extends Record<string, unknown>,
>(config: Record<string, unknown>, tableName?: Table): Partial<Result> {
  return config[tableName ?? ""] ?? {} as Partial<Result>;
}

/**
 * Extracts command line arguments from the contents of a config file,
 * returning them as an array of strings.
 * @param configFileContents The contents of the config file.
 * @param command The command to extract arguments for, or undefined to extract arguments for before any command.
 * @returns An array of strings, where each string is a command line argument.
 */
function getArgsFromConfig(
  configFileContents: string,
  command?: CommandName,
): string[] {
  const toml = parseToml(configFileContents);
  const table = getConfigTable(toml, command);
  return Object.entries(table).flatMap(([key, value]) => {
    if (value === true) {
      return [`--${key}`];
    }
    if (value === false) {
      return [];
    }
    return [`--${key}`, `${value}`];
  });
}

/**
 * Reads the contents of the file `/etc/defaults/incus-app-container` and
 * returns its lines as an array of strings, where each string is a command line
 * argument on the form `--key`, `value`, `--key=value`, or similar.
 */
export async function getConfigFileArgs(
  command?: CommandName,
): Promise<string[]> {
  const configFile = `/etc/default/incus-app-container`;
  try {
    const contents: string = await Deno.readTextFile(configFile);
    return getArgsFromConfig(contents, command);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return [];
    }
    throw e;
  }
}
