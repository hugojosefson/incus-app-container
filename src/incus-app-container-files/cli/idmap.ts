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
 * Assign unique idmap bases for all app directories.
 *
 * First pass: directories with uid===gid>=IDMAP_BASE_MIN get that value (stable).
 * Second pass: remaining directories get sequential ranges above the highest existing id.
 *
 * @param appsDir the parent directory containing all app directories
 * @returns a Map of app directory paths to their assigned idmap base
 */
export async function getAllIdmapBases<AppsDir extends AbsolutePath>(
  appsDir: AppsDir,
): Promise<Map<`${AppsDir}/${string}`, number>> {
  const results = new Map<`${AppsDir}/${string}`, number>();
  let maxId = 0;

  // First pass: collect stable bases and compute maxId
  const dirEntries: {
    name: string;
    fullPath: `${AppsDir}/${string}`;
    uid: number | null;
    gid: number | null;
  }[] = [];
  for await (const entry of Deno.readDir(appsDir)) {
    if (entry.isDirectory) {
      const fullPath = `${appsDir}/${entry.name}` as `${AppsDir}/${string}`;
      const { uid, gid } = await Deno.stat(fullPath);
      dirEntries.push({ name: entry.name, fullPath, uid, gid });
      maxId = Math.max(maxId, uid ?? 0, gid ?? 0);
    }
  }

  // Second pass: assign stable bases
  for (const dir of dirEntries) {
    if (
      isNumber(dir.uid) && dir.uid === dir.gid &&
      dir.uid >= IDMAP_BASE_MIN
    ) {
      results.set(dir.fullPath, dir.uid);
    }
  }

  // Third pass: assign sequential fallback bases
  let nextBase = getNextIdmapBaseAbove(maxId);
  for (const dir of dirEntries) {
    if (!results.has(dir.fullPath)) {
      results.set(dir.fullPath, nextBase);
      nextBase = getNextIdmapBaseAbove(nextBase);
    }
  }

  return results;
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
