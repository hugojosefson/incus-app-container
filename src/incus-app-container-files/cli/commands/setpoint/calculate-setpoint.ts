import { AbsolutePath } from "../../absolute-path.ts";
import { CreateAppContainerOptions } from "../create-app-container/options.ts";
import { Setpoint } from "./setpoint.ts";
import {
  DEFAULT_LOAD_CONFIG_FILES_OPTIONS,
  fromAsyncIterator,
  loadConfig,
} from "../../../deps.ts";
import { findAppDirs } from "./find-app-dirs.ts";
import { calculateAppDirSegments } from "./calculate-app-dir-segments.ts";

/**
 *      Builds a list of apps, with {@link findAppDirs}.
 *     Populates each app in the list, with config loaded by https://deno.land/x/load_config_files. { commonNames: ["index", "common", "incus-app-container"]}
 *     Returns a setpoint, which is a list of apps, with their configs.
 * @param appsDir
 */
export async function calculateSetpoint<AppsDir extends AbsolutePath>(
  appsDir: AppsDir,
): Promise<Setpoint<AppsDir>> {
  const appDirs: AsyncIterableIterator<AbsolutePath> = findAppDirs(appsDir);
  const apps: Setpoint<AppsDir>["apps"] = Object.fromEntries(
    await Promise.all((await fromAsyncIterator(appDirs)).map(async (appDir) => [
      appDir,
      await loadConfig(
        new URL(`file://${appsDir}`),
        calculateAppDirSegments(appsDir)(appDir),
        {
          commonNames: [
            ...DEFAULT_LOAD_CONFIG_FILES_OPTIONS.commonNames,
            "incus-app-container",
          ],
          configTransformers: [
            (config) => config as CreateAppContainerOptions<AppsDir>,
          ],
        },
      ) as CreateAppContainerOptions<AppsDir>,
    ])),
  );
  return {
    appsDir,
    apps,
  };
}
