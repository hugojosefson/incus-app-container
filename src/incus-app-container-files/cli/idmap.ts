import { AbsolutePath } from "./absolute-path.ts";

export const IDMAP_BASE_MIN = 100_000;
export const IDMAP_BASE_SIZE = 100_000;

/**
 * How to keep track of next id numbers chunk?
 *
 *     - check owner/group of existing app dirs (immediate subdirs of apps)
 *     - minimum: {@link IDMAP_BASE_MIN}
 *     - based on the highest uid or gid that owns an immediate subdirectory of apps, choose the next even million that is at least {@link IDMAP_BASE_SIZE} larger than the existing.
 * @param appsDir the directory where app directories are stored
 */
export async function getNextIdmapBaseFor(
  appsDir: AbsolutePath,
): Promise<number> {
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
