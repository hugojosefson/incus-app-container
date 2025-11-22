import { outdent, run } from "../../../deps.ts";
import { die } from "../../die.ts";

export async function addZabblyRepo(): Promise<void> {
  const key = await fetch("https://pkgs.zabbly.com/key.asc").then((r) =>
    r.text()
  );
  const fingerprint = await run("gpg --show-keys --fingerprint", {
    stdin: key,
  });
  if (
    !fingerprint.includes("4EFC 5906 96CB 15B8 7C73  A3AD 82CC 8797 C838 DCFD")
  ) {
    die(
      "The fingerprint of the zabbly repository key does not match the expected value",
    );
  }

  await Deno.mkdir("/etc/apt/keyrings", { recursive: true });
  await Deno.writeTextFile("/etc/apt/keyrings/zabbly.asc", key);

  const { VERSION_CODENAME } = Object.fromEntries(
    (await Deno.readTextFile("/etc/os-release"))
      .split("\n")
      .map((line) => line.split("=", 2)),
  );
  const architecture = await run(["dpkg", "--print-architecture"]);
  await Deno.mkdir("/etc/apt/sources.list.d", { recursive: true });
  await Deno.writeTextFile(
    "/etc/apt/sources.list.d/zabbly-incus-stable.sources",
    outdent`
      Enabled: yes
      Types: deb
      URIs: https://pkgs.zabbly.com/incus/stable
      Suites: ${VERSION_CODENAME}
      Components: main
      Architectures: ${architecture}
      Signed-By: /etc/apt/keyrings/zabbly.asc
    `,
  );

  await run(["apt-get", "update"]);
}
