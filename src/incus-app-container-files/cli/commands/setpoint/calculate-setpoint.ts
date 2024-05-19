import { AbsolutePath } from "../../absolute-path.ts";
import { CreateAppContainerOptions } from "../create-app-container/options.ts";
import {
  calculateTofuIncusInstance,
  HostVlan,
} from "./calculate-tofu-incus-instance.ts";
import { Setpoint } from "./setpoint.ts";
import {
  basename,
  DEFAULT_LOAD_CONFIG_FILES_OPTIONS,
  fromAsyncIterator,
  loadConfig,
} from "../../../deps.ts";
import { findAppDirs } from "./find-app-dirs.ts";
import { calculateAppDirSegments } from "./calculate-app-dir-segments.ts";
import { TofuIncusInstance } from "./tofu-incus-instance.ts";
import { BridgeName } from "../../bridge-name.ts";
import { Vlan } from "../../vlan.ts";

const COMMON_NAMES = [
  ...DEFAULT_LOAD_CONFIG_FILES_OPTIONS.commonNames,
  "incus-app-container",
];

/**
 *      Builds a list of apps, with {@link findAppDirs}.
 *     Populates each app in the list, with config loaded by https://deno.land/x/load_config_files. { COMMON_NAMES: ["index", "common", "incus-app-container"]}
 *     Returns a setpoint, which is a list of apps, with their configs.
 * @param appsDir
 */
export async function calculateSetpoint<
  AppsDir extends AbsolutePath,
  Name extends string,
>(
  appsDir: AppsDir,
): Promise<Setpoint<AppsDir>> {
  const appDirs: AsyncIterableIterator<AbsolutePath> = findAppDirs(appsDir);
  const apps: Setpoint<AppsDir>["apps"] = Object.fromEntries(
    await Promise.all((await fromAsyncIterator(appDirs))
      .map(async (appDir) => {
        const appsDirUrl = new URL(`file://${appsDir}`);

        const createAppContainerOptions: CreateAppContainerOptions<
          AppsDir,
          Name
        > = await loadConfig(
          appsDirUrl,
          calculateAppDirSegments(appsDir)(appDir),
          {
            commonNames: COMMON_NAMES,
            configTransformers: [
              (config) => ({
                name: basename(appDir),
                ...config,
              }),
            ],
          },
        ) as CreateAppContainerOptions<AppsDir, Name>;

        const [tofuIncusInstance, _hostVlans]: [
          TofuIncusInstance,
          HostVlan<BridgeName, Vlan>[],
        ] = await calculateTofuIncusInstance(
          createAppContainerOptions,
        );
        return [
          appDir,
          tofuIncusInstance,
        ];
      })),
  );
  return {
    appsDir,
    apps,
  };
}
