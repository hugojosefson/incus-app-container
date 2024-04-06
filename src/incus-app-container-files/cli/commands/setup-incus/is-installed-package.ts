import { run } from "../../../deps.ts";

export async function isInstalledPackage(
  packageName: string,
): Promise<boolean> {
  try {
    await run(["dpkg", "-l", packageName]);
    return true;
  } catch {
    return false;
  }
}
