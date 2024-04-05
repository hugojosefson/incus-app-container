export type SizeUnitBinary =
  | "KiB"
  | "MiB"
  | "GiB"
  | "TiB"
  | "PiB"
  | "EiB"
  | "ZiB"
  | "YiB";

export type SizeUnitMetric =
  | "KB"
  | "MB"
  | "GB"
  | "TB"
  | "PB"
  | "EB"
  | "ZB"
  | "YB";

export type SizeUnit =
  | SizeUnitBinary
  | SizeUnitMetric;

export type Size<T extends SizeUnit = SizeUnit> = `${number}${T}`;

export function isSize(value: unknown): value is Size {
  return typeof value === "string" && /^(\d+)([KMGTPEZY]i?B)$/.test(value);
}
