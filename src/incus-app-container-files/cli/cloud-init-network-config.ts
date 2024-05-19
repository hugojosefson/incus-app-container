import { Address, Cidr } from "../deps.ts";
import { AbsolutePath } from "./absolute-path.ts";
import { CreateAppContainerOptions } from "./commands/create-app-container/options.ts";

/**
 * The parts of
 * [cloud-init network config](https://cloudinit.readthedocs.io/en/latest/reference/network-config-format-v2.html)
 * that we care about.
 */
export type CloudInitNetworkConfig = {
  network: {
    version: 2;
    ethernets: {
      eth0:
        | {
          dhcp4: true;
          dhcp6: false;
        }
        | {
          dhcp4: false;
          dhcp6: false;
          routes: { to: "0.0.0.0/0"; via: Address }[];
          addresses: Cidr[];
          nameservers: { addresses: Address[] };
        };
    };
  };
};

export function createCloudInitNetworkConfig<
  AppsDir extends AbsolutePath,
  Name extends string,
>(
  options: CreateAppContainerOptions<AppsDir, Name>,
): CloudInitNetworkConfig {
  return {
    network: {
      version: 2,
      ethernets: {
        eth0: options.ip === "dhcp"
          ? {
            dhcp4: true,
            dhcp6: false,
          }
          : {
            dhcp4: false,
            dhcp6: false,
            addresses: [options.ip.cidr],
            routes: [{ to: "0.0.0.0/0", via: options.gateway.address }],
            nameservers: { addresses: [options.nameserver.address] },
          },
      },
    },
  } as CloudInitNetworkConfig;
}
