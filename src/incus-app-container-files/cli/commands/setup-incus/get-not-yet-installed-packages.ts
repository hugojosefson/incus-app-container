import { isInstalledPackage } from "./is-installed-package.ts";

export async function getNotYetInstalledPackages(
  desired: string[],
): Promise<string[]> {
  const notYetInstalled: string[] = [];
  for (const packageName of desired) {
    if (!(await isInstalledPackage(packageName))) {
      notYetInstalled.push(packageName);
    }
  }
  return notYetInstalled;
}
