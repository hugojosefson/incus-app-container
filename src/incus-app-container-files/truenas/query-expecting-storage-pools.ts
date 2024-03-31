export type QueryExpectingStoragePools =
  | `storage pool query`
  | `storage pool query ${string}`;

export function isQueryExpectingStoragePools(
  query: string,
): query is QueryExpectingStoragePools {
  return query.startsWith("storage pool query ");
}
