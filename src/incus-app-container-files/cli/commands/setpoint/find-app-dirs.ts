import {
  DEFAULT_CONFIG_FILE_LOADERS,
  exists,
  pFilter,
  s,
} from "../../../deps.ts";
import { AbsolutePath, isAbsolutePath } from "../../absolute-path.ts";

const CONFIG_FILE_EXTENSIONS = Object.keys(DEFAULT_CONFIG_FILE_LOADERS);

function getPossibleConfigFilePaths(
  directory: AbsolutePath,
): AbsolutePath[] {
  return CONFIG_FILE_EXTENSIONS.map((extension) =>
    `${directory}/incus-app-container.${extension}` as AbsolutePath
  );
}

function getPossibleDockerComposeFilePaths(
  directory: AbsolutePath,
): AbsolutePath[] {
  return [
    "yml",
    "yaml",
    "json",
  ].map((extension) =>
    `${directory}/docker-compose.${extension}` as AbsolutePath
  );
}

async function directoryHasAnyConfigFile(
  directory: AbsolutePath,
): Promise<boolean> {
  if (!(await exists(directory, { isDirectory: true }))) {
    return false;
  }
  const possibleConfigFilePaths = getPossibleConfigFilePaths(directory);
  return (await pFilter(possibleConfigFilePaths, (path) => exists(path)))
    .length > 0;
}

async function directoryHasAnyDockerComposeFile(
  directory: AbsolutePath,
): Promise<boolean> {
  if (!(await exists(directory, { isDirectory: true }))) {
    return false;
  }
  const possibleDockerComposeFilePaths = getPossibleDockerComposeFilePaths(
    directory,
  );
  return (await pFilter(possibleDockerComposeFilePaths, (path) => exists(path)))
    .length > 0;
}

/**
 *  Builds a list of apps, by scanning the appsDirectory recursively.
 *  When it encounters an incus-app-container.${CONFIG_FILE_EXTENSIONS} file in a directory, it considers that directory an app, and doesn't traverse it any deeper.
 *  When it encounters a directory named "appdata", or a file named "docker-compose.{yml,yaml,json}", it considers its parent directory a likely disabled app, and doesn't traverse it any deeper.
 *  This function is recursive, and will call itself on subdirectories.
 *
 *  Does NOT read the config files, just returns the directory names.
 *
 * @param appsDir the directory where app directories are stored
 * @returns a list of directories that are apps (have an `incus-app-container.${CONFIG_FILE_EXTENSIONS}` file)
 */
export async function* findAppDirs<
  AppsDir extends AbsolutePath,
>(appsDir: AppsDir): AsyncGenerator<AbsolutePath> {
  if (await directoryHasAnyConfigFile(appsDir)) {
    if (!isAbsolutePath(appsDir)) {
      throw new Error(
        `Expected absolute path for apps-dir, but got ${s(appsDir)}`,
      );
    }
    yield appsDir as AbsolutePath;
    return;
  }

  for await (const entry of Deno.readDir(appsDir)) {
    if (!entry.isDirectory) {
      continue;
    }

    if (entry.name === "appdata") {
      continue;
    }

    if (entry.name.startsWith(".")) {
      continue;
    }

    const potentialAppDir = `${appsDir}/${entry.name}` as AbsolutePath;

    if (await directoryHasAnyConfigFile(potentialAppDir)) {
      yield potentialAppDir;
      continue;
    }

    if (await directoryHasAnyDockerComposeFile(potentialAppDir)) {
      continue;
    }

    yield* findAppDirs(potentialAppDir);
  }
}

if (import.meta.main) {
  const appsDir = new URL(Deno.args[0], import.meta.url).pathname;
  if (!isAbsolutePath(appsDir)) {
    throw new Error(
      `Expected absolute path for apps-dir, but got ${s(appsDir)}`,
    );
  }
  for await (const appDir of findAppDirs(appsDir)) {
    console.log(appDir);
  }
}
