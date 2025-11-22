import { assertEquals } from "@std/assert";
import { calculateAppDirSegments } from "./calculate-app-dir-segments.ts";
import { s } from "@hugojosefson/fns/string/s";
import { AbsolutePath } from "../../things/absolute-path.ts";

const cases = [
  ["/mnt/apps", "/mnt/apps/app1", ["app1"]],
  ["/mnt/apps", "/mnt/apps/app1/app2", ["app1", "app2"]],
  ["/mnt/apps", "/mnt/apps/app1/app2/app3", ["app1", "app2", "app3"]],
] as [AbsolutePath, AbsolutePath, string[]][];

for (const [appsDir, appDir, expected] of cases) {
  Deno.test(`calculateAppDirSegments(${appsDir}, ${appDir}) => ${s(expected)}`, () =>
    assertEquals(
      calculateAppDirSegments(appsDir)(appDir),
      expected,
    ));
}
