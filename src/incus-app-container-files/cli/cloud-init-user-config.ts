import { SshKeyRaw } from "./things/ssh-key.ts";

/**
 * The parts of
 * [cloud-init modules](https://cloudinit.readthedocs.io/en/latest/reference/modules.html)
 * that we care about for the user config.
 */
export type CloudInitUserConfig = {
  ssh_authorized_keys?: SshKeyRaw[];
};
