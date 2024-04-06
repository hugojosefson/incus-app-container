import { configureIncus } from "./configure-incus.ts";
import { convertToBridge } from "./convert-to-bridge.ts";
import { ensurePreconditions } from "./ensure-preconditions.ts";
import { installIncus } from "./install-incus.ts";

export type SetupIncusOptions = {
  dryRun: boolean;
  poolDisk: string;
  bridgeName: string;
  bridgeCidr: string;
};

export async function setupIncus(options: SetupIncusOptions): Promise<void> {
  if (!options.dryRun) {
    await ensurePreconditions(options.poolDisk);
    await convertToBridge(options.bridgeName, options.bridgeCidr);
    await installIncus();
  }
  await configureIncus(options.dryRun, options.poolDisk, options.bridgeName);
}
