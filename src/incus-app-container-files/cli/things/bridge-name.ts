export type BridgeName = `br${number}`;

export function isBridgeName(value: unknown): value is BridgeName {
  if (typeof value !== "string") {
    return false;
  }
  return /^br\d+$/.test(value);
}

export const DEFAULT_BRIDGE: BridgeName = "br0";
