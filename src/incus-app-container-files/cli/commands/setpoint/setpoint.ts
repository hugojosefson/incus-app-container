import { AbsolutePath } from "../../absolute-path.ts";
import { TofuIncusInstance } from "./tofu-incus-instance.ts";

export type Setpoint<AppsDir extends AbsolutePath> = {
  appsDir: AppsDir;
  apps: Record<string, TofuIncusInstance>;
};
