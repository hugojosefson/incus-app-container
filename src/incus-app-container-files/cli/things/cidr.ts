import IPCIDR from "ip-cidr";

export type Address = IPCIDR.Address;
export type Cidr = IPCIDR;
const { createAddress } = IPCIDR;
export { createAddress };

export function firstIp(cidr: Cidr): Address {
  const ip: undefined | string = cidr.toArray({ from: 1, limit: 1 }).at(0);
  if (!ip) {
    throw new Error(`Could not get first IP from ${cidr}`);
  }
  return createAddress(ip);
}
