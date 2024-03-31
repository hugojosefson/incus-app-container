export type QueryExpectingInitShutdownScripts =
  `system init_shutdown_script query`;

export function isQueryExpectingInitShutdownScripts(
  query: string,
): query is QueryExpectingInitShutdownScripts {
  return query === "system init_shutdown_script query";
}
