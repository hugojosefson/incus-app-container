import { PromiseOr } from "./multi-argument.ts";

export async function readTextFiles(
  dir: string,
  filePredicate: (
    file: Deno.DirEntry & { isFile: true },
  ) => PromiseOr<boolean> = () => true,
): Promise<string[]> {
  const entries = [];
  for await (const file of Deno.readDir(dir)) {
    entries.push(file);
  }
  const files = entries
    .filter((file) => file.isFile)
    .map((file) => file as typeof file & { isFile: true });

  const filesToRead = files.map((file) => [filePredicate(file), file] as const);
  const filesContent = filesToRead.map(async ([predicateResponse, file]) =>
    (await predicateResponse) ? [Deno.readTextFile(`${dir}/${file.name}`)] : []
  );
  return Promise.all((await Promise.all(filesContent)).flat());
}
