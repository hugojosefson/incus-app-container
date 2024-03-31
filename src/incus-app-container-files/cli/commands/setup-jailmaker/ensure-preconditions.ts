import { getProductAndType } from "../../../truenas/system-product-and-type.ts";
import { die } from "../../die.ts";

const REQUIRED_PRODUCT = "TrueNAS SCALE";

export async function ensurePreconditions(): Promise<void> {
  if (await getProductAndType() !== REQUIRED_PRODUCT) {
    die(
      `This script is only for ${REQUIRED_PRODUCT}, where your account can run the "cli" command.`,
    );
  }
}
