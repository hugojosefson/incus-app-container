# incus-app-container

Opinionated script for creating Incus containers for apps.

I see this as a successor to
[proxmox-create-docker-ct](https://github.com/hugojosefson/proxmox-create-docker-ct).

## My use case

- Have an `apps` directory on the TrueNAS SCALE server.
- Each container/app:
  - Has a subdirectory in `apps`, with the app's name.
    - It contains the app's `docker-compose.yml` file.
    - It is bind mounted inside the container as `/appdata`.
  - Has `docker-compose` installed, and runs the app via its
    `docker-compose.yml`.
  - Watches the `docker-compose.yml` file for changes, and restarts the app when
    it changes.
  - Is exposed on the network with a static IP, or DHCP.
- CLI script(s) to easily create a new container/app.
  - Sets up a new subdirectory in `apps`.
  - Copies a template `docker-compose.yml` into the new subdirectory.
  - Creates a new container with:
    - a static IP, or DHCP;
    - the new subdirectory as the bind mount;
    - automatic updates of os packages;
    - automatic updates of docker images;
  - Starts the container.
- The containers I create are compatible with Incus' normal tools, and with
  `incus-ui-canonical`.

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
  | tar -xzvC /usr/local/bin --wildcards "*/usr_local_bin/" --strip-components=2
```

## License

[MIT](LICENSE)
