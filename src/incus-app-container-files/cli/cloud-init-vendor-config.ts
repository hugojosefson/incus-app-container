import { AbsolutePath } from "./absolute-path.ts";
import { CreateAppContainerOptions } from "./commands/create-app-container/options.ts";
import { SshKeyRaw } from "./ssh-key.ts";

/**
 * The parts of
 * [cloud-init modules](https://cloudinit.readthedocs.io/en/latest/reference/modules.html)
 * that we care about for the vendor config.
 */
export type CloudInitVendorConfig = {
  disable_root: boolean;
  ssh_authorized_keys: SshKeyRaw[];
  power_state: { mode: string; timeout: number };
};

export function createCloudInitVendorConfig<
  AppsDir extends AbsolutePath,
  Name extends string,
>(
  options: CreateAppContainerOptions<AppsDir, Name>,
): CloudInitVendorConfig {
  return {
    disable_root: false,
    ssh_authorized_keys: options.sshKey,
    ...(options.ip === "dhcp" ? {} : {
      manage_resolv_conf: true,
      resolv_conf: {
        nameservers: [options.nameserver.address],
      },
    }),
    power_state: {
      mode: "poweroff",
      timeout: 30,
    },
  };
}
