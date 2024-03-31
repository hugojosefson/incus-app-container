export type OnOff<V extends boolean> = V extends true ? "ON" : "OFF";

export function onOff<V extends boolean>(value: V): OnOff<V> {
  return (value ? "ON" : "OFF") as OnOff<V>;
}

export function parseOnOff(value: string): boolean {
  if (value === "ON") {
    return true;
  } else if (value === "OFF") {
    return false;
  } else {
    throw new Error(`Expected "ON" or "OFF", but got "${value}"`);
  }
}

export function isOnOff(value: string): value is OnOff<boolean> {
  return value === "ON" || value === "OFF";
}
