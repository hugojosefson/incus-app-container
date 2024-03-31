import { StorageDataset } from "../../../truenas/storage-dataset.ts";
import {
  CREATE_DATASET_SYMBOL,
  CreateDatasetSymbol,
} from "./create-dataset-symbol.ts";
import { EligibleDataset, isDatasetEligible } from "./eligible-dataset.ts";
import { SetupJailmakerOptions } from "./setup-jailmaker-options.ts";

export function chooseDataset(
  options: Pick<SetupJailmakerOptions, "pool" | "dataset" | "directory">,
  allDatasets: StorageDataset[],
): StorageDataset | CreateDatasetSymbol {
  const eligible: EligibleDataset[] = allDatasets.filter(isDatasetEligible);
  if (eligible.length === 0) {
    return CREATE_DATASET_SYMBOL;
  }
  const filtered: EligibleDataset[] = filterEligibleByOptions(
    options,
    eligible,
  );
  if (filtered.length === 0) {
    return CREATE_DATASET_SYMBOL;
  }
  if (filtered.length === 1) {
    return filtered[0];
  }
  throw new Error(
    `Multiple eligible datasets found: ${
      filtered.map((dataset) => dataset.name).join(", ")
    }. Specify for example --dataset="${
      filtered[0].name
    }" to choose the first one.`,
  );
}

function filterEligibleByOptions(
  options: Pick<SetupJailmakerOptions, "pool" | "dataset" | "directory">,
  eligible: EligibleDataset[],
): EligibleDataset[] {
  const alwaysTrue = () => true;
  return eligible
    .filter(
      options.pool ? (dataset) => dataset.pool === options.pool : alwaysTrue,
    )
    .filter(
      options.dataset && options.pool
        ? (dataset) => dataset.name === `${options.pool}/${options.dataset}`
        : alwaysTrue,
    )
    .filter(
      options.dataset && !options.pool
        ? (dataset) => dataset.name === options.dataset
        : alwaysTrue,
    )
    .filter(
      options.directory
        ? (dataset) => dataset.mountpoint === options.directory
        : alwaysTrue,
    );
}
