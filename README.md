# incus-app-container

Opinionated script for creating Incus containers for apps.

| 🚧️👷 Under construction 👷🚧️ |
| ---------------------------- |

I see this as a successor to my
[proxmox-create-docker-ct](https://github.com/hugojosefson/proxmox-create-docker-ct),
that did a similar thing for Proxmox VE.

## Features

- Creates Incus containers for running Docker Compose applications
- Each app has its own subdirectory with `appdata/` mounted at `/appdata` in the
  container
- Automatically watches `docker-compose.yml` for changes and restarts when
  updated
- Containers can use static IP or DHCP networking
- CLI commands for infrastructure management:
  - `setup-incus` - Setup Incus on the host machine
  - `setpoint` - Calculate desired container state from app configurations
  - `ensure-vlan` - Manage VLAN interfaces
- Compatible with standard Incus tools and `incus-ui-canonical`

## Configuration

Each app directory can contain an `incus-app-container.*` config file in one of
these formats: `.toml`, `.yaml`, `.json`, `.ts`, or `.js`.

### Configuration options

| Option      | Description                                       |
| :---------- | :------------------------------------------------ |
| name        | Container name                                    |
| ip          | Static IP address, or "dhcp" for dynamic IP       |
| gateway     | Network gateway address                           |
| nameserver  | DNS nameserver address                            |
| vlan        | VLAN ID for network isolation                     |
| bridgeName  | Network bridge device name                        |
| sshKey      | SSH public key for authentication                 |
| sshServer   | SSH server configuration                          |
| running     | Whether container should be started automatically |
| diskSize    | Container disk size                               |
| image       | Base image to use                                 |
| description | Human-readable container description              |

### Security features

- Isolated ID mapping for process separation
- Container nesting support for running Docker
- SSH key authentication (no password authentication)

### Container setup

Each container includes:

- Docker and Docker Compose pre-installed
- `docker-compose.yml` template in `/appdata`
- Systemd service that watches for `docker-compose.yml` changes and
  automatically reloads

## Prerequisites

- A working server with one of
  - TrueNAS SCALE 23.10.2 or later, or
  - Debian 12.5 or later.
- `root` access on the server.
- One empty block device for the storage pool.
- An existing bridge network interface, for the containers to use, or a network
  interface in `/etc/network/interfaces` with `dhcp`, that we can convert.
- A subnet or several, to expose the containers on.

## Install incus-app-container

```sh
curl -sSfL https://github.com/hugojosefson/incus-app-container/tarball/main \
  | tar -xzv --wildcards "*/src/" --strip-components=2
```

## Commands

### setup-incus

Setup Incus on the host machine. Handles installation, storage pool
configuration, and bridge network setup.

```sh
./incus-app-container setup-incus --help
```

Options:

- `--pool-disk <device>` - Empty block device for the storage pool (default:
  `/dev/vdb`)
- `--bridge-name <name>` - Name of the network bridge device
- `--bridge-cidr <ip/net>` - IP/net or 'dhcp' to use for the bridge (default:
  `dhcp`)
- `--dry-run` - Output the preseed configuration without applying changes

### setpoint

Calculate and display the desired container state based on configuration files
in the apps directory. Scans for `incus-app-container.*` config files and
generates a setpoint representing all containers that should exist.

```sh
./incus-app-container setpoint --help
```

Options:

- `--apps-dir <path>` - Base directory containing app configurations (default:
  `/srv`)
- `--wrap` - Wrap output in a JSON object (default: `true`)

The setpoint includes:

- Container definitions derived from config files
- VLAN requirements for networking
- Complete configuration for desired infrastructure state

### ensure-vlan

Ensure a VLAN interface exists and is configured. Manages
`/etc/network/interfaces.d/` configuration files and brings VLAN interfaces up
or down as needed.

```sh
./incus-app-container ensure-vlan --help
```

Required options:

- `--bridge-name <name>` - Name of the network bridge device
- `--vlan <id>` - VLAN ID to create
- `--file <path>` - Path to the `/etc/network/interfaces.d/` file to write

Optional:

- `--dry-run` - Show what would be done without making changes

## License

[MIT](LICENSE)
