import { isNumber } from "../deps.ts";
import { enforceType } from "../type-guard.ts";
import { BridgeName } from "./bridge-name.ts";

import { calculateNicParentName, NicParentName } from "./nic.ts";

const VLAN_MIN = 1;
const VLAN_MAX = 4094;

export function isVlan(vlan: unknown): vlan is Vlan {
  return isNumber(vlan) && !isNaN(vlan) && vlan >= VLAN_MIN && vlan <= VLAN_MAX;
}

export type Vlan = number;

export const enforceVlan = await enforceType(
  isVlan,
  `a number from ${VLAN_MIN} to ${VLAN_MAX}, or nothing for no VLAN`,
);

export const castAndEnforceVlan = (vlanString?: string | number) => {
  if (vlanString === undefined) return undefined;
  if (vlanString === "") return undefined;
  const vlan = isNumber(vlanString) ? vlanString : parseInt(vlanString, 10);
  return enforceVlan(vlan);
};

export function createVlanEtcNetworkInterfacesD<
  BN extends BridgeName,
  V extends undefined | Vlan,
>(
  bridgeName: BN,
  vlan: V,
): string {
  const nicParentName: NicParentName<BN, V> = calculateNicParentName(
    bridgeName,
    vlan,
  );
  return `
auto ${nicParentName}
iface ${nicParentName} inet manual
  vlan-raw-device ${bridgeName}
  `;
}
