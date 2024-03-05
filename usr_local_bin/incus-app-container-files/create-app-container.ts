import { stringify as yaml } from "https://deno.land/std@0.218.2/yaml/stringify.ts";
import { CreateAppContainerOptions } from "./create-app-container-options.ts";
import { run } from "./deps.ts";
import { getInstallScript } from "./get-install-script.ts";
import {
  INCUS_CONTAINER_STATUS_CODES,
  untilStatusCode,
} from "./incus-container-status.ts";

export async function createAppContainer(
  name: string,
  options: CreateAppContainerOptions,
): Promise<{ appdataDir: string }> {
  const installScript = await getInstallScript("alpine-318");
  const runcmd = [installScript];
  // const appdataDir = await getAppdataDir(options);
  // await Deno.mkdir(appdataDir, { recursive: true });
  // await Deno.writeTextFile(
  //   appdataDir + "/docker-compose.yml",
  //   await readFromUrl(new URL("template/docker-compose.yml", import.meta.url)),
  // );
  // await run(["chown", "-R", `${100_000}:${100_000}`, appdataDir]);

  const image = "images:alpine/3.19/cloud";
  const vendorConfig = {
    disable_root: false,
    ssh_authorized_keys: options.sshKey,
    ...(options.ip === "dhcp" ? {} : {
      manage_resolv_conf: true,
      resolv_conf: {
        nameservers: [options.nameserver.address],
      },
    }),
    packages: [
      "bash",
      "curl",
    ],
    runcmd,
    power_state: {
      mode: "poweroff",
      timeout: 30,
    },
  };

  const userConfig = {};

  const networkConfigYaml = options.ip === "dhcp" ? "DHCP on eth0" : yaml({
    network: {
      version: 2,
      ethernets: {
        eth0: {
          addresses: [options.ip.cidr],
          routes: [{ to: "0.0.0.0/0", via: options.gateway.address }],
          nameservers: { addresses: [options.nameserver.address] },
        },
      },
    },
  });

  await run([
    "incus",
    "create",
    "--no-profiles",
    "--storage=default",
    image,
    name,
  ], {
    stdin: yaml({
      description: "By incus-app-container",
      devices: {
        eth0: {
          name: "eth0",
          nictype: "bridged",
          parent: "br0",
          type: "nic",
        },
        root: {
          path: "/",
          pool: "default",
        },
      },
      config: {
        "security.nesting": "true",
        "cloud-init.user-data": "#cloud-config\n" + yaml(userConfig),
        "cloud-init.vendor-data": "#cloud-config\n" + yaml(vendorConfig),
        "cloud-init.network-config": networkConfigYaml,
      },
    }),
  });
  await run([
    "incus",
    "config",
    "device",
    "set",
    name,
    "root",
    `size=${options.diskSize}`,
  ]);

  await run(["incus", "start", name]);
  await untilStatusCode(
    INCUS_CONTAINER_STATUS_CODES.Stopped,
    name,
    {
      pending: `Running cloud-init...`,
      done: `Ran cloud-init.`,
    },
  );
  return {
    appdataDir: `/apps/${name}`,
  };
}
