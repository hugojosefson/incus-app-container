import { isNumber } from "https://deno.land/x/fns@1.1.1/number/is-number.ts";
import { enforceType } from "../type-guard.ts";

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
