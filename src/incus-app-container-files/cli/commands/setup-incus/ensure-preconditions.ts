import { die } from "../../die.ts";
import { ensureInstalledPackages } from "./ensure-installed-packages.ts";
import { getIncusPackages } from "./get-incus-packages.ts";
import { isBlockDeviceAlreadyWiped } from "./is-block-device-already-wiped.ts";
import { isOsIdAndVersion } from "./is-os-id-and-version.ts";
import { isRoot } from "./is-root.ts";

export async function ensurePreconditions(poolDisk: string): Promise<void> {
  if (!isRoot()) {
    die("This script must be run as root");
  }

  if (Deno.build.os !== "linux") {
    die("This script must be run on Linux");
  }

  if (!await isOsIdAndVersion("debian", "12")) {
    die("This script must be run on Debian 12");
  }

  // Check that the block device has been wiped
  if (!await isBlockDeviceAlreadyWiped(poolDisk)) {
    die(`Block device ${poolDisk} must be wiped before running this script.

Try wipe it now:
wipefs --force --all ${poolDisk} && reboot

If you *really* want to start over:
rm -rf ~/.config/incus && apt purge -y --purge ${await getIncusPackages()} && wipefs --force --all ${poolDisk} && reboot

Then try running this script again, after reboot :)
`);
  }

  await ensureInstalledPackages([
    "curl",
    "gnupg",
    "ipcalc",
    "bridge-utils",
    "openvswitch-switch",
    "lvm2",
    "thin-provisioning-tools",
    "wget",
  ]);
}
