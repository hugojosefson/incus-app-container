import { AbsolutePath } from "../../things/absolute-path.ts";
import { s } from "@hugojosefson/fns/string/s";

export function calculateAppDirSegments<AppsDir extends AbsolutePath>(
  appsDir: AppsDir,
): (appDir: AbsolutePath) => string[] {
  return function (appDir: AbsolutePath): string[] {
    if (appDir === appsDir) {
      return [];
    }
    if (!appDir.startsWith(appsDir)) {
      throw new Error(
        `Expected appDir to be a subdirectory of appsDir, but got ${
          s({ appDir, appsDir })
        }`,
      );
    }
    const relativeAppDir = appDir.slice(appsDir.length + 1);
    return relativeAppDir.split("/");
  };
}
