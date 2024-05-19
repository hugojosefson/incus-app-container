import { run, stringifyYaml } from "../../../deps.ts";
import { StatusSpinnerResource } from "../../../status-spinner-resource.ts";
import { AbsolutePath } from "../../absolute-path.ts";
import {
  INCUS_CONTAINER_STATUS_CODES,
  untilStatusCode,
} from "../../incus-container-status.ts";
import { toTemplateName } from "../../supported-image.ts";
import { createVlanEtcNetworkInterfacesD } from "../../vlan.ts";
import {
  CloudInitNetworkConfig,
  createCloudInitNetworkConfig,
} from "../../cloud-init-network-config.ts";
import { CloudInitUserConfig } from "../../cloud-init-user-config.ts";
import {
  CloudInitVendorConfig,
  createCloudInitVendorConfig,
} from "../../cloud-init-vendor-config.ts";
import {
  createIncusContainerConfig,
  IncusCliInstance,
} from "./incus-cli-instance.ts";
import { calculateNicParentName, calculateNicType, getNic } from "../../nic.ts";
import { CreateAppContainerOptions } from "./options.ts";

export type AppDir<Name extends string> = `${string | ""}/apps/${Name}`;
export type AppDataDir<Name extends string> = `${
  | string
  | ""}/apps/${Name}/appdata`;
export type AppContainer<Name extends string> = {
  name: Name;
  appDir: AppDir<Name>;
};

export async function createAppContainer<
  AppsDir extends AbsolutePath,
  Name extends string,
>(
  options: CreateAppContainerOptions<AppsDir, Name>,
): Promise<AppContainer<Name>> {
  const appDir = `${options.appsDir}/${options.name}` as AppDir<Name>;
  const appDataDir = `${appDir}/appdata` as AppDataDir<Name>;
  {
    using spinner = new StatusSpinnerResource(options.name, {
      pending: "Creating container...",
      done: "Created container.",
    });

    spinner.currentStatus = "Restarting network to reload NIC:s...";
    await run("systemctl restart networking");

    const nicParentName = calculateNicParentName(
      options.bridgeName,
      options.vlan,
    );
    const nicType = calculateNicType(options.vlan);
    spinner.currentStatus = `Checking NIC: ${nicParentName}`;

    const nicParent = await getNic(nicParentName);

    if (!nicParent) {
      if (!options.vlan) {
        throw new Error(
          `No bridge NIC named ${nicParentName} found. Please create it.`,
        );
      }
      spinner.currentStatus = `Creating vlan ${options.vlan}...`;
      await Deno.writeTextFile(
        `/etc/network/interfaces.d/${nicParentName}`,
        createVlanEtcNetworkInterfacesD(options.bridgeName, options.vlan),
      );
      spinner.currentStatus =
        `Restarting network to activate vlan ${options.vlan}...`;
      await run("systemctl restart networking");
    }

    spinner.currentStatus = `checking image ${options.imageUri}`;
    await run(["incus", "image", "info", options.imageUri as string]);

    spinner.currentStatus = "building cloud-init vendor config";
    const vendorConfig: CloudInitVendorConfig = createCloudInitVendorConfig(
      options,
    );

    spinner.currentStatus = "building cloud-init user config";
    const userConfig: CloudInitUserConfig = {};

    spinner.currentStatus = "building cloud-init network config";
    const networkConfig: CloudInitNetworkConfig = createCloudInitNetworkConfig(
      options,
    );

    spinner.currentStatus = "creating container";
    const incusContainerConfig: IncusCliInstance = createIncusContainerConfig(
      nicType,
      nicParentName,
      options,
      userConfig,
      vendorConfig,
      networkConfig,
    );
    await run([
      "incus",
      "create",
      "--no-profiles",
      "--storage=default",
      options.imageUri as string,
      options.name,
    ], {
      stdin: stringifyYaml(incusContainerConfig),
    });

    spinner.currentStatus = "creating root disk";
    await run([
      "incus",
      "config",
      "device",
      "set",
      options.name,
      "root",
      `size=${options.diskSize}`,
    ]);

    await Deno.mkdir(appDir, { recursive: true });
    await run([
      "chown",
      "-R",
      `${options.idmapBase}:${options.idmapBase}`,
      appDir,
    ]); // because Deno.chown is not recursive
    spinner.currentStatus =
      `creating bind-mount from host:${appDataDir} to ${options.name}:/appdata`;
    await run([
      "incus",
      "config",
      "device",
      "add",
      options.name,
      "appdata-bind-mount",
      "disk",
      `source=${appDataDir}`,
      `path=/appdata`,
    ]);
  }
  {
    using _ = new StatusSpinnerResource(options.name, {
      pending: "Starting cloud-init...",
    });
    await run(["incus", "start", options.name]);
  }
  await untilStatusCode(
    INCUS_CONTAINER_STATUS_CODES.Stopped,
    name,
    {
      pending: `Running cloud-init...`,
      done: `Finished cloud-init.`,
    },
  );
  {
    using spinner = new StatusSpinnerResource(options.name, {
      pending: "Running install script...",
      done: "Ran install script.",
    });
    spinner.currentStatus = `Fetching install script for ${options.imageUri}`;
    await untilStatusCode(INCUS_CONTAINER_STATUS_CODES.Stopped, options.name);
    await run(["incus", "start", options.name]);
    await untilStatusCode(INCUS_CONTAINER_STATUS_CODES.Running, options.name);

    spinner.currentStatus = `Pushing install script for ${options.imageUri}...`;
    await run([
      "incus",
      "file",
      "push",
      import.meta.dirname + "/../../../template/" +
      toTemplateName(options.imageUri),
      `${name}/usr/local/bin/`,
      "--mode",
      "0755",
    ]);

    spinner.currentStatus = "Waiting for network...";
    await run([
      "incus",
      "exec",
      options.name,
      "--",
      "sh",
      "-c",
      "until ping -c1 one.one.one.one; do sleep 0.2; done",
    ]);
    await run([
      "incus",
      "exec",
      options.name,
      "--",
      "sh",
      "-c",
      "until apk update --no-cache || apt-get update; do sleep 0.5; done",
    ]);

    spinner.currentStatus = `Running install script ${
      toTemplateName(options.imageUri)
    }...`;
    await run([
      "incus",
      "exec",
      options.name,
      "--",
      toTemplateName(options.imageUri),
    ]);

    spinner.currentStatus =
      `Finished running install script for ${options.imageUri}. Stopping container...`;
    await run(["incus", "stop", options.name]);
    await untilStatusCode(INCUS_CONTAINER_STATUS_CODES.Stopped, options.name);
  }

  return {
    name: options.name,
    appDir,
  };
}
