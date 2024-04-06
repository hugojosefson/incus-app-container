import { run } from "../../../deps.ts";
import { calculateCidrMin } from "./calculate-cidr-min.ts";

/**
 * Converts the dhcp network interface to a bridge, and restarts the networking service.
 * @param bridgeName The name of the network bridge device.
 * @param bridgeCidr The ip/net or 'dhcp' to use for the bridge.
 */
export async function convertToBridge(
  bridgeName: string,
  bridgeCidr: string,
): Promise<void> {
  if (bridgeCidr === "dhcp") {
    await run([
      "sed",
      "-E",
      `s|^iface ([^ ]+) inet dhcp$|iface \\1 inet manual\n\nauto ${bridgeName}\niface ${bridgeName} inet dhcp|`,
      "-i",
      "/etc/network/interfaces",
    ]);
  } else {
    await run([
      "sed",
      "-E",
      `s|^iface ([^ ]+) inet dhcp$|iface \\1 inet manual\n\nauto ${bridgeName}\niface ${bridgeName} inet static\nbridge_ports \\1\naddress ${bridgeCidr}\ngateway ${
        calculateCidrMin(bridgeCidr)
      }\nhwaddress \\$(cat /sys/class/net/\\1/address)|`,
      "-i",
      "/etc/network/interfaces",
    ]);
  }

  await run(["systemctl", "restart", "networking"]);
}
