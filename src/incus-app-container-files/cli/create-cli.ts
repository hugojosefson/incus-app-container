import { breadc, isString, optionalTypeGuard, run } from "../deps.ts";
import { enforceType } from "../type-guard.ts";
import { AbsolutePath, isAbsolutePath } from "./absolute-path.ts";
import { DEFAULT_BRIDGE, isBridgeName } from "./bridge-name.ts";
import { createAppContainer } from "./commands/create-app-container/mod.ts";
import { resolveCreateAppContainerOptions } from "./commands/create-app-container/options.ts";
import { isSize } from "./commands/create-app-container/size.ts";
import { isSshKey } from "./commands/create-app-container/ssh-key.ts";
import { deleteAppContainer } from "./commands/delete-app-container.ts";
import { listAppContainers } from "./commands/list-app-containers.ts";
import { setupIncus } from "./commands/setup-incus/mod.ts";
import { Config } from "./config.ts";
import {
  INCUS_CONTAINER_STATUS_CODES,
  untilStatusCode,
} from "./incus-container-status.ts";
import {
  isOutputFormat,
  OUTPUT_FORMATS,
  OutputFormat,
} from "./output-format.ts";
import { castAndEnforceVlan } from "./vlan.ts";

export const COMMAND_NAMES = [
  "create",
  "delete",
  "list",
  "setup-incus",
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
    .command("create <container_name>", "Create a new Incus app container.")
    .option(
      "--ip <cidr>",
      {
        description:
          "Network address for the container in CIDR format, for example 10.20.30.40/24; or 'dhcp'.",
        cast: await enforceType(isString),
        default: defaults?.create?.ip ?? defaults.ip ?? "dhcp",
      },
    )
    .option(
      "--bridge-name <bridge-name>",
      {
        description: "Name of the network bridge device.",
        cast: await enforceType(isBridgeName),
        default: defaults?.["create"]?.bridgeName ?? defaults.bridgeName ??
          DEFAULT_BRIDGE,
      },
    )
    .option("--vlan <vlan>", {
      description: "VLAN id for the container.",
      cast: castAndEnforceVlan,
      default: (
        (x?: number) => x === undefined ? undefined : `${x}`
      )(castAndEnforceVlan(defaults?.create?.vlan ?? defaults.vlan)),
    })
    .option(
      "--ssh-key <ssh-key>",
      {
        description:
          "Public ssh key(s) to add to the container's authorized_keys file. Actual key, or `gh:${username}` for importing from GitHub, or `local:${username}` for importing from local user.",
        cast: await enforceType(
          optionalTypeGuard(isSshKey),
          "an actual ssh public key, or `gh:${username}` for importing from GitHub, or `local:${username}` for importing from local user.",
          "ssh-key",
        ),
        default: defaults?.create?.sshKey ?? defaults.sshKey ?? undefined,
      },
    )
    .option(
      "--start",
      {
        description: "Start the container after creating it.",
        default: defaults?.create?.start ?? defaults.start ?? false,
        cast: Boolean,
      },
    )
    .option(
      "--disk-size <size>",
      {
        description: "Disk size for the container, for example 10GiB.",
        cast: await enforceType(
          isSize,
          "a valid size, for example 10GiB",
          "size",
        ),
        default: defaults?.create?.diskSize ?? defaults.diskSize ?? "10GiB",
      },
    )
    .option(
      "--apps-dir <apps-dir>",
      {
        default: defaults?.create?.appsDir ?? defaults.appsDir ?? "/mnt/apps",
        description:
          "Base directory for where all app containers' appdata are (to be) stored.",
        cast: await enforceType(
          isAbsolutePath,
          "an absolute path, for example /mnt/apps",
          "apps-dir",
        ),
      },
    )
    .action(
      async (name: string, inputOptions) => {
        const options = await resolveCreateAppContainerOptions(inputOptions);
        const { appdataDir } = await createAppContainer(name, options);
        if (options.start) {
          await run(["incus", "start", name]);
          await untilStatusCode(
            INCUS_CONTAINER_STATUS_CODES.Running,
            name,
            {
              pending: `Starting container, as requested...`,
              done: `Started container, as requested.`,
            },
          );
        }
        console.log(appdataDir);
      },
    );

  cli
    .command(
      "delete <container_name>",
      "Delete an Incus app container instance.",
    )
    .alias("rm")
    .option(
      "--force",
      {
        description: "Force the removal of running instance, if any.",
        default: defaults?.delete?.force ?? defaults.force ?? false,
        cast: Boolean,
      },
    )
    .option(
      "--delete-appdata",
      {
        description: "Delete the appdata directory as well.",
        default: defaults?.delete?.deleteAppdata ?? defaults.deleteAppdata ??
          false,
        cast: Boolean,
      },
    )
    .action((containerName: string, { deleteAppdata }) => {
      deleteAppContainer(containerName, deleteAppdata);
    });

  cli
    .command("list", "List all Incus app container instances.")
    .alias("ls")
    .option("--format <format>", {
      description: "Output format.",
      default: defaults?.list?.format ?? defaults.format ?? "table",
      cast: await enforceType(isOutputFormat, OUTPUT_FORMATS, "format"),
    })
    .action(({ format }: { format: OutputFormat }) => {
      listAppContainers(format);
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
          DEFAULT_BRIDGE,
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

  return cli;
}
