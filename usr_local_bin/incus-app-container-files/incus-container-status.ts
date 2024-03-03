import { Spinner } from "https://deno.land/std@0.218.2/cli/spinner.ts";
import { jsonRun } from "https://deno.land/x/run_simple@2.3.0/src/run.ts";

import { flipStringToStringRecord } from "./fn.ts";

export const INCUS_CONTAINER_STATUS_NAMES = {
  "100": "Operation created",
  "101": "Started",
  "102": "Stopped",
  "103": "Running",
  "104": "Cancelling",
  "105": "Pending",
  "106": "Starting",
  "107": "Stopping",
  "108": "Aborting",
  "109": "Freezing",
  "110": "Frozen",
  "111": "Thawed",
  "112": "Error",
  "200": "Success",
  "400": "Failure",
  "401": "Cancelled",
} as const;
export type IncusContainerStatusCode =
  keyof typeof INCUS_CONTAINER_STATUS_NAMES;
export type IncusContainerStatusName =
  typeof INCUS_CONTAINER_STATUS_NAMES[IncusContainerStatusCode];
export const INCUS_CONTAINER_STATUS_CODES = flipStringToStringRecord(
  INCUS_CONTAINER_STATUS_NAMES,
);

export async function untilStatusCode(
  codeToWaitFor: IncusContainerStatusCode,
  containerName: string,
  intervalMs = 1000 / 7,
): Promise<void> {
  const statusToWaitFor = INCUS_CONTAINER_STATUS_NAMES[codeToWaitFor];
  const calculateMessage = (
    currentStatusCodes: IncusContainerStatusCode[] = [],
  ) =>
    currentStatusCodes.length
      ? `Waiting for container ${containerName} to be ${statusToWaitFor}...`
      : `Waiting for container ${containerName} to be ${statusToWaitFor}... (currently ${
        currentStatusCodes.map((currentStatusCode) =>
          INCUS_CONTAINER_STATUS_NAMES[currentStatusCode]
        ).join(", ")
      })`;

  const spinner = new Spinner({
    message: calculateMessage(),
    interval: intervalMs,
  });
  try {
    if (Deno.stdout.isTerminal()) {
      spinner.start();
    }
    do {
      const containers = await jsonRun([
        "incus",
        "list",
        "--format=json",
        containerName,
      ], { verbose: false }) as {
        name: string;
        status_code: number | string;
      }[];
      const currentStatusCodes = containers
        .filter(({ name }) => name === containerName)
        .map(({ status_code }) => `${status_code}` as IncusContainerStatusCode);

      spinner.message = calculateMessage(currentStatusCodes);

      if (currentStatusCodes.includes(codeToWaitFor)) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } while (true);
  } finally {
    spinner.stop();
  }
}
