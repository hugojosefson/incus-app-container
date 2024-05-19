import { Address, Cidr, createAddress } from "../../../deps.ts";
import { MultiArgument } from "../../../multi-argument.ts";
import { AbsolutePath } from "../../absolute-path.ts";
import { BridgeName } from "../../bridge-name.ts";
import {
  SupportedImage,
  SupportedImageUri,
  toSupportedImageUri,
} from "../../supported-image.ts";
import { type Vlan } from "../../vlan.ts";
import { firstIp } from "../../cidr.ts";
import { getNextIdmapBaseFor, IDMAP_BASE_SIZE } from "../../idmap.ts";
import { Size } from "../../size.ts";
import { resolveSshKeys, SshKey, SshKeyRaw } from "../../ssh-key.ts";

export type CreateAppContainerInputOptions<AppsDir extends AbsolutePath> = {
  name: string;
  description?: string;
  ip: string;
  gateway?: string;
  nameserver?: string;
  sshKey: MultiArgument<SshKey>;
  start: boolean;
  diskSize: Size;
  appsDir: AppsDir;
  vlan?: Vlan;
  bridgeName: BridgeName;
  image: SupportedImage;
};

export type CreateAppContainerOptions<
  AppsDir extends AbsolutePath,
  Name extends string,
> =
  & (
    | { ip: "dhcp" }
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
    start: boolean;
    diskSize: Size;
    appsDir: AppsDir;
    idmapBase: number;
    idmapSize: number;
    vlan?: Vlan;
    bridgeName: BridgeName;
    imageUri: SupportedImageUri<SupportedImage>;
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
    start: input.start,
    diskSize: input.diskSize,
    appsDir: input.appsDir,
    idmapBase: await getNextIdmapBaseFor(input.appsDir),
    idmapSize: IDMAP_BASE_SIZE,
    vlan: input.vlan,
    bridgeName: input.bridgeName,
    imageUri: toSupportedImageUri(input.image),
  } as Partial<R>;

  if (input.ip === "dhcp") {
    return {
      ...commonOptions,
      ip: "dhcp",
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
