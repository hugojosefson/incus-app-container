import { StorageDataset } from "../../../truenas/storage-dataset.ts";

export function isDatasetEligible(
  dataset: StorageDataset,
): dataset is EligibleDataset {
  return dataset.type === "FILESYSTEM" && !!dataset.exec && !dataset.locked &&
    !dataset.readonly;
}

export type EligibleDataset = StorageDataset & {
  type: "FILESYSTEM";
  exec: true;
  locked: false;
  readonly: false;
};
