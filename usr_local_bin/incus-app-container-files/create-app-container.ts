import { stringify as yaml } from "https://deno.land/std@0.218.2/yaml/stringify.ts";
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
    spinner.currentStatus = "fetching install script for alpine-318";
    const installScript = await getInstallScript("alpine-318");

    spinner.currentStatus = "running install script for alpine-318";
    const runcmd = [installScript];
    // const appdataDir = await getAppdataDir(options);
    // await Deno.mkdir(appdataDir, { recursive: true });
    // await Deno.writeTextFile(
    //   appdataDir + "/docker-compose.yml",
    //   await readFromUrl(new URL("template/docker-compose.yml", import.meta.url)),
    // );
    // await run(["chown", "-R", `${100_000}:${100_000}`, appdataDir]);

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
