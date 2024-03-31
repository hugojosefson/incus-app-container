import {
  getDatasets,
  StorageDataset,
} from "../../../truenas/storage-dataset.ts";
import { chooseOrCreateDataset } from "./choose-or-create-dataset.ts";
import { SetupJailmakerOptions } from "./setup-jailmaker-options.ts";

export async function ensureJailmakerDataset(
  options: Pick<
    SetupJailmakerOptions,
    "dryRun" | "pool" | "dataset" | "directory"
  >,
): Promise<StorageDataset> {
  const datasets: StorageDataset[] = await getDatasets();
  return await chooseOrCreateDataset(options, datasets);
}
