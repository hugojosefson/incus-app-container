/**
 * Flips places of keys and values in a record.
 * @param obj the record to flip
 * @returns the flipped record
 */
export function flipStringToStringRecord<K extends string, V extends string>(
  obj: Record<K, V>,
): Record<V, K> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));
}
