export type QueryExpectingStorageDatasets =
  | `storage dataset query`
  | `storage dataset query ${string}`;

export function isQueryExpectingStorageDatasets(
  query: string,
): query is QueryExpectingStorageDatasets {
  return query.startsWith("storage dataset query ");
}
