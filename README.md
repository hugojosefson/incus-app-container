# incus-app-container

Opinionated script for creating Incus containers for apps.

| 🚧️👷 Under construction 👷🚧️ |
| ---------------------------- |

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

### ...or maybe...?

- Put each app's configuration (ip(s), extra bind-mounts, image, etc) in a
  `<appName>/incus-app-container.yml` file in the app's subdirectory.
- The app container has a subdirectory `<appName>/appdata/` mounted as
  `/appdata` inside the container, so it can't reach its own configuration.
- No scripts to run, just an always running container that watches the `apps/`
  directory for changes, and:
  - creates+starts new incus app containers for each new subdirectory it finds
    with an `incus-app-container.yml` file,
  - updates existing incus app containers when their `incus-app-container.yml`
    changes,
  - deletes incus app containers for subdirectories that are deleted,
  - stops (doesn't start) containers if they have file `<appName>/disabled`.
- The service keeps track of its own containers by setting a label on them, and
  only manages containers with that label.
- Each `docker-compose.yml` is by default prepared with a service that keeps its
  docker images up to date. It's a third-party tool, called
  [Watchtower](https://containrrr.dev/watchtower/).
- Inside each incus app container, there's a service that watches the
  `docker-compose.yml` file for changes, and reloads the app when it changes.

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

## Utils for testing

```sh
watch -n0.2 docker ps
```

```sh
watch -n0.2 'ps -ef | grep -v "ps -ef"'
```

```sh
service docker-compose-watchdog stop
```

```sh
killall inotifyd
```

```sh
docker-compose-watchdog
```

```sh
killall -HUP docker-compose-watchdog
```

## License

[MIT](LICENSE)
