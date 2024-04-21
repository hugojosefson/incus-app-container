import { basename, swallow } from "../../../deps.ts";
import { readFromUrl } from "../../../read-from-url.ts";
import { StorageDataset } from "../../../truenas/storage-dataset.ts";
import { SetupJailmakerOptions } from "./setup-jailmaker-options.ts";

const SCRIPT_URL =
  "https://raw.githubusercontent.com/Jip-Hop/jailmaker/develop/jlmkr.py";
const SCRIPT_FILENAME = basename(SCRIPT_URL);

export async function ensureJailmakerScript(
  options: SetupJailmakerOptions,
  dataset: StorageDataset,
): Promise<string> {
  const latestScriptContentsPromise = readFromUrl(SCRIPT_URL);

  const scriptFullPath = `${dataset.mountpoint}/${SCRIPT_FILENAME}`;
  const existingScriptContents: undefined | string = await Deno.readTextFile(
    scriptFullPath,
  ).catch(
    swallow(Deno.errors.NotFound),
  );

  const latestScriptContents = await latestScriptContentsPromise;
  if (existingScriptContents === latestScriptContents) {
    console.error(
      `Jailmaker script is already up to date at ${scriptFullPath}.`,
    );
    await chmodIfNecessary(options, scriptFullPath);
    return scriptFullPath;
  }

  if (options.dryRun) {
    console.error(`Would update jailmaker script at ${scriptFullPath}.`);
  } else {
    console.error(`Updating jailmaker script at ${scriptFullPath}.`);
    await Deno.writeTextFile(scriptFullPath, latestScriptContents);
  }

  await chmodIfNecessary(options, scriptFullPath);
  return scriptFullPath;
}

async function chmodIfNecessary(
  options: SetupJailmakerOptions,
  scriptFullPath: string,
) {
  const { mode } = await Deno.lstat(scriptFullPath);
  const isExecutable = mode == null ? false : Boolean(mode & 0o111);
  if (!isExecutable) {
    if (options.dryRun) {
      console.error(
        `Would make jailmaker script at ${scriptFullPath} executable.`,
      );
      return;
    }
    console.error(`Making jailmaker script at ${scriptFullPath} executable.`);
    await Deno.chmod(scriptFullPath, 0o755);
  }
}
