import { stringify as yaml } from "https://deno.land/std@0.218.2/yaml/stringify.ts";
import IPCIDR from "npm:ip-cidr@4.0.0";
import { run } from "./deps.ts";
import { getInstallScript } from "./get-install-script.ts";
import {
  INCUS_CONTAINER_STATUS_CODES,
  untilStatusCode,
} from "./incus-container-status.ts";
import { MultiArgument } from "./multi-argument.ts";
import { resolveSshKeys, SshKey, SshKeyRaw } from "./ssh-key.ts";

export type AppContainerCreateOptions = {
  name: string;
  cidr: string;
  sshKey: MultiArgument<SshKey>;
};

export async function createAppContainer(
  options: AppContainerCreateOptions,
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
  const defaultGateway = new IPCIDR(options.cidr).toArray({
    from: 1,
    limit: 1,
  }).at(0);
  const nameserver = defaultGateway;
  const size = "10GiB";
  const sshKeysRaw: SshKeyRaw[] = await resolveSshKeys(options.sshKey);

  const vendorConfig = {
    disable_root: false,
    ssh_authorized_keys: sshKeysRaw,
    manage_resolv_conf: true,
    resolv_conf: {
      nameservers: [nameserver],
    },
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

  const networkConfigYaml = options.cidr === "dhcp" ? "DHCP on eth0" : yaml({
    network: {
      version: 2,
      ethernets: {
        eth0: {
          addresses: [options.cidr],
          routes: [{ to: "0.0.0.0/0", via: defaultGateway }],
          nameservers: { addresses: [nameserver] },
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
    options.name,
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
    options.name,
    "root",
    `size=${size}`,
  ]);

  await run(["incus", "start", options.name]);
  await untilStatusCode(INCUS_CONTAINER_STATUS_CODES.Stopped, options.name);
  return {
    appdataDir:
      `created container ${options.name} successfully, but no appdata dir yet.`,
  };
}
