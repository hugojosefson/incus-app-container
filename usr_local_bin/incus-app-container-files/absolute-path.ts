export type AbsolutePath = `/` | `/${string}`;

export function isAbsolutePath(value: unknown): value is AbsolutePath {
  return typeof value === "string" && value.startsWith("/");
}
