import { truenasCli } from "./cli.ts";

export async function getProductAndType(): Promise<string> {
  return (await Promise.all([
    "system product_name",
    "system product_type",
  ].map((c) => truenasCli(c))).catch(() => [])).join(" ");
}
