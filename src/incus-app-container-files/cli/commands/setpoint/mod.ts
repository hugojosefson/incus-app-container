import { AbsolutePath } from "../../absolute-path.ts";
import { calculateSetpoint } from "./calculate-setpoint.ts";
import { SetpointInputOptions } from "../../config.ts";

/**
 * Prints the current setpoint; the containers we want, according to configuration files.
 * @param options
 */
export async function setpoint<AppsDir extends AbsolutePath>(
  options: SetpointInputOptions<AppsDir>,
): Promise<void> {
  console.log(
    JSON.stringify(
      await calculateSetpoint(options.appsDir),
      null,
      2,
    ),
  );
}
