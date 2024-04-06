import { run } from "../../../deps.ts";

export async function getIncusPackages(): Promise<string[]> {
  const output = await run(["apt-cache", "search", "^incus"]);
  return output.split("\n").map((line) => line.split(" ", 1)[0]);
}
