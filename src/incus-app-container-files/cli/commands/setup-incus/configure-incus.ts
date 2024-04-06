import { run } from "../../../deps.ts";
import { getIncusPreseed } from "./get-incus-preseed.ts";

export async function configureIncus(
  dryRun: boolean,
  poolDisk: string,
  bridgeName: string,
): Promise<void> {
  const preseed = await getIncusPreseed(poolDisk, bridgeName);
  if (dryRun) {
    console.log(preseed);
    return;
  }
  await run(["incus", "admin", "init", "--preseed", "--verbose"], {
    stdin: preseed,
  });
}
