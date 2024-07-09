import { isNumber, outdent } from "../../deps.ts";
import { enforceType } from "../../type-guard.ts";
import { BridgeName } from "./bridge-name.ts";

import { calculateNicParentName, NicParentName } from "./nic.ts";
import { NO_DEFAULT_VALUE } from "./no-default-value.ts";

const VLAN_MIN = 1;
const VLAN_MAX = 4094;

export function isVlan(vlan: unknown): vlan is Vlan {
  return isNumber(vlan) && !isNaN(vlan) && vlan >= VLAN_MIN && vlan <= VLAN_MAX;
}

export type Vlan = number;

export const enforceVlan = await enforceType(
  isVlan,
  `a number from ${VLAN_MIN} to ${VLAN_MAX}`,
);

export const castAndEnforceVlan = (
  vlanString?: unknown,
): Vlan => {
  if (typeof vlanString === "symbol" && vlanString === NO_DEFAULT_VALUE) {
    return undefined!;
  }
  const vlan = parseInt(`${vlanString}`, 10);
  return enforceVlan(vlan);
};

export type VlanEtcNetworkInterfacesDContent<
  BN extends BridgeName,
  V extends undefined | Vlan,
> = `auto ${NicParentName<BN, V>}
iface ${NicParentName<BN, V>} inet manual
  vlan-raw-device ${BN}
`;

export function createVlanEtcNetworkInterfacesD<
  BN extends BridgeName,
  V extends undefined | Vlan,
>(
  bridgeName: BN,
  vlan: V,
): VlanEtcNetworkInterfacesDContent<BN, V> {
  const nicParentName: NicParentName<BN, V> = calculateNicParentName(
    bridgeName,
    vlan,
  );
  return (outdent`
    auto ${nicParentName}
    iface ${nicParentName} inet manual
      vlan-raw-device ${bridgeName}
  ` + "\n") as VlanEtcNetworkInterfacesDContent<BN, V>;
}
