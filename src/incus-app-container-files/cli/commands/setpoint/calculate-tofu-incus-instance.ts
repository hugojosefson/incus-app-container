import { dedent } from "@std/text/unstable-dedent";
import { stringify } from "@std/yaml";
import { AbsolutePath } from "../../things/absolute-path.ts";
import { BridgeName } from "../../things/bridge-name.ts";
import {
  CloudInitNetworkConfig,
  createCloudInitNetworkConfig,
} from "../../cloud-init-network-config.ts";
import { CloudInitUserConfig } from "../../cloud-init-user-config.ts";
import {
  CloudInitVendorConfig,
  createCloudInitVendorConfig,
} from "../../cloud-init-vendor-config.ts";
import {
  calculateNicParentName,
  calculateNicType,
  NicParentName,
  NicType,
} from "../../things/nic.ts";
import { Vlan } from "../../things/vlan.ts";

import { CreateAppContainerOptions } from "./calculate-setpoint.ts";
import {
  TofuIncusDevice,
  TofuIncusFile,
  TofuIncusInstance,
} from "./tofu-incus-instance.ts";

export type HostVlan<
  BN extends BridgeName,
  V extends Vlan,
> = {
  bridgeName: BN;
  vlan: V;
  ifaceFilePath: `/etc/network/interfaces.d/${NicParentName<BN, V>}`;
};

export type AppDir<Name extends string> = `${string | ""}/apps/${Name}`;
export type AppDataDir<Name extends string> = `${
  | string
  | ""}/apps/${Name}/appdata`;

export function calculateTofuIncusInstance<
  AppsDir extends AbsolutePath,
  Name extends string,
>(
  options: CreateAppContainerOptions<AppsDir, Name>,
): [TofuIncusInstance, HostVlan<BridgeName, Vlan>[]] {
  const appDir = `${options.appsDir}/${options.name}` as AppDir<Name>;
  const appDataDir = `${appDir}/appdata` as AppDataDir<Name>;
  const hostVlans: HostVlan<BridgeName, Vlan>[] = [];
  const nics: TofuIncusDevice<"nic">[] = [];

  const nicType: NicType = calculateNicType(options.vlan);
  const nicParentName: NicParentName<BridgeName, Vlan> = calculateNicParentName(
    options.bridgeName,
    options.vlan,
  );

  nics.push({
    name: "eth0",
    type: "nic",
    properties: {
      nictype: nicType,
      parent: nicParentName,
    },
  });

  if (options.vlan && options.bridgeName) {
    hostVlans.push({
      bridgeName: options.bridgeName,
      vlan: options.vlan,
      ifaceFilePath: `/etc/network/interfaces.d/${nicParentName}`,
    });
  }

  const vendorConfig: CloudInitVendorConfig = createCloudInitVendorConfig(
    options,
  );

  const userConfig: CloudInitUserConfig = options.sshServer
    ? {
      ssh_authorized_keys: options.sshKey,
    }
    : {};

  const networkConfig: CloudInitNetworkConfig = createCloudInitNetworkConfig(
    options,
  );

  const dockerComposeFile = `/appdata/docker-compose.yml`;
  const networkMotdFile: TofuIncusFile = {
    target_path: "/etc/update-motd.d/80-network",
    mode: "0755",
    content: dedent`
      #!/bin/sh
      set -e
      echo "----------------------------------------------------------------------"
      ip a | grep -E '(^[^ ]|\\binet6? [^ ]+)'
      echo "----------------------------------------------------------------------"
    `,
  };
  const onFirstBootFile: TofuIncusFile = {
    target_path: "/usr/bin/on-first-boot",
    mode: "0755",
    content: dedent`
      #!/usr/bin/env bash
      set -euo pipefail
      IFS=$'\\n\\t'

      # Update packages
      apt-get update
      apt-get full-upgrade -y --purge --auto-remove

      # Install critical packages
      apt-get install -y curl inotify-tools podman podman-docker bash

      # Enable critical services
      systemctl daemon-reload
      systemctl enable --now docker-compose
      systemctl enable --now docker-compose-watchdog

      # Install extra packages
      apt-get install -y unattended-upgrades byobu neovim bash-completion

      # Set default vim to neovim
      update-alternatives --set vim "$(command -v nvim)"

      # ${options.sshServer ? "Install" : "Remove"} openssh-server
      apt-get ${options.sshServer ? "install" : "remove"} -y openssh-server
    `,
  };
  const files: TofuIncusFile[] = [
    networkMotdFile,
    onFirstBootFile,
    {
      target_path: "/usr/bin/docker-compose-service-wait-for-docker-engine",
      mode: "0755",
      content: dedent`
        #!/usr/bin/env bash
        set -euo pipefail
        IFS=$'\\n\\t'

        ################################################################################
        # Waits for the container engine to be ready.
        ################################################################################

        if /usr/bin/docker info 2>/dev/null >/dev/null; then
          echo "Container engine is ready"
          exit 0
        fi

        echo "Waiting for Docker daemon to be ready..."

        /usr/bin/timeout 15 sh -c "until /usr/bin/docker info 2>/dev/null >/dev/null; do sleep 1; done;"
        if [[ $? -eq 0 ]]; then
          echo "Container engine is now ready"
          exit 0
        fi

        echo "Container engine is still not ready"
        exit 1
      `,
    },
    {
      target_path: "/usr/bin/docker-compose-service-stop",
      mode: "0755",
      content: dedent`
        #!/usr/bin/env bash
        set -euo pipefail
        IFS=$'\\n\\t'

        ################################################################################
        # Used by the docker-compose service to stop the docker compose stack.
        # If the docker compose file is not readable, it will remove all containers.
        ################################################################################

        if [[ ! -r "${dockerComposeFile}" ]]; then
          /usr/bin/podman rm --all --force
          exit 0
        fi

        /usr/bin/docker-compose --file "${dockerComposeFile}" down

      `,
    },
    {
      target_path: "/usr/bin/docker-compose-watchdog",
      mode: "0755",
      content: dedent`
        #!/bin/sh
        set -e

        ################################################################################
        # Watches the ${dockerComposeFile} file for changes and reloads the
        # docker-compose service when it does.
        #
        # This script is intended to be run by the docker-compose-watchdog service.
        ################################################################################

        docker_compose_file="${dockerComposeFile}"
        inotifywait_max_wait="60"
        previous_hash=""
        current_hash=""
        inotifywait_pid=""
        shutting_down=""

        handle_signal() {
          shutting_down="true"
          if [ -n "\${inotifywait_pid}" ]; then
            echo "Received signal, terminating inotifywait" >&2
            kill "\${inotifywait_pid}"
            wait "\${inotifywait_pid}" || true
          fi
          exit 0
        }
        trap handle_signal HUP INT TERM QUIT ABRT KILL

        get_hash() {
          if ! [ -r "\${docker_compose_file}" ]; then
            echo "N/A"
          else
            sha256sum "\${docker_compose_file}" | cut -d' ' -f1
          fi
        }

        is_still_the_same_hash() {
          current_hash="\$(get_hash)"
          if [ "\${current_hash}" = "\${previous_hash}" ]; then
            previous_hash="\${current_hash}"
            return 0
          else
            previous_hash="\${current_hash}"
            return 1
          fi
        }

        has_the_file_changed() {
          ! is_still_the_same_hash
        }

        main() {
          while true; do
            if has_the_file_changed; then
              docker-compose-reload
              sleep 1
              continue
            fi

            if [ -r "\${docker_compose_file}" ]; then
              inotifywait --timeout "\${inotifywait_max_wait}" --event modify --event attrib --event move_self --event delete_self --event unmount "\${docker_compose_file}" &
              inotifywait_pid="\$!"
              echo "Waiting up to \${inotifywait_max_wait} seconds for changes to \${docker_compose_file} in inotifywait pid \${inotifywait_pid}" >&2
              wait "\${inotifywait_pid}"
              echo "inotifywait terminated" >&2
              if [ -n "\${shutting_down}" ]; then
                echo "Breaking wait loop because we're shutting down" >&2
                break
              fi
              echo "Clearing inotifywait pid" >&2
              inotifywait_pid=""
            else
              sleep 1
            fi
          done
          echo "Exited main loop" >&2
        }

        main "\$@"
      `,
    },
    {
      target_path: "/usr/bin/docker-compose-reload",
      mode: "0755",
      content: dedent`
        #!/bin/sh
        set -e

        ################################################################################
        # Makes sure that the docker-compose service is running and up-to-date with any
        # ${dockerComposeFile} file.
        #
        # Takes down the service if the file is not readable. If the file is not ok, it
        # does nothing.
        #
        # This script is intended to be run by the docker-compose-watchdog service.
        ################################################################################

        docker_compose_file="${dockerComposeFile}"

        is_docker_compose_running() {
          systemctl is-active docker-compose --quiet
        }

        is_docker_compose_file_readable() {
          test -r "\${docker_compose_file}"
        }

        is_docker_compose_file_ok() {
          docker-compose -f "\${docker_compose_file}" config --quiet
        }

        main() {
          if ! is_docker_compose_file_readable; then
            service docker-compose stop
            return 0
          fi

          if ! is_docker_compose_file_ok; then
            return 0
          fi

          if ! is_docker_compose_running; then
            service docker-compose start
            return 0
          fi

          service docker-compose reload
        }

        main "\$@"
      `,
    },
    {
      target_path: "/etc/systemd/system/on-first-boot.service",
      mode: "0755",
      content: dedent`
        [Unit]
        Description=Run on first boot
        Before=systemd-user-sessions.service
        Wants=network-online.target
        After=network-online.target
        ConditionPathExists=!/usr/bin/on-first-boot.done

        [Service]
        Type=oneshot
        ExecStart=/usr/bin/on-first-boot
        ExecStartPost=/usr/bin/touch /usr/bin/on-first-boot.done
        RemainAfterExit=yes

        [Install]
        WantedBy=multi-user.target
      `,
    },
    {
      target_path: "/etc/systemd/system/docker-compose.service",
      mode: "0755",
      content: dedent`
        [Unit]
        Description=Docker Compose Application Service
        After=podman.socket
        Requires=podman.socket

        [Service]
        Environment=docker_compose_file=${dockerComposeFile}
        ExecStartPre=/usr/bin/docker-compose-service-wait-for-docker-engine
        ExecStartPre=/usr/bin/docker-compose --file "\${docker_compose_file}" config --quiet
        ExecReload=/usr/bin/docker-compose   --file "\${docker_compose_file}" config --quiet
        ExecStart=/usr/bin/docker-compose    --file "\${docker_compose_file}" up --remove-orphans
        ExecReload=/usr/bin/docker-compose   --file "\${docker_compose_file}" up --remove-orphans --detach
        ExecStop=/usr/bin/docker-compose-service-stop
        Restart=always

        [Install]
        WantedBy=multi-user.target
      `,
    },
    {
      target_path: "/etc/systemd/system/docker-compose-watchdog.service",
      mode: "0755",
      content: dedent`
        [Unit]
        Description=Keeps an instance of docker-compose-watchdog running

        [Service]
        ExecStart=/usr/bin/docker-compose-watchdog
        Restart=always
        KillSignal=SIGHUP
        KillMode=mixed
        TimeoutStopSec=5

        [Install]
        WantedBy=multi-user.target
      `,
    },
  ];
  const tofuIncusInstance: TofuIncusInstance = {
    name: options.name,
    description: "By incus-app-container",
    image: options.imageUri,
    running: options.running,
    profiles: ["incus-app-container"],
    devices: [
      ...nics,
      {
        name: "root",
        type: "disk",
        properties: {
          path: "/",
          pool: "default",
          size: options.diskSize,
        },
      },
      {
        name: "appdata-bind-mount",
        type: "disk",
        properties: {
          source: appDataDir,
          path: "/appdata",
        },
      },
    ],
    config: {
      "security.idmap.isolated": true,
      "security.idmap.base": options.idmapBase,
      "security.idmap.size": options.idmapSize,
      "security.nesting": true,
      "cloud-init.user-data": "#cloud-config\n" + stringify(userConfig),
      "cloud-init.vendor-data": "#cloud-config\n" +
        stringify(vendorConfig),
      "cloud-init.network-config": stringify(networkConfig),
    },
    files,
  };
  const result: [TofuIncusInstance, HostVlan<BridgeName, Vlan>[]] = [
    tofuIncusInstance,
    hostVlans,
  ];
  return result;
}
