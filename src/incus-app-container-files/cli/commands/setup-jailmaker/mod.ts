import { StorageDataset } from "../../../truenas/storage-dataset.ts";
import { ensureJailmakerDataset } from "./ensure-jailmaker-dataset.ts";
import { ensureJailmakerInstalledAndStarted } from "./ensure-jailmaker-installed-and-started.ts";
import { ensureJailmakerScript } from "./ensure-jailmaker-script.ts";
import { ensureJailmakerStartupConfigured } from "./ensure-jailmaker-startup-configured.ts";
import { ensurePreconditions } from "./ensure-preconditions.ts";
import { SetupJailmakerOptions } from "./setup-jailmaker-options.ts";

export async function setupJailmaker(
  options: SetupJailmakerOptions,
): Promise<void> {
  await ensurePreconditions();
  const dataset: StorageDataset = await ensureJailmakerDataset(options);
  const scriptPath = await ensureJailmakerScript(options, dataset);
  await ensureJailmakerInstalledAndStarted(options, scriptPath);
  await ensureJailmakerStartupConfigured(options, scriptPath);
  console.log(`Jailmaker setup complete.`);
}
