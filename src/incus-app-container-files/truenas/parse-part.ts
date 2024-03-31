import { mapValues } from "../deps.ts";
import { isOnOff, parseOnOff } from "./on-off.ts";

export function parsePart<T>(input: unknown): T {
  if (input === null) {
    return undefined as T;
  }
  if (Array.isArray(input)) {
    return input.map(parsePart) as T;
  }
  if (typeof input === "string") {
    if (input === "<undefined>" || input === "<null>") {
      return undefined as T;
    }
    if (input === "<empty list>") {
      return [] as T;
    }
    if (isOnOff(input)) {
      return parseOnOff(input) as T;
    }
    try {
      const parsed = JSON.parse(input);
      return parsePart(parsed);
    } catch {
      return input as T;
    }
  }
  if (typeof input === "object") {
    const asObject = input as Record<string, unknown>;
    if ("parsed" in asObject) {
      return parsePart(asObject.parsed);
    }
    return mapValues(asObject, parsePart) as T;
  }
  return input as T;
}
