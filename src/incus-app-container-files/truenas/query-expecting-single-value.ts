import { isQueryExpectingInitShutdownScripts } from "./query-expecting-init-shutdown-scripts.ts";
export type QueryExpectingSingleValue = `system ${string}`;

export function isQueryExpectingSingleValue(
  query: string,
): query is QueryExpectingSingleValue {
  return query.startsWith("system ") &&
    !isQueryExpectingInitShutdownScripts(query);
}
