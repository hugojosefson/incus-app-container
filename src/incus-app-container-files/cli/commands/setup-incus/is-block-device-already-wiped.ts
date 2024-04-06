import { run } from "../../../deps.ts";
import { die } from "./die.ts";

export async function isBlockDeviceAlreadyWiped(
  poolDisk: string,
): Promise<boolean> {
  try {
    const wipefsOutput = await run(["wipefs", "--no-act", "--all", poolDisk]);
    return !wipefsOutput.includes(poolDisk);
  } catch (error) {
    die(`wipefs failed with exit code ${error.output.code}.`);
  }
}
