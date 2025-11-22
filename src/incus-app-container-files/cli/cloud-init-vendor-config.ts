import { AbsolutePath } from "./things/absolute-path.ts";

import { CreateAppContainerOptions } from "./commands/setpoint/calculate-setpoint.ts";

/**
 * The parts of
 * [cloud-init modules](https://cloudinit.readthedocs.io/en/latest/reference/modules.html)
 * that we care about for the vendor config.
 */
export type CloudInitVendorConfig = {
  disable_root?: boolean;
  power_state?: { mode: string; timeout: number };
  package_reboot_if_required?: boolean;
  package_update?: boolean;
  package_upgrade?: boolean;
  packages?: (
    | string
    | [string, string]
    | { apt: string[] }
    | { snap: string[][] }
  )[];
  run_cmd?: (string | string[])[];
  bootcmd?: (string | string[])[];
  byobu_by_default?:
    | "enable-system"
    | "enable-user"
    | "disable-system"
    | "disable-user"
    | "enable"
    | "disable"
    | "user"
    | "system";
};

export function createCloudInitVendorConfig<
  AppsDir extends AbsolutePath,
  Name extends string,
>(
  options: CreateAppContainerOptions<AppsDir, Name>,
): CloudInitVendorConfig {
  return {
    disable_root: false,
    ...(
      options?.nameserver?.address
        ? {
          manage_resolv_conf: true,
          resolv_conf: {
            nameservers: [options.nameserver.address],
          },
        }
        : {}
    ),
    bootcmd: [
      "systemctl daemon-reload",
      "systemctl enable on-first-boot",
    ],
    power_state: { mode: "reboot", timeout: 30 },
  };
}
