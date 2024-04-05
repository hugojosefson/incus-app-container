/**
 * Extracts the command to run a script, from its shebang line.
 * @param scriptContents the script source code
 * @returns array of command and parameters
 */
export function extractShebangCommand(scriptContents: string): string[] {
  return scriptContents.split("\n")[0].replace(/^#!/, "").split(" ");
}

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
