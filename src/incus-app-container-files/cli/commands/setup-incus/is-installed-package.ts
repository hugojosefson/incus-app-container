import { run } from "../../../deps.ts";

export async function isInstalledPackage(
  packageName: string,
): Promise<boolean> {
  try {
    const dpkgLOutput = await run([
      "dpkg-query",
      "--show",
      "--showformat=${Status}",
      packageName,
    ]);
    return dpkgLOutput === "install ok installed";
  } catch {
    return false;
  }
}

if (import.meta.main) {
  console.log(await isInstalledPackage(Deno.args[0]));
}
