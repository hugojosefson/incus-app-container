import { SupportedImageUri } from "../../supported-image.ts";

export type TofuIncusInstance = {
  name: string;
  image: SupportedImageUri;
  description?: string;
  running: boolean;
  profiles: string[];
  config: Record<string, unknown>;
  devices: TofuIncusDevice[];
};

export type TofuIncusDevice = {
  name: string;
  type: "nic" | "disk";
  properties: Record<string, string>;
};
