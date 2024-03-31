import {
  createDataset,
  StorageDataset,
} from "../../../truenas/storage-dataset.ts";
import { chooseDataset } from "./choose-dataset.ts";
import {
  CREATE_DATASET_SYMBOL,
  CreateDatasetSymbol,
} from "./create-dataset-symbol.ts";
import { SetupJailmakerOptions } from "./setup-jailmaker-options.ts";

export async function chooseOrCreateDataset(
  options: Pick<
    SetupJailmakerOptions,
    "dryRun" | "pool" | "dataset" | "directory"
  >,
  allDatasets: StorageDataset[],
): Promise<StorageDataset> {
  const dataset: StorageDataset | CreateDatasetSymbol = chooseDataset(
    options,
    allDatasets,
  );
  if (dataset === CREATE_DATASET_SYMBOL) {
    return await createDataset({ ...options, readonly: false, exec: true });
  }
  return dataset;
}
