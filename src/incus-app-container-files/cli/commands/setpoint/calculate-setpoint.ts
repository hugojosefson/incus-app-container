import {
  Address,
  Cidr,
  createAddress,
  DEFAULT_LOAD_CONFIG_FILES_OPTIONS,
  fromAsyncIterator,
  loadConfig,
} from "../../../deps.ts";
import { MultiArgument } from "../../../multi-argument.ts";
import { AbsolutePath } from "../../things/absolute-path.ts";
import { BridgeName } from "../../things/bridge-name.ts";
import { firstIp } from "../../things/cidr.ts";
import { getIdmapBaseFor, IDMAP_BASE_SIZE } from "../../idmap.ts";
import { Size } from "../../things/size.ts";
import { resolveSshKeys, SshKey, SshKeyRaw } from "../../things/ssh-key.ts";
import {
  SupportedImage,
  SupportedImageUri,
  toSupportedImageUri,
} from "../../things/supported-image.ts";
import { Vlan } from "../../things/vlan.ts";
import { calculateAppDirSegments } from "./calculate-app-dir-segments.ts";
import {
  calculateTofuIncusInstance,
  HostVlan,
} from "./calculate-tofu-incus-instance.ts";
import { findAppDirs } from "./find-app-dirs.ts";
import { Setpoint } from "./setpoint.ts";
import { TofuIncusInstance } from "./tofu-incus-instance.ts";

const COMMON_NAMES = [
  ...DEFAULT_LOAD_CONFIG_FILES_OPTIONS.commonNames,
  "incus-app-container",
];

export type CreateAppContainerInputOptions<AppsDir extends AbsolutePath> = {
  name: string;
  description?: string;
  ip: string;
  gateway?: string;
  nameserver?: string;
  sshKey: MultiArgument<SshKey>;
  sshServer: boolean;
  running: boolean;
  diskSize: Size;
  appsDir: AppsDir;
  appDir: `${AppsDir}/${string}`;
  vlan?: Vlan;
  bridgeName: BridgeName;
  image: SupportedImage;
};
export type CreateAppContainerOptions<
  AppsDir extends AbsolutePath,
  Name extends string,
> =
  & (
    | {
      ip: "dhcp";
      nameserver?: Address;
    }
    | {
      ip: Cidr;
      gateway: Address;
      nameserver: Address;
    }
  )
  & {
    name: Name;
    description?: string;
    sshKey: SshKeyRaw[];
    running: boolean;
    diskSize: Size;
    appsDir: AppsDir;
    idmapBase: number;
    idmapSize: number;
    vlan?: Vlan;
    bridgeName: BridgeName;
    imageUri: SupportedImageUri<SupportedImage>;
    sshServer?: boolean;
  };

export async function resolveCreateAppContainerOptions<
  AppsDir extends AbsolutePath,
  Name extends string,
  R extends CreateAppContainerOptions<AppsDir, Name> =
    CreateAppContainerOptions<
      AppsDir,
      Name
    >,
>(
  input: CreateAppContainerInputOptions<AppsDir>,
): Promise<R> {
  const commonOptions: Partial<R> = {
    name: input.name,
    description: input.description,
    sshKey: await resolveSshKeys(input.sshKey),
    running: input.running,
    diskSize: input.diskSize,
    appsDir: input.appsDir,
    idmapBase: await getIdmapBaseFor(input.appsDir, input.appDir),
    idmapSize: IDMAP_BASE_SIZE,
    vlan: input.vlan,
    bridgeName: input.bridgeName,
    imageUri: toSupportedImageUri(input.image),
    sshServer: input.sshServer,
  } as Partial<R>;

  if (input.ip === "dhcp") {
    return {
      ...commonOptions,
      ip: "dhcp",
      ...(input.nameserver
        ? { nameserver: createAddress(input.nameserver) }
        : {}),
    } as R;
  }

  const cidr = new Cidr(input.ip);
  const gateway = input.gateway ? createAddress(input.gateway) : firstIp(cidr);
  const nameserver = input.nameserver
    ? createAddress(input.nameserver)
    : firstIp(cidr);

  return {
    ...commonOptions,
    ip: cidr,
    gateway,
    nameserver,
  } as R;
}

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
  const appsWithVlans: Record<string, [
    TofuIncusInstance,
    HostVlan<BridgeName, Vlan>[],
  ]> = Object.fromEntries(
    await Promise.all((await fromAsyncIterator(appDirs))
      .map(async (appDir) => {
        const appsDirUrl = new URL(`file://${appsDir}`);
        const pathSegments = calculateAppDirSegments(appsDir)(appDir);
        const name = pathSegments.join("/");
        const config = await loadConfig(
          appsDirUrl,
          pathSegments,
          {
            commonNames: COMMON_NAMES,
            configTransformers: [
              (config) => ({
                name,
                appDir: [appsDir, ...pathSegments].join("/"),
                ...config,
              }),
            ],
          },
        ) as CreateAppContainerInputOptions<AppsDir>;

        const createAppContainerOptions: CreateAppContainerOptions<
          AppsDir,
          Name
        > = await resolveCreateAppContainerOptions(config);

        const [tofuIncusInstance, hostVlans]: [
          TofuIncusInstance,
          HostVlan<BridgeName, Vlan>[],
        ] = calculateTofuIncusInstance(createAppContainerOptions);
        return [
          name,
          [tofuIncusInstance, hostVlans],
        ];
      })),
  );

  const apps = Object.fromEntries(
    Object.entries(appsWithVlans).map((
      [name, [tofuIncusInstance, _hostVlans]]: [
        string,
        [TofuIncusInstance, unknown],
      ],
    ) => [name, tofuIncusInstance] as [string, TofuIncusInstance]),
  );

  const hostVlans: HostVlan<BridgeName, Vlan>[] = Object.values(appsWithVlans)
    .flatMap((
      [_instance, hostVlans]: [unknown, HostVlan<BridgeName, Vlan>[]],
    ) => hostVlans);

  return {
    appsDir,
    apps,
    hostVlans,
  };
}
