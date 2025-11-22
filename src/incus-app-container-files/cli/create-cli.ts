import { breadc, isString } from "../deps.ts";
import { enforceType } from "../type-guard.ts";
import { AbsolutePath, isAbsolutePath } from "./things/absolute-path.ts";
import { DEFAULT_BRIDGE, isBridgeName } from "./things/bridge-name.ts";
import { setupIncus } from "./commands/setup-incus/mod.ts";
import { setpoint } from "./commands/setpoint/mod.ts";
import { Config } from "./config.ts";
import { NO_DEFAULT_VALUE } from "./things/no-default-value.ts";

export const COMMAND_NAMES = [
  "create",
  "list",
  "setup-incus",
  "setpoint",
] as const;
export type CommandName = typeof COMMAND_NAMES[number];

/**
 * Creates an instance of our CLI.
 */
export async function createCli<
  AppsDir extends AbsolutePath,
  C extends Config<AppsDir>,
>(
  defaults: C = {} as C,
) {
  const cli = breadc("incus-app-container", {
    description: "Opinionated script for creating Incus containers for apps.",
    version: "0.0.0",
  });

  cli
    .command("setup-incus", "Setup Incus on this machine.")
    .option(
      "--dry-run",
      {
        description:
          "Do not actually install or configure anything. Output the preseed to stdout.",
        cast: Boolean,
        default: defaults?.["setup-incus"]?.dryRun ?? defaults.dryRun ?? false,
      },
    )
    .option(
      "--pool-disk <pool-disk>",
      {
        description: "Empty block device for the storage pool.",
        cast: await enforceType(isString),
        default: defaults?.["setup-incus"]?.poolDisk ?? defaults.poolDisk ??
          "/dev/vdb",
      },
    )
    .option(
      "--bridge-name <bridge-name>",
      {
        description: "Name of the network bridge device.",
        cast: await enforceType(isBridgeName),
        default: defaults?.["setup-incus"]?.bridgeName ?? defaults.bridgeName ??
          DEFAULT_BRIDGE ?? NO_DEFAULT_VALUE,
      },
    )
    .option(
      "--bridge-cidr <bridge-cidr>",
      {
        description: "IP/net or 'dhcp' to use for the bridge.",
        cast: await enforceType(isString),
        default: defaults?.["setup-incus"]?.bridgeCidr ?? defaults.bridgeCidr ??
          "dhcp",
      },
    )
    .action(setupIncus);

  cli
    .command(
      "setpoint",
      "Print the current setpoint; the containers we want, according to configuration files.",
    )
    .option(
      "--apps-dir <apps-dir>",
      {
        default: defaults?.setpoint?.appsDir ?? defaults.appsDir ??
          "/srv",
        description:
          "Base directory for where all app containers' metadata and appdata are (to be) stored.",
      },
    )
    .option(
      "--wrap",
      {
        default: true,
        description: "Wrap the output in a JSON object.",
      },
    )
    .action((options) =>
      setpoint({
        ...options,
        appsDir: isAbsolutePath(options.appsDir) ? options.appsDir : "/srv",
      })
    );

  return cli;
}
