import { SetupJailmakerOptions } from "../cli/commands/setup-jailmaker/setup-jailmaker-options.ts";
import { truenasCli } from "./cli.ts";

export type StorageDataset = {
  id: string;
  type: "FILESYSTEM" | "VOLUME";
  name: string;
  pool: string;
  mountpoint?: string;
  exec?: boolean;
  locked?: boolean;
  readonly?: boolean;
};

export async function getDatasets(): Promise<StorageDataset[]> {
  return await truenasCli(
    "storage dataset query id,name,mountpoint,exec,type,locked,readonly,available,used,size,pool",
  );
}

export async function createDataset(
  options:
    & Pick<SetupJailmakerOptions, "dryRun" | "pool" | "dataset" | "directory">
    & Partial<{ readonly: boolean; exec: boolean }>,
): Promise<StorageDataset> {
  if (!options.pool) {
    throw new Error("Cannot create dataset without specifying pool.");
  }
  if (!options.dataset) {
    throw new Error("Cannot create dataset without specifying dataset name.");
  }
  const name = `${options.pool}/${options.dataset}`;

  if (options.dryRun) {
    console.log(`dry-run: Would create dataset ${name}.`);
    const poolMountPoint = (await truenasCli("storage pool query name,path"))
      .find((pool) => pool.name === options.pool)?.path;
    return {
      id: name,
      name,
      pool: options.pool,
      exec: true,
      locked: false,
      mountpoint: [poolMountPoint, options.dataset].join("/"),
      type: "FILESYSTEM",
      readonly: false,
    } as StorageDataset;
  }

  await truenasCli(
    `storage dataset create`,
    {
      type: "FILESYSTEM",
      name,
      readonly: options.readonly,
      exec: options.exec,
    },
  );
  const dataset = (await getDatasets()).find((dataset) =>
    dataset.name === name
  );
  if (!dataset) {
    throw new Error(`Failed to create dataset ${name}.`);
  }
  return dataset;
}
