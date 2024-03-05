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

export type StatusMessages = {
  pending: string;
  done: string;
};

export function lookupStatusName(
  currentStatusCode: IncusContainerStatusCode,
): IncusContainerStatusName {
  return INCUS_CONTAINER_STATUS_NAMES[currentStatusCode];
}

function calculateMessage(
  name: string,
  statusMessages: StatusMessages,
  currentStatusCodes: IncusContainerStatusCode[] = [],
): string {
  const currently: string[] = currentStatusCodes.length === 0 ? [] : [
    ` (currently `,
    currentStatusCodes.map(lookupStatusName).map((n) => n.toLowerCase()).join(
      ", ",
    ),
    `)`,
  ];
  return [`${name}: `, statusMessages.pending, ...currently].join("");
}

export async function untilStatusCode(
  codeToWaitFor: IncusContainerStatusCode,
  name: string,
  statusMessages: StatusMessages = {
    pending: `Waiting to be ${
      lookupStatusName(codeToWaitFor).toLowerCase()
    }...`,
    done: `${lookupStatusName(codeToWaitFor)}.`,
  },
  intervalMs = 1000 / 7,
): Promise<void> {
  const spinner = new Spinner({
    message: calculateMessage(name, statusMessages),
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
        name,
      ], { verbose: false }) as {
        name: string;
        status_code: number | string;
      }[];
      const currentStatusCodes = containers
        .filter(({ name }) => name === name)
        .map(({ status_code }) => `${status_code}` as IncusContainerStatusCode);

      spinner.message = calculateMessage(
        name,
        statusMessages,
        currentStatusCodes,
      );

      if (currentStatusCodes.includes(codeToWaitFor)) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } while (true);
    spinner.message = statusMessages.done;
  } finally {
    spinner.stop();
  }
  console.error(`✓ ${name}: ${statusMessages.done}`);
}
