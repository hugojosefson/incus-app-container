import { isAbsolutePath } from "./absolute-path.ts";
import {
  CreateAppContainerOptions,
  resolveCreateAppContainerOptions,
} from "./create-app-container-options.ts";
import { createAppContainer } from "./create-app-container.ts";
import { breadc, run, s } from "./deps.ts";
import {
  INCUS_CONTAINER_STATUS_CODES,
  untilStatusCode,
} from "./incus-container-status.ts";
import { isOutputFormat, OUTPUT_FORMATS } from "./output-format.ts";
import { isSize } from "./size.ts";
import { isSshKey } from "./ssh-key.ts";
import { enforceType, optional } from "./type-guard.ts";

export const COMMAND_NAMES = ["create", "delete", "list"] as const;
export type CommandName = typeof COMMAND_NAMES[number];

/**
 * Creates an instance of our CLI.
 */
export async function createCli() {
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
    .option(
      "--start",
      {
        description: "Start the container after creating it.",
        default: false,
        cast: Boolean,
      },
    )
    .option(
      "--disk-size <size>",
      {
        description: "Disk size for the container, for example 10GiB.",
        cast: await enforceType(
          optional(isSize),
          "a valid size, for example 10GiB",
          "size",
        ),
      },
    )
    .option(
      "--apps-dir <apps-dir>",
      {
        default: "/mnt/apps",
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
        const options: CreateAppContainerOptions<typeof inputOptions.appsDir> =
          await resolveCreateAppContainerOptions(inputOptions);
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
        default: false,
        cast: Boolean,
      },
    )
    .option(
      "--delete-appdata",
      {
        description: "Delete the appdata directory as well.",
        default: false,
        cast: Boolean,
      },
    )
    .action((containerName: string, { deleteAppdata }) => {
      console.log(
        `Deleting container ${s(containerName)}${
          deleteAppdata ? " and its appdata" : ""
        }...`,
      );
    });

  cli
    .command("list", "List all Incus app container instances.")
    .alias("ls")
    .option("--format <format>", {
      description: "Output format.",
      default: "table",
      cast: await enforceType(isOutputFormat, OUTPUT_FORMATS, "format"),
    })
    .action(({ format }) => {
      console.log(`Listing containers as ${format}...`);
    });

  return cli;
}
