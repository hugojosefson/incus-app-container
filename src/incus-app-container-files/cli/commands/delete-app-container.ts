import { s } from "../../deps.ts";

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
