import { AbsolutePath } from "../../absolute-path.ts";
import { CreateAppContainerOptions } from "./options.ts";
import { run, stringifyYaml } from "../../../deps.ts";
import { type Vlan } from "../../vlan.ts";
import {
  INCUS_CONTAINER_STATUS_CODES,
  untilStatusCode,
} from "../../incus-container-status.ts";
import { StatusSpinnerResource } from "../../../status-spinner-resource.ts";

export type AppdataDir<Name extends string> = `${string | ""}/apps/${Name}`;
export type AppContainer<Name extends string> = {
  name: Name;
  appdataDir: AppdataDir<Name>;
};

async function getNics(): Promise<string[][]> {
  const netconf = await run(["ip", "netconf"]);
  const nics = netconf.split("\n")
    .map((line) => line.split(/\s+/));
  return nics;
}

export async function getNic(name: string): Promise<string[] | undefined> {
  return (await getNics())
    .filter((nic) => nic[0] === "inet")
    .find((nic) => nic[1] === name) ?? undefined;
}

export function getNicParentName(vlan?: Vlan): string {
  return vlan ? `br0.${vlan}` : "br0";
}

export function getNicType(vlan?: Vlan): string {
  return vlan ? "macvlan" : "bridged";
}

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

    spinner.currentStatus = "Restarting network to reload NIC:s...";
    await run("systemctl restart networking");

    const nicParentName = getNicParentName(options.vlan);
    const nicType = getNicType(options.vlan);
    spinner.currentStatus = `Checking NIC: ${nicParentName}`;

    const nicParent = await getNic(nicParentName);

    if (!nicParent) {
      if (!options.vlan) {
        throw new Error(
          `No bridge NIC named ${nicParentName} found. Please create it.`,
        );
      }
      spinner.currentStatus = `Creating vlan ${options.vlan}...`;
      await Deno.writeTextFile(
        `/etc/network/interfaces.d/${nicParentName}`,
        `
auto ${nicParentName}
iface ${nicParentName} inet manual
  vlan-raw-device ${getNicParentName(undefined)}
  `,
      );
      spinner.currentStatus =
        `Restarting network to activate vlan ${options.vlan}...`;
      await run("systemctl restart networking");
    }

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
      power_state: {
        mode: "poweroff",
        timeout: 30,
      },
    };

    spinner.currentStatus = "building cloud-init user config";
    const userConfig = {};

    spinner.currentStatus = "building cloud-init network config";
    const networkConfigYaml = stringifyYaml({
      network: {
        version: 2,
        ethernets: {
          eth0: options.ip === "dhcp"
            ? {
              dhcp4: true,
              dhcp6: false,
            }
            : {
              dhcp4: false,
              dhcp6: false,
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
      stdin: stringifyYaml({
        description: "By incus-app-container",
        devices: {
          eth0: {
            name: "eth0",
            type: "nic",
            nictype: nicType,
            parent: nicParentName,
          },
          root: {
            path: "/",
            pool: "default",
          },
        },
        config: {
          "security.idmap.isolated": true,
          "security.idmap.base": options.idmapBase,
          "security.idmap.size": options.idmapSize,
          "security.nesting": true,
          "cloud-init.user-data": "#cloud-config\n" + stringifyYaml(userConfig),
          "cloud-init.vendor-data": "#cloud-config\n" +
            stringifyYaml(vendorConfig),
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
    await run([
      "chown",
      "-R",
      `${options.idmapBase}:${options.idmapBase}`,
      appdataDir,
    ]); // because Deno.chown is not recursive
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
  {
    using spinner = new StatusSpinnerResource(name, {
      pending: "Running install script...",
      done: "Ran install script.",
    });
    spinner.currentStatus = "Fetching install script for alpine-319-cloud";
    await untilStatusCode(INCUS_CONTAINER_STATUS_CODES.Stopped, name);
    await run(["incus", "start", name]);
    await untilStatusCode(INCUS_CONTAINER_STATUS_CODES.Running, name);

    spinner.currentStatus = "Pushing install script for alpine-319-cloud...";
    await run([
      "incus",
      "file",
      "push",
      import.meta.dirname + "/../../../template/alpine-319-cloud-install",
      `${name}/usr/local/bin/`,
      "--mode",
      "0755",
    ]);

    spinner.currentStatus = "Waiting for network...";
    await run([
      "incus",
      "exec",
      name,
      "--",
      "sh",
      "-c",
      "until ping -c1 one.one.one.one; do sleep 0.2; done",
    ]);
    await run([
      "incus",
      "exec",
      name,
      "--",
      "sh",
      "-c",
      "until apk update --no-cache; do sleep 0.5; done",
    ]);

    spinner.currentStatus = "Running install script for alpine-319-cloud...";
    await run([
      "incus",
      "exec",
      name,
      "--",
      "alpine-319-cloud-install",
    ]);

    spinner.currentStatus =
      "Finished running install script for alpine-319-cloud. Stopping container...";
    await run(["incus", "stop", name]);
    await untilStatusCode(INCUS_CONTAINER_STATUS_CODES.Stopped, name);
  }

  return {
    name,
    appdataDir: `${options.appsDir}/${name}` as AppdataDir<Name>,
  };
}
