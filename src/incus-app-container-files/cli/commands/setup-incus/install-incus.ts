import { addZabblyRepo } from "./add-zabbly-repo.ts";
import { ensureInstalledPackages } from "./ensure-installed-packages.ts";

/**
 * Installs incus and its UI.
 */
export async function installIncus(): Promise<void> {
  await addZabblyRepo();
  await ensureInstalledPackages(
    ["incus", "incus-ui-canonical"],
  );
}
