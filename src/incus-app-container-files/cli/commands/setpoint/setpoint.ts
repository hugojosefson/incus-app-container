import { AbsolutePath } from "../../things/absolute-path.ts";
import { BridgeName } from "../../things/bridge-name.ts";
import { Vlan } from "../../things/vlan.ts";
import { HostVlan } from "./calculate-tofu-incus-instance.ts";
import { TofuIncusInstance } from "./tofu-incus-instance.ts";

export type Setpoint<AppsDir extends AbsolutePath> = {
  appsDir: AppsDir;
  apps: Record<string, TofuIncusInstance>;
  hostVlans: HostVlan<BridgeName, Vlan>[];
};
