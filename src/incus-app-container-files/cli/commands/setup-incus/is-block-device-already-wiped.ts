import { run } from "@hugojosefson/run-simple";
import { die } from "../../die.ts";

export async function isBlockDeviceAlreadyWiped(
  poolDisk: string,
): Promise<boolean> {
  try {
    const wipefsOutput = await run(["wipefs", "--no-act", "--all", poolDisk]);
    return !wipefsOutput.includes(poolDisk);
  } catch (error: unknown) {
    const err = error as { output: { code: number } };
    die(`wipefs failed with exit code ${err.output.code}.`);
  }
}
