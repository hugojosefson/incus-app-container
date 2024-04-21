import { run } from "../../../deps.ts";

/**
 * Calculates the minimum IP address in the given CIDR.
 * @param cidr The CIDR to calculate the minimum IP address for.
 */
export async function calculateCidrMin(
  cidr: string,
): Promise<string | undefined> {
  const output = await run(["ipcalc", "--nocolor", "--nobinary", cidr]);
  return output.split("\n").find((line) => line.startsWith("HostMin:"))?.split(
    /\s+/,
    2,
  )[1];
}
