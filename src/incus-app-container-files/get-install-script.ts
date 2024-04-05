import { dirname } from "https://deno.land/std@0.220.1/path/dirname.ts";
import { readFromUrl } from "./read-from-url.ts";

export async function getInstallScript(baseFilename: string): Promise<string> {
  const url = new URL(
    `template/${baseFilename}-install`,
    import.meta.url,
  );
  try {
    return await readFromUrl(url);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(
        `Could not find install script for ${baseFilename}.
It should be at ${url}.
Only install scripts in ${dirname(url.toString())}/ are supported.`,
      );
    }
    throw e;
  }
}
