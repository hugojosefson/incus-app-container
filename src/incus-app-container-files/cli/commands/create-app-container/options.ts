import { AbsolutePath } from "../../absolute-path.ts";
import { BridgeName } from "../../bridge-name.ts";
import { type Vlan } from "../../vlan.ts";
import { firstIp } from "./cidr.ts";
import { Address, Cidr, createAddress } from "../../../deps.ts";
import { getNextIdmapBaseFor, IDMAP_BASE_SIZE } from "./idmap.ts";
import { MultiArgument } from "../../../multi-argument.ts";
import { Size } from "./size.ts";
import { resolveSshKeys, SshKey, SshKeyRaw } from "./ssh-key.ts";

export type CreateAppContainerInputOptions<AppsDir extends AbsolutePath> = {
  ip: string;
  gateway?: string;
  nameserver?: string;
  sshKey: MultiArgument<SshKey>;
  start: boolean;
  diskSize: Size;
  appsDir: AppsDir;
  vlan?: Vlan;
  bridgeName: BridgeName;
};

export type CreateAppContainerOptions<AppsDir extends AbsolutePath> =
  & (
    | { ip: "dhcp" }
    | {
      ip: Cidr;
      gateway: Address;
      nameserver: Address;
    }
  )
  & {
    sshKey: SshKeyRaw[];
    start: boolean;
    diskSize: Size;
    appsDir: AppsDir;
    idmapBase: number;
    idmapSize: number;
    vlan?: Vlan;
    bridgeName: BridgeName;
  };

export async function resolveCreateAppContainerOptions<
  AppsDir extends AbsolutePath,
>(
  input: CreateAppContainerInputOptions<AppsDir>,
): Promise<CreateAppContainerOptions<AppsDir>> {
  const sshKey: SshKeyRaw[] = await resolveSshKeys(input.sshKey);

  if (input.ip === "dhcp") {
    return {
      ip: "dhcp",
      sshKey,
      start: input.start,
      diskSize: input.diskSize,
      appsDir: input.appsDir,
      idmapBase: await getNextIdmapBaseFor(input.appsDir),
      idmapSize: IDMAP_BASE_SIZE,
    } as CreateAppContainerOptions<AppsDir>;
  }

  const cidr = new Cidr(input.ip);
  const gateway = input.gateway ? createAddress(input.gateway) : firstIp(cidr);
  const nameserver = input.nameserver
    ? createAddress(input.nameserver)
    : firstIp(cidr);
  const appsDir = input.appsDir;

  return {
    ip: cidr,
    gateway,
    nameserver,
    sshKey,
    start: input.start,
    diskSize: input.diskSize,
    appsDir,
    idmapBase: await getNextIdmapBaseFor(appsDir),
    idmapSize: IDMAP_BASE_SIZE,
    vlan: input.vlan,
    bridgeName: input.bridgeName,
  } as CreateAppContainerOptions<AppsDir>;
}
