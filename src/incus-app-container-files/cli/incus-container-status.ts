import { jsonRun } from "../deps.ts";

import { flipStringToStringRecord } from "../flip-record.ts";
import {
  StatusMessages,
  StatusSpinnerResource,
} from "../status-spinner-resource.ts";

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

export function lookupStatusName(
  currentStatusCode: IncusContainerStatusCode,
): IncusContainerStatusName {
  return INCUS_CONTAINER_STATUS_NAMES[currentStatusCode];
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
): Promise<void> {
  using spinner = new StatusSpinnerResource(name, statusMessages);
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

    spinner.currentStatus = currentStatusCodes
      .map(lookupStatusName)
      .map((n) => n.toLowerCase());

    if (currentStatusCodes.includes(codeToWaitFor)) {
      break;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, StatusSpinnerResource.INTERVAL_MS)
    );
  } while (true);
}
