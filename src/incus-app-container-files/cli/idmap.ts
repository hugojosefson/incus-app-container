import { isNumber } from "@hugojosefson/fns/number/is-number";
import { AbsolutePath } from "./things/absolute-path.ts";

export const IDMAP_BASE_MIN = 100_000;
export const IDMAP_BASE_SIZE = 100_000;

/**
 * How to keep track of next id numbers chunk?
 *
 *     - check owner/group of existing app dirs (immediate subdirs of apps)
 *     - minimum: {@link IDMAP_BASE_MIN}
 *     - if directory already has IDMAP_BASE_MIN => uid===gid, then use that
 *     - based on the highest uid or gid that owns an immediate subdirectory of apps, choose the next even million that is at least {@link IDMAP_BASE_SIZE} larger than the existing.
 * @param appsDir the directory where app directories are stored
 * @param appDir the directory of the app
 */
export async function getIdmapBaseFor<AppsDir extends AbsolutePath>(
  appsDir: AppsDir,
  appDir: `${AppsDir}/${string}`,
): Promise<number> {
  const currentIds = await Deno.stat(appDir);
  if (
    isNumber(currentIds.uid) && currentIds.uid === currentIds.gid &&
    currentIds.uid >= IDMAP_BASE_MIN
  ) {
    return currentIds.uid;
  }

  let maxId = 0;
  for await (const entry of Deno.readDir(appsDir)) {
    if (entry.isDirectory) {
      const { uid, gid } = await Deno.stat(`${appsDir}/${entry.name}`);
      maxId = Math.max(maxId, uid ?? 0, gid ?? 0);
    }
  }
  return getNextIdmapBaseAbove(maxId);
}

/**
 * choose the next even million that is at least {@link IDMAP_BASE_SIZE} larger than the existing
 * @param existingMaxId any existing maximum id
 * @returns the next even million that is at least {@link IDMAP_BASE_SIZE} larger than the existing
 */
export function getNextIdmapBaseAbove(existingMaxId: number): number {
  return Math.max(
    IDMAP_BASE_MIN,
    Math.ceil(existingMaxId / IDMAP_BASE_SIZE + 1) * IDMAP_BASE_SIZE,
  );
}
