import { run } from "@hugojosefson/run-simple";
import { getNotYetInstalledPackages } from "./get-not-yet-installed-packages.ts";

export async function ensureInstalledPackages(
  packages: string[],
): Promise<void> {
  const notYetInstalled = await getNotYetInstalledPackages(packages);
  if (notYetInstalled.length > 0) {
    await run(["apt-get", "install", "-y", ...notYetInstalled]);
  }
}
