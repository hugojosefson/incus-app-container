# incus-app-container

Opinionated script for creating Incus containers for apps.

| 🚧️👷 Under construction 👷🚧️ |
| ---------------------------- |

I see this as a successor to my
[proxmox-create-docker-ct](https://github.com/hugojosefson/proxmox-create-docker-ct),
that did a similar thing for Proxmox VE.

## My use case / Features included

- [x] You have an `apps` directory on the TrueNAS SCALE server.
- [x] Each container/app:
  - [x] Has a subdirectory in `apps`, with the app's name.
    - [x] It has a subdirectory `appdata` inside it, for the app's data.
      - [x] It contains the app's `docker-compose.yml` file.
      - [x] It is bind mounted inside the container as `/appdata`.
  - [x] Has `docker-compose` installed, and runs the app via its
        `/appdata/docker-compose.yml`.
  - [x] Watches the `docker-compose.yml` file for changes, and restarts the app
        when it changes.
  - [x] Is exposed on the network with a static IP, or DHCP.
- [x] CLI script(s) to easily create a new container/app.
  - [x] Sets up a new subdirectory in `apps`.
  - [x] Puts an example `docker-compose.yml` into the new subdirectory's
        `appdata` directory.
  - [x] Creates a new container with:
    - [x] a static IP, or DHCP;
    - [x] the new subdirectory as the bind mount;
    - [x] automatic updates of os packages;
    - [x] automatic updates of docker images;
  - [x] Starts the container (optionally).
- [x] The containers I create are compatible with Incus' normal tools, and with
      `incus-ui-canonical`.

<details>
<summary>...or maybe...? (click to expand)</summary>

- [ ] Put each app's configuration (ip(s), extra bind-mounts, image, etc) in a
      `<appName>/incus-app-container.yml` file in the app's subdirectory.
- [x] The app container has a subdirectory `<appName>/appdata/` mounted as
      `/appdata` inside the container, so it can't reach its own configuration.
- [ ] No scripts to run, just an always running container (or service?) that
      watches the `apps/` directory and `incus-app-container.yml` files for
      changes, and:
  - [ ] creates+starts new incus app containers for each new subdirectory it
        finds with an `incus-app-container.yml` file,
  - [ ] relies on an `apps/incus-app-container.tf` file to be written such that
        it dynamically creates/updates/deletes incus app container resources for
        only each subdirectory it finds with an `incus-app-container.yml` file,
  - [ ] watches incus for changes with
        `incus monitor --type=lifecycle --type=operation --format=json`
  - [ ] when `incus monitor` reports anything:
    - [ ] `tofu apply -auto-approve -compact-warnings -concise`
- [ ] The service keeps track of its own containers via OpenTofu's state, stored
      in `apps/incus-app-container.tfstate`.
- [ ] The service brands its containers with an empty
      [profile](https://linuxcontainers.org/incus/docs/main/profiles/) on them,
      so the user can see clearly which containers are owned by
      `incus-app-container`.
- [x] ~~Each `docker-compose.yml` is by default prepared with a service that
      keeps its docker images up to date. It's a third-party tool, called
      [Watchtower](https://containrrr.dev/watchtower/).~~
- [x] Updates the images automatically, using Podman's built-in image updater.
- [x] Inside each incus app container, there's a service that watches the
      `docker-compose.yml` file for changes, and reloads the app when it
      changes.

</details>

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

<details>
<summary>Utils for testing inside an incus container (click to expand)</summary>

```sh
# watch running docker containers
watch -n0.2 docker ps
```

```sh
# watch the processes inside the container
watch -n0.2 'ps -ef | grep -v "ps -ef"'
```

```sh
# run the watchdog manually
service docker-compose-watchdog stop
docker-compose-watchdog
```

```sh
# ask the watchdog to stop
killall -HUP docker-compose-watchdog
```

</details>

## Install incus

```sh
./incus-app-container setup-incus --help
```

## License

[MIT](LICENSE)
