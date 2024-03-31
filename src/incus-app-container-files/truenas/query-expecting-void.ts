import {
  InitShutdownScriptCreate,
  InitShutdownScriptUpdate,
  isInitShutdownScriptCreate,
  isInitShutdownScriptUpdate,
} from "./init-shutdown-script.ts";

export type QueryExpectingVoid =
  | InitShutdownScriptCreate
  | InitShutdownScriptUpdate
  | `storage dataset create ${string}`;

export function isQueryExpectingVoid(
  query: string,
): query is QueryExpectingVoid {
  return query.startsWith("storage dataset create ") ||
    isInitShutdownScriptCreate(query) ||
    isInitShutdownScriptUpdate(query);
}
