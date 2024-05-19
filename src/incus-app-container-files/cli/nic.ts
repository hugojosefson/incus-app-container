import { run } from "../deps.ts";
import type { BridgeName } from "./bridge-name.ts";
import type { Vlan } from "./vlan.ts";

async function getNics(): Promise<string[][]> {
  const netconf = await run(["ip", "netconf"]);
  const nics = netconf.split("\n")
    .map((line) => line.split(/\s+/));
  return nics;
}

export async function getNic(name: string): Promise<string[] | undefined> {
  return (await getNics())
    .filter((nic) => nic[0] === "inet")
    .find((nic) => nic[1] === name) ?? undefined;
}

export type ChoiceBasedOnVlan<
  IfNoVlan,
  IfVlan,
  V extends undefined | Vlan = undefined | Vlan,
> = V extends typeof undefined ? IfNoVlan
  : V extends 0 ? IfNoVlan
  : IfVlan;

export type NicParentVlanName<
  BN extends BridgeName,
  V extends Vlan = Vlan,
> = `${BN}.${V}`;

export type NicParentName<
  BN extends BridgeName,
  V extends undefined | Vlan = undefined | Vlan,
> = ChoiceBasedOnVlan<BN, NicParentVlanName<BN, V & Vlan>, V>;

export function calculateNicParentName<
  BN extends BridgeName,
  V extends undefined | Vlan,
  R extends ChoiceBasedOnVlan<BN, NicParentVlanName<BN, V & Vlan>, V>,
>(bridgeName: BN, vlan: V): R {
  if (vlan === undefined) {
    return bridgeName as unknown as R;
  }
  if (vlan === 0) {
    return bridgeName as unknown as R;
  }
  return `${bridgeName}.${vlan}` as R;
}

export type NicType = "bridged" | "macvlan";

export function calculateNicType<
  V extends undefined | Vlan,
  R extends ChoiceBasedOnVlan<"bridged", "macvlan", V>,
>(vlan: V): R {
  return (vlan ? "macvlan" : "bridged") as R;
}
