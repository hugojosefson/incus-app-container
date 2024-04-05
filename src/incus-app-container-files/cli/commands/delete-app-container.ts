import { s } from "https://deno.land/x/fns@1.1.0/string/s.ts";

export function deleteAppContainer(
  containerName: string,
  deleteAppdata: boolean,
): void {
  console.log(
    `Deleting container ${s(containerName)}${
      deleteAppdata ? " and its appdata" : ""
    }...`,
  );
}
