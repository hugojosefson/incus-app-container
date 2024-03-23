import { stringify as yaml } from "https://deno.land/std@0.220.1/yaml/stringify.ts";
import {
  AbsolutePath,
  CreateAppContainerOptions,
} from "./create-app-container-options.ts";
import { run } from "./deps.ts";
import { getInstallScript } from "./get-install-script.ts";
import {
  INCUS_CONTAINER_STATUS_CODES,
  untilStatusCode,
} from "./incus-container-status.ts";
import { StatusSpinnerResource } from "./status-spinner-resource.ts";

export type AppdataDir<Name extends string> = `${string | ""}/apps/${Name}`;
export type AppContainer<Name extends string> = {
  name: Name;
  appdataDir: AppdataDir<Name>;
};

export async function createAppContainer<
  AppsDir extends AbsolutePath,
  Name extends string,
>(
  name: Name,
  options: CreateAppContainerOptions<AppsDir>,
): Promise<AppContainer<Name>> {
  {
    using spinner = new StatusSpinnerResource(name, {
      pending: "Creating container...",
      done: "Created container.",
    });
    spinner.currentStatus = "fetching install script for alpine-319-cloud";
    const installScript = await getInstallScript("alpine-319-cloud");

    spinner.currentStatus = "running install script for alpine-319-cloud";
    const runcmd = [installScript];

    const image = "images:alpine/3.19/cloud";
    spinner.currentStatus = `checking image ${image}`;
    await run(["incus", "image", "info", image]);

    spinner.currentStatus = "building cloud-init vendor config";
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

    spinner.currentStatus = "building cloud-init user config";
    const userConfig = {};

    spinner.currentStatus = "building cloud-init network config";
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

    spinner.currentStatus = "creating container";
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

    spinner.currentStatus = "creating root disk";
    await run([
      "incus",
      "config",
      "device",
      "set",
      name,
      "root",
      `size=${options.diskSize}`,
    ]);

    const appdataDir = `${options.appsDir}/${name}` as AppdataDir<Name>;
    await Deno.mkdir(appdataDir, { recursive: true });
    await run(["chown", "-R", `${1_000_000}:${1_000_000}`, appdataDir]); // because Deno.chown is not recursive
    spinner.currentStatus =
      `creating bind-mount from host:${appdataDir} to ${name}:/appdata`;
    await run([
      "incus",
      "config",
      "device",
      "add",
      name,
      "appdata-bind-mount",
      "disk",
      `source=${appdataDir}`,
      `path=/appdata`,
    ]);
  }
  {
    using _ = new StatusSpinnerResource(name, {
      pending: "Starting cloud-init...",
    });
    await run(["incus", "start", name]);
  }
  await untilStatusCode(
    INCUS_CONTAINER_STATUS_CODES.Stopped,
    name,
    {
      pending: `Running cloud-init...`,
      done: `Finished cloud-init.`,
    },
  );
  await untilStatusCode(INCUS_CONTAINER_STATUS_CODES.Stopped, name);

  return {
    name,
    appdataDir: `${options.appsDir}/${name}` as AppdataDir<Name>,
  };
}
