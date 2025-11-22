import { AbsolutePath } from "../../things/absolute-path.ts";
import { calculateSetpoint } from "./calculate-setpoint.ts";
import { SetpointInputOptions } from "../../config.ts";
import { Setpoint } from "./setpoint.ts";

const replacer = <T>(_key: unknown, value: T): string | T => {
  if (["number", "boolean"].includes(typeof value)) {
    return `${value}`;
  }
  return value;
};

/**
 * Prints the current setpoint; the containers we want, according to configuration files.
 * @param options
 */
export async function setpoint<AppsDir extends AbsolutePath>(
  options: SetpointInputOptions<AppsDir>,
): Promise<void> {
  const result: Setpoint<AbsolutePath> = await calculateSetpoint(
    options.appsDir,
  );
  if (options.wrap) {
    console.log(
      JSON.stringify(
        { json: JSON.stringify(result) },
        replacer,
        2,
      ),
    );
    return;
  }
  console.dir(result, { depth: Infinity });
}
