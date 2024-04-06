import { run } from "../../../deps.ts";

export async function getIncusPreseed(
  poolDisk: string,
  bridgeName: string,
): Promise<string> {
  const bridgeIp = await run(["ip", "-4", "-o", "addr", "show", bridgeName]);
  const bridgeCidr = bridgeIp.split(" ", 4)[3];
  return `config:
  core.https_address: ${bridgeCidr}:8443
networks: []
storage_pools:
- config:
    source: ${poolDisk}
  description: ""
  name: default
  driver: lvm
profiles:
- config: {}
  description: ""
  devices:
    eth0:
      name: eth0
      nictype: bridged
      parent: ${bridgeName}
      type: nic
    root:
      path: /
      pool: default
      type: disk
  name: default
projects: []
cluster: null
`;
}
