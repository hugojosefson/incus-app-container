export async function resolveMultiArgument<T>(
  multiArgument: MultiArgument<T>,
): Promise<T[]> {
  multiArgument = await multiArgument;
  if (multiArgument === undefined) {
    return [];
  }
  if (typeof multiArgument === "function") {
    return resolveMultiArgument(multiArgument());
  }
  if (multiArgument instanceof Set) {
    return resolveMultiArgument([...multiArgument]);
  }
  if (Array.isArray(multiArgument)) {
    return await Promise.all(multiArgument.map(resolveMultiArgument)) as T[];
  }
  return [multiArgument] as T[];
}

export type GetterOr<T> = T | (() => T);
export type PromiseOr<T> = T | Promise<T>;
export type AsyncGetterOr<T> = GetterOr<PromiseOr<T>>;
export type MultiArgument<T> = AsyncGetterOr<
  Readonly<T[] | Set<T> | T> | undefined
>;
