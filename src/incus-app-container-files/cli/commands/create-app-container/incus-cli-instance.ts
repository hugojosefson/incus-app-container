import { stringifyYaml } from "../../../deps.ts";
import { AbsolutePath } from "../../absolute-path.ts";
import { BridgeName } from "../../bridge-name.ts";
import { CloudInitNetworkConfig } from "../../cloud-init-network-config.ts";
import { CloudInitUserConfig } from "../../cloud-init-user-config.ts";
import { CloudInitVendorConfig } from "../../cloud-init-vendor-config.ts";
import { NicParentName, NicType } from "../../nic.ts";
import { Vlan } from "../../vlan.ts";
import { CreateAppContainerOptions } from "./options.ts";

/**
 * A complete incus container, to pass to the incus CLI.
 */
export type IncusCliInstance = {
  description: string;
  config: {
    "cloud-init.network-config": string;
    "cloud-init.user-data": string;
    "cloud-init.vendor-data": string;
    "security.idmap.base": number;
    "security.idmap.isolated": boolean;
    "security.idmap.size": number;
    "security.nesting": boolean;
  };
  devices: Record<"root" | "eth0", IncusCliDevice>;
};

export type IncusCliDevice =
  | {
    type: "disk";
    path: AbsolutePath;
    pool: string;
  }
  | {
    type: "nic";
    name: string;
    nictype: NicType;
    parent: string;
  };

export function createIncusContainerConfig<
  AppsDir extends AbsolutePath,
  Name extends string,
>(
  nicType: NicType,
  nicParentName: NicParentName<BridgeName, undefined | Vlan>,
  options: CreateAppContainerOptions<AppsDir, Name>,
  userConfig: CloudInitUserConfig,
  vendorConfig: CloudInitVendorConfig,
  networkConfig: CloudInitNetworkConfig,
): IncusCliInstance {
  return {
    description: "By incus-app-container",
    devices: {
      eth0: {
        name: "eth0",
        type: "nic",
        nictype: nicType,
        parent: nicParentName,
      },
      root: {
        type: "disk",
        path: "/",
        pool: "default",
      },
    },
    config: {
      "security.idmap.isolated": true,
      "security.idmap.base": options.idmapBase,
      "security.idmap.size": options.idmapSize,
      "security.nesting": true,
      "cloud-init.user-data": "#cloud-config\n" + stringifyYaml(userConfig),
      "cloud-init.vendor-data": "#cloud-config\n" +
        stringifyYaml(vendorConfig),
      "cloud-init.network-config": stringifyYaml(networkConfig),
    },
  };
}
