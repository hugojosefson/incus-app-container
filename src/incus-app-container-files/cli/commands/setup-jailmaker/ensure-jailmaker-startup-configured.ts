import {
  createInitShutdownScript,
  getInitShutdownScripts,
  InitShutdownScript,
  isEqualTo,
  updateInitShutdownScript,
} from "../../../truenas/init-shutdown-script.ts";
import { WithId } from "../../../truenas/with-id.ts";
import { SetupJailmakerOptions } from "./setup-jailmaker-options.ts";

export async function ensureJailmakerStartupConfigured(
  options: SetupJailmakerOptions,
  scriptPath: string,
) {
  const required = {
    type: "COMMAND",
    command: `${scriptPath} startup`,
    when: "POSTINIT",
  } as Pick<InitShutdownScript, "type" | "command" | "when">;
  const desired = {
    enabled: true,
    comment: "Installs and starts Jailmaker.",
  } as Pick<InitShutdownScript, "enabled" | "comment">;
  const scripts: WithId<InitShutdownScript>[] = await getInitShutdownScripts();
  const existing: undefined | WithId<InitShutdownScript> = scripts.find(
    isEqualTo(required as Partial<InitShutdownScript>),
  );

  if (!existing) {
    if (options.dryRun) {
      console.log(`Would create InitShutdownScript for Jailmaker.`);
    } else {
      console.log(`Creating InitShutdownScript for Jailmaker.`);
      await createInitShutdownScript({
        ...required,
        ...desired,
      });
    }
    return;
  }

  if (isEqualTo(desired)(existing)) {
    console.log(`InitShutdownScript for Jailmaker is already configured.`);
    return;
  }

  if (options.dryRun) {
    console.log(`Would update InitShutdownScript for Jailmaker.`);
  } else {
    console.log(`Updating InitShutdownScript for Jailmaker.`);
    await updateInitShutdownScript(existing.id, desired);
  }
}
