import { Address, Cidr, createAddress } from "./deps.ts";
import { MultiArgument } from "./multi-argument.ts";
import { Size } from "./size.ts";
import { resolveSshKeys, SshKey, SshKeyRaw } from "./ssh-key.ts";

export type CreateAppContainerInputOptions = {
  ip: string;
  gateway?: string;
  nameserver?: string;
  sshKey: MultiArgument<SshKey>;
  start: boolean;
  diskSize?: Size;
};

export type CreateAppContainerOptions =
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
  };

const DEFAULT_DISK_SIZE: Size = "10GiB";

export async function resolveCreateAppContainerOptions(
  input: CreateAppContainerInputOptions,
): Promise<CreateAppContainerOptions> {
  const sshKey: SshKeyRaw[] = await resolveSshKeys(input.sshKey);

  if (input.ip === "dhcp") {
    return {
      ip: "dhcp",
      sshKey,
      start: input.start,
      diskSize: input.diskSize ?? DEFAULT_DISK_SIZE,
    } as CreateAppContainerOptions;
  }

  const cidr = new Cidr(input.ip);
  const gateway = input.gateway ? createAddress(input.gateway) : firstIp(cidr);
  const nameserver = input.nameserver
    ? createAddress(input.nameserver)
    : firstIp(cidr);

  return {
    ip: cidr,
    gateway,
    nameserver,
    sshKey,
    start: input.start,
    diskSize: input.diskSize ?? DEFAULT_DISK_SIZE,
  } as CreateAppContainerOptions;
}

export function firstIp(cidr: Cidr): Address {
  const ip: undefined | string = cidr.toArray({ from: 1, limit: 1 }).at(0);
  if (!ip) {
    throw new Error(`Could not get first IP from ${cidr}`);
  }
  return createAddress(ip);
}
