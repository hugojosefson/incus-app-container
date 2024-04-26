import { run } from "https://deno.land/x/run_simple@2.3.0/src/run.ts";
import { SetupJailmakerOptions } from "./setup-jailmaker-options.ts";

/**
 * Runs the jailmaker script with the argument "startup", to ensure it's installed and started.
 * @param options
 * @param scriptPath
 */
export async function ensureJailmakerInstalledAndStarted(
  options: SetupJailmakerOptions,
  scriptPath: string,
) {
  if (options.dryRun) {
    console.error(`Would run: ${scriptPath} startup.`);
    return;
  }
  console.error(`Running: ${scriptPath} startup.`);
  await run([scriptPath, "startup"]);
}
