import { AbsolutePath } from "../../absolute-path.ts";
import { CreateAppContainerOptions } from "../create-app-container/options.ts";

export type Setpoint<AppsDir extends AbsolutePath> = {
  appsDir: AppsDir;
  apps: Record<string, CreateAppContainerOptions<AppsDir>>;
};
