import { assertEquals } from "../../../../../test/deps.ts";
import { calculateAppDirSegments } from "./calculate-app-dir-segments.ts";
import { s } from "../../../deps.ts";
import { AbsolutePath } from "../../absolute-path.ts";

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
