export const OUTPUT_FORMATS = ["table", "json", "jsonl", "plain"] as const;
export type OutputFormat = typeof OUTPUT_FORMATS[number];
export const isOutputFormat = (value: unknown): value is OutputFormat =>
  OUTPUT_FORMATS.includes(value as OutputFormat);
