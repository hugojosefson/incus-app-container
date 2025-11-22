import { run } from "@hugojosefson/run-simple";

export async function getIncusPackages(): Promise<string[]> {
  const output = await run(["apt-cache", "search", "^incus"]);
  return output.split("\n").map((line) => line.split(" ", 1)[0]);
}
