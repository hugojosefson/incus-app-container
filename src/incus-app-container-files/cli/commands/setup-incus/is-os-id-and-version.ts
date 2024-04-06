export async function isOsIdAndVersion(
  osId: string,
  osVersion: string,
): Promise<boolean> {
  const osRelease = await Deno.readTextFile("/etc/os-release");
  return osRelease.includes(`ID=${osId}`) &&
    osRelease.includes(`VERSION_ID="${osVersion}"`);
}
