import { isSshKeyRaw, PromiseOr, SshKeyRaw } from "./cli.ts";
import { AsyncGetterOr, isPrefixedUsername } from "./cli.ts";
import { SshKey } from "./cli.ts";
import { defaultRunOptions, dirname, run } from "./deps.ts";
import { readFromUrl } from "./read-from-url.ts";
import { stringify as yaml } from "https://deno.land/std@0.218.2/yaml/stringify.ts";
import IPCIDR from "npm:ip-cidr@4.0.0";

async function readInstallScript(baseFilename: string): Promise<string> {
  const url = new URL(
    `template/${baseFilename}-install`,
    import.meta.url,
  );
  try {
    return await readFromUrl(url);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(
        `Could not find install script for ${baseFilename}.
It should be at ${url}.
Only install scripts in ${dirname(url.toString())}/ are supported.`,
      );
    }
    throw e;
  }
}

export async function resolveMultiArgument<T>(
  multiArgument: MultiArgument<T>,
): Promise<T[]> {
  multiArgument = await multiArgument;
  if (multiArgument === undefined) {
    return [];
  }
  if (typeof multiArgument === "function") {
    return resolveMultiArgument(multiArgument());
  }
  if (multiArgument instanceof Set) {
    return resolveMultiArgument([...multiArgument]);
  }
  if (Array.isArray(multiArgument)) {
    return await Promise.all(multiArgument.map(resolveMultiArgument)) as T[];
  }
  return [multiArgument] as T[];
}

export type MultiArgument<T> = AsyncGetterOr<
  Readonly<T[] | Set<T> | T> | undefined
>;

export type PasswdRow = {
  username: string;
  password: string;
  uid: number;
  gid: number;
  gecos: string;
  home: string;
  shell: string;
};

export function parsePasswdRow(row: string): PasswdRow {
  const [
    username,
    password,
    uid,
    gid,
    gecos,
    home,
    shell,
  ] = row.split(":");
  return {
    username,
    password,
    uid: Number(uid),
    gid: Number(gid),
    gecos,
    home,
    shell,
  };
}

export async function getPasswdRowOfLocalUser(
  username: string,
): Promise<PasswdRow> {
  const passwd = await run(["getent", "passwd", username]);
  return parsePasswdRow(passwd);
}

export function parseSshKeyFile(contents: string): SshKeyRaw[] {
  return contents
    .split("\n")
    .filter(isSshKeyRaw)
    .map((k) => k as SshKeyRaw);
}

export async function readTextFiles(
  dir: string,
  filePredicate: (
    file: Deno.DirEntry & { isFile: true },
  ) => PromiseOr<boolean> = () => true,
): Promise<string[]> {
  const entries = [];
  for await (const file of Deno.readDir(dir)) {
    entries.push(file);
  }
  const files = entries
    .filter((file) => file.isFile)
    .map((file) => file as typeof file & { isFile: true });

  const filesToRead = files.map((file) => [filePredicate(file), file] as const);
  const filesContent = filesToRead.map(async ([predicateResponse, file]) =>
    (await predicateResponse) ? [Deno.readTextFile(`${dir}/${file.name}`)] : []
  );
  return Promise.all((await Promise.all(filesContent)).flat());
}

export async function resolveSshKey(sshKey: SshKey): Promise<SshKeyRaw[]> {
  if (isPrefixedUsername(sshKey)) {
    const [prefix, username] = sshKey.split(":");
    if (prefix === "gh") {
      return parseSshKeyFile(
        await (await fetch(`https://github.com/${username}.keys`))
          .text(),
      );
    }
    if (prefix === "local") {
      const homeDir = (await getPasswdRowOfLocalUser(username)).home;
      return (await readTextFiles(
        `${homeDir}/.ssh`,
        ({ name }) => name.endsWith(".pub"),
      ))
        .map(parseSshKeyFile)
        .flat();
    }
  }
  if (isSshKeyRaw(sshKey)) {
    return [sshKey];
  }
  throw new Error(`Invalid ssh key: ${sshKey}`);
}

export async function resolveSshKeys(sshKeyArg: MultiArgument<SshKey>): Promise<
  SshKeyRaw[]
> {
  const sshKeys = await resolveMultiArgument(sshKeyArg);
  return (await Promise.all(sshKeys.map(resolveSshKey))).flat();
}

type AppContainerCreateOptions = {
  name: string;
  cidr: string;
  sshKey: MultiArgument<SshKey>;
};

export async function createAppContainer(
  options: AppContainerCreateOptions,
): Promise<{ appdataDir: string }> {
  const installScript = await readInstallScript("alpine-318");
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
      mode: "reboot",
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
    "via-script",
    "root",
    `size=${size}`,
  ]);

  return {
    appdataDir:
      `created container ${options.name} successfully, but no appdata dir yet.`,
  };
}
