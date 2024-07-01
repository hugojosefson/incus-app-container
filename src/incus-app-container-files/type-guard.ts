import { ParseError } from "./deps.ts";
import { AsyncGetterOr } from "./multi-argument.ts";

export type ValidValues<T> = AsyncGetterOr<Readonly<T[] | Set<T> | string>>;

export async function resolveValidValueMessage<T>(
  validValues: ValidValues<T>,
): Promise<string | undefined> {
  validValues = await validValues;
  if (typeof validValues === "string") {
    const message: string = validValues;
    return message;
  }
  if (typeof validValues === "function") {
    return resolveValidValueMessage(validValues());
  }
  if (validValues instanceof Set) {
    return `one of: ${[...validValues].join(", ")}.`;
  }
  if (Array.isArray(validValues) && validValues.length) {
    return `one of: ${validValues.join(", ")}.`;
  }
  return undefined;
}

export async function enforceType<T>(
  typeGuard: (value: unknown) => value is T,
  validValues: ValidValues<T> = [],
  name = typeGuard.name.replace(/^is/, ""),
): Promise<(value: unknown) => T> {
  const validValueMessage = await resolveValidValueMessage(validValues);
  return (value: unknown): T => {
    if (!typeGuard(value)) {
      const message = `Invalid ${name}: ${value}.` +
        (validValueMessage ? `\nMust be ${validValueMessage}` : "");
      throw new ParseError(message);
    }
    return value;
  };
}
