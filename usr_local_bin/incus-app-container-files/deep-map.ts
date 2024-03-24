export function createDeepMapValues(fn: <T>(t: T) => T) {
  return function deepMapValues<X>(x: X): X {
    if (Array.isArray(x)) {
      return x.map(deepMapValues) as X;
    }

    if (typeof x === "object" && x !== null) {
      return Object.fromEntries(
        Object.entries(x).map(([key, value]) => [key, deepMapValues(value)]),
      ) as X;
    }

    return fn(x);
  };
}

export function createDeepMapKeys(fn: (s: string) => string) {
  return function deepMapKeys<X>(x: X): X {
    if (Array.isArray(x)) {
      return x.map(deepMapKeys) as X;
    }

    if (typeof x === "object" && x !== null) {
      return Object.fromEntries(
        Object.entries(x).map(([key, value]) => [fn(key), deepMapKeys(value)]),
      ) as X;
    }

    return x;
  };
}
