import { run } from "https://deno.land/x/run_simple@2.3.0/src/run.ts";
import { stringifyYaml } from "../../../deps.ts";
import { AbsolutePath } from "../../absolute-path.ts";
import {
  INCUS_CONTAINER_STATUS_CODES,
  untilStatusCode,
} from "../../incus-container-status.ts";
import { toTemplateName } from "../../supported-image.ts";
import { createVlanEtcNetworkInterfacesD, Vlan } from "../../vlan.ts";
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
} from "../create-app-container/incus-cli-instance.ts";
import { AppDataDir, AppDir } from "../create-app-container/mod.ts";
import {
  calculateNicParentName,
  calculateNicType,
  getNic,
  NicParentName,
} from "../../nic.ts";
import { CreateAppContainerOptions } from "../create-app-container/options.ts";
import { TofuIncusInstance } from "./tofu-incus-instance.ts";
import { BridgeName } from "../../bridge-name.ts";

export type HostVlan<
  BN extends BridgeName,
  V extends Vlan,
> = {
  bridgeName: BN;
  vlan: V;
  ifaceFilePath: `/etc/network/interfaces.d/${NicParentName<BN, V>}`;
};

export async function calculateTofuIncusInstance<
  AppsDir extends AbsolutePath,
  Name extends string,
>(
  options: CreateAppContainerOptions<AppsDir, Name>,
): Promise<[TofuIncusInstance, HostVlan<BridgeName, Vlan>[]]> {
  const appDir = `${options.appsDir}/${options.name}` as AppDir<Name>;
  const appDataDir = `${appDir}/appdata` as AppDataDir<Name>;
  const hostVlans: HostVlan<BridgeName, Vlan>[] = [];

  // TODO: return a declaration of the nics, vlans we expect to exist, instead.
  await run("systemctl restart networking");
  const nicParentName: NicParentName<BridgeName, Vlan> = calculateNicParentName(
    options.bridgeName,
    options.vlan,
  );
  const nicParent = await getNic(nicParentName);

  if (!nicParent) {
    if (!options.vlan) {
      throw new Error(
        `No bridge NIC named ${nicParentName} found. Please create it.`,
      );
    }
    await Deno.writeTextFile(
      `/etc/network/interfaces.d/${nicParentName}`,
      createVlanEtcNetworkInterfacesD(options.bridgeName, options.vlan),
    );
    `Restarting network to activate vlan ${options.vlan}...`;
    await run("systemctl restart networking");
  }

  await run(["incus", "image", "info", options.imageUri as string]);

  const vendorConfig: CloudInitVendorConfig = createCloudInitVendorConfig(
    options,
  );

  const userConfig: CloudInitUserConfig = {};

  const networkConfig: CloudInitNetworkConfig = createCloudInitNetworkConfig(
    options,
  );

  const nicType = calculateNicType(options.vlan);
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
  await run(["incus", "start", options.name]);
  await untilStatusCode(
    INCUS_CONTAINER_STATUS_CODES.Stopped,
    options.name,
    {
      pending: `Running cloud-init...`,
      done: `Finished cloud-init.`,
    },
  );
  await untilStatusCode(INCUS_CONTAINER_STATUS_CODES.Stopped, options.name);
  await run(["incus", "start", options.name]);
  await untilStatusCode(INCUS_CONTAINER_STATUS_CODES.Running, options.name);

  await run([
    "incus",
    "file",
    "push",
    import.meta.dirname + "/../../../template/" +
    toTemplateName(options.imageUri),
    `${options.name}/usr/local/bin/`,
    "--mode",
    "0755",
  ]);

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

  await run([
    "incus",
    "exec",
    options.name,
    "--",
    toTemplateName(options.imageUri),
  ]);

  await run(["incus", "stop", options.name]);
  await untilStatusCode(INCUS_CONTAINER_STATUS_CODES.Stopped, options.name);

  return [{
    name: options.name,
    description: options.description,
    image: options.imageUri,
    running: false,
    profiles: [],
    config: {},
    devices: [],
  }, hostVlans];
}
