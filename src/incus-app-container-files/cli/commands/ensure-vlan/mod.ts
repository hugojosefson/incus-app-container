import { run } from "@hugojosefson/run-simple";
import { s } from "@hugojosefson/fns/string/s";
import { swallow } from "@hugojosefson/fns/fn/swallow";
import { EnsureVlanInputOptions } from "../../config.ts";
import { BridgeName } from "../../things/bridge-name.ts";
import {
  calculateNicParentName,
  getNic,
  NicParentVlanName,
} from "../../things/nic.ts";
import {
  createVlanEtcNetworkInterfacesD,
  type Vlan,
} from "../../things/vlan.ts";

/**
 * Prints the current setpoint; the containers we want, according to configuration files.
 * @param options
 */
export async function ensureVlan(
  options: EnsureVlanInputOptions,
): Promise<void> {
  if (!options.bridgeName) {
    throw new Error("Missing --bridge-name.");
  }
  if (!options.vlan) {
    throw new Error("Missing --vlan.");
  }
  if (!options.file) {
    throw new Error("Missing --file.");
  }
  await actuallyEnsureVlan(options);
  console.log("{}");
}

async function actuallyEnsureVlan(
  options: Required<EnsureVlanInputOptions>,
): Promise<void> {
  const contents = createVlanEtcNetworkInterfacesD(
    options.bridgeName,
    options.vlan,
  );

  const nicName = calculateNicParentName(
    options.bridgeName,
    options.vlan,
  ) as NicParentVlanName<BridgeName, Vlan>;

  const existingNic: string[] | undefined = await getNic(nicName);
  const existingFileContents: string | undefined = await Deno.readTextFile(
    options.file,
  ).catch(swallow(Deno.errors.NotFound));

  const wouldWill = options.dryRun ? "Would" : "Will";

  if (existingNic) {
    console.error(`VLAN ${options.vlan} exists.`);
    if (existingFileContents === contents) {
      console.error(
        `The file ${options.file} matches. All good.`,
      );
    } else {
      console.error(
        `Any file ${options.file} does not match. ${wouldWill} take down VLAN ${options.vlan}, write the file, and bring up VLAN ${options.vlan}.`,
      );
      console.error({ current: s(existingFileContents), desired: s(contents) });
      if (!options.dryRun) {
        await takeDownVlanOrSwallow(nicName);
        await writeVlanFile(options, contents);
        await bringUpVlanOrThrow(nicName);
      }
    }
  } else {
    console.error(`VLAN ${options.vlan} does not exist.`);
    if (existingFileContents === contents) {
      console.error(
        `The file ${options.file} matches. ${wouldWill} bring up VLAN ${options.vlan}.`,
      );
      if (!options.dryRun) {
        await bringUpVlanOrThrow(nicName);
      }
    } else {
      console.error(
        `Any file ${options.file} does not match. ${wouldWill} write the file, and bring up VLAN ${options.vlan}.`,
      );
      console.error({ current: s(existingFileContents), desired: s(contents) });
      if (!options.dryRun) {
        await writeVlanFile(options, contents);
        await bringUpVlanOrThrow(nicName);
      }
    }
  }
}

async function writeVlanFile(
  options: Required<EnsureVlanInputOptions>,
  contents: string,
): Promise<void> {
  await Deno.writeTextFile(options.file, contents);
}

async function bringUpVlanOrThrow(
  nicName: NicParentVlanName<BridgeName, Vlan>,
): Promise<void> {
  await run(["ifup", nicName]);
  if (!await getNic(nicName)) {
    throw new Error(`Failed to bring up ${nicName}.`);
  }
}

async function takeDownVlanOrSwallow(
  nicName: NicParentVlanName<BridgeName, Vlan>,
): Promise<void> {
  await run(["ifdown", nicName]).catch(swallow(Error));
}
