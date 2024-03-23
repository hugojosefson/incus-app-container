import { AbsolutePath } from "./absolute-path.ts";
import { Address, Cidr, createAddress } from "./deps.ts";
import { getNextIdmapBaseFor, IDMAP_BASE_SIZE } from "./idmap.ts";
import { MultiArgument } from "./multi-argument.ts";
import { Size } from "./size.ts";
import { resolveSshKeys, SshKey, SshKeyRaw } from "./ssh-key.ts";

export type CreateAppContainerInputOptions<AppsDir extends AbsolutePath> = {
  ip: string;
  gateway?: string;
  nameserver?: string;
  sshKey: MultiArgument<SshKey>;
  start: boolean;
  diskSize?: Size;
  appsDir: AppsDir;
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
  };

const DEFAULT_DISK_SIZE: Size = "10GiB";

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
      diskSize: input.diskSize ?? DEFAULT_DISK_SIZE,
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
    diskSize: input.diskSize ?? DEFAULT_DISK_SIZE,
    appsDir,
    idmapBase: await getNextIdmapBaseFor(appsDir),
    idmapSize: IDMAP_BASE_SIZE,
  } as CreateAppContainerOptions<AppsDir>;
}

export function firstIp(cidr: Cidr): Address {
  const ip: undefined | string = cidr.toArray({ from: 1, limit: 1 }).at(0);
  if (!ip) {
    throw new Error(`Could not get first IP from ${cidr}`);
  }
  return createAddress(ip);
}
