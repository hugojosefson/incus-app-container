# Roadmap

Future features and improvements being considered for incus-app-container.

## Automated infrastructure management

- [ ] Always-running container or service that could watch the `apps/` directory
      and `incus-app-container.*` config files for changes
- [ ] Automatically create and start new Incus app containers for each new
      subdirectory with an `incus-app-container.*` config file
- [ ] Use `apps/incus-app-container.tf` file that dynamically
      creates/updates/deletes Incus app container resources based on
      subdirectories found
- [ ] Watch Incus for changes using
      `incus monitor --type=lifecycle --type=operation --format=json`
- [ ] When `incus monitor` reports changes, run
      `tofu apply -auto-approve -compact-warnings -concise`

## State management

- [ ] Service could track its own containers via OpenTofu's state stored in
      `apps/incus-app-container.tfstate`

## CLI improvements

- [ ] Interactive configuration wizard for new apps
- [ ] Validation command to check config file syntax before applying

## Additional container features

- [ ] Support for additional bind mounts beyond `/appdata`
- [ ] Support for custom cloud-init user scripts
- [ ] Support for custom systemd units beyond docker-compose
- [ ] Container backup and restore functionality
- [ ] Migration tools for moving containers between hosts
