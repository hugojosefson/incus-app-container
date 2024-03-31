#!/bin/sh
// 2>/dev/null;DENO_VERSION_RANGE="^1.42.0";DENO_RUN_ARGS="--allow-run=cli --allow-env=VERBOSE,NO_COLOR,FORCE_COLOR,TERM,NODE_DISABLE_COLORS,CI";set -e;V="$DENO_VERSION_RANGE";A="$DENO_RUN_ARGS";h(){ [ -x "$(command -v "$1" 2>&1)" ];};g(){ u="$([ "$(id -u)" != 0 ]&&echo sudo||:)";if h brew;then echo "brew install $1";elif h apt;then echo "($u apt update && $u DEBIAN_FRONTEND=noninteractive apt install -y $1)";elif h yum;then echo "$u yum install -y $1";elif h pacman;then echo "$u pacman -yS --noconfirm $1";elif h opkg-install;then echo "$u opkg-install $1";fi;};p(){ q="$(g "$1")";if [ -z "$q" ];then echo "Please install '$1' manually, then try again.">&2;exit 1;fi;eval "o=\"\$(set +o)\";set -x;$q;set +x;eval \"\$o\"">&2;};f(){ h "$1"||p "$1";};w(){ [ -n "$1" ] && "$1" -V >/dev/null 2>&1;};U="$(l=$(printf "%s" "$V"|wc -c);for i in $(seq 1 $l);do c=$(printf "%s" "$V"|cut -c $i);printf '%%%02X' "'$c";done)";D="$(w "$(command -v deno||:)"||:)";t(){ i="$(if h findmnt;then findmnt -Ononoexec,noro -ttmpfs -nboAVAIL,TARGET|sort -rn|while IFS=$'\n\t ' read -r a m;do [ "$a" -ge 150000000 ]&&[ -d "$m" ]&&printf %s "$m"&&break||:;done;fi)";printf %s "${i:-"${TMPDIR:-/tmp}"}";};s(){ deno eval "import{satisfies as e}from'https://deno.land/x/semver@v1.4.1/mod.ts';Deno.exit(e(Deno.version.deno,'$V')?0:1);">/dev/null 2>&1;};e(){ R="$(t)/deno-range-$V/bin";mkdir -p "$R";export PATH="$R:$PATH";s&&return;f curl;v="$(curl -sSfL "https://semver-version.deno.dev/api/github/denoland/deno/$U")";i="$(t)/deno-$v";ln -sf "$i/bin/deno" "$R/deno";s && return;f unzip;([ "${A#*-q}" != "$A" ]&&exec 2>/dev/null;curl -fsSL https://deno.land/install.sh|DENO_INSTALL="$i" sh -s $DENO_INSTALL_ARGS "$v"|grep -iv discord>&2);};e;exec deno run $A "$0" "$@"
import { parseCsv, type ParseOptions, run } from "../deps.ts";
import { InitShutdownScript } from "./init-shutdown-script.ts";
import { parsePart } from "./parse-part.ts";
import {
  isQueryExpectingInitShutdownScripts,
  QueryExpectingInitShutdownScripts,
} from "./query-expecting-init-shutdown-scripts.ts";
import {
  isQueryExpectingSingleValue,
  QueryExpectingSingleValue,
} from "./query-expecting-single-value.ts";
import {
  isQueryExpectingStorageDatasets,
  QueryExpectingStorageDatasets,
} from "./query-expecting-storage-datasets.ts";
import {
  isQueryExpectingStoragePools,
  QueryExpectingStoragePools,
} from "./query-expecting-storage-pools.ts";
import {
  isQueryExpectingVoid,
  QueryExpectingVoid,
} from "./query-expecting-void.ts";
import { StorageDataset } from "./storage-dataset.ts";
import { StoragePool } from "./storage-pool.ts";
import { WithId } from "./with-id.ts";

/**
 * Runs a TrueNAS CLI command and returns the parsed output.
 * @param command The CLI command to run.
 * @param args Any arguments to pass to the command.
 */
export async function truenasCli<
  T,
  C extends string,
  A extends Partial<
    WithId<Record<string, string | number | boolean | undefined>>
  >,
  R extends C extends never ? never
    : C extends QueryExpectingStorageDatasets ? StorageDataset[]
    : C extends QueryExpectingStoragePools ? StoragePool[]
    : C extends QueryExpectingInitShutdownScripts ? InitShutdownScript[]
    : C extends QueryExpectingSingleValue ? T
    : C extends QueryExpectingVoid ? void
    : T[],
>(
  command: C,
  args: A = {} as A,
): Promise<R> {
  const effectiveCommand = [
    command,
    ...Object.entries(args).flatMap(([key, value]) => {
      if (typeof value === "undefined") {
        return [];
      }
      if (typeof value === "boolean") {
        return [`${key}=${value}`];
      }
      return [`${key}="${value}"`];
    }),
  ].join(" ");
  const output = await run([
    "cli",
    ...["--mode", "csv"],
    ...["--command", effectiveCommand],
  ]);

  if (isQueryExpectingStorageDatasets(command)) {
    if (output === "") {
      return [] as R;
    }
    return parseCsv(output, { skipFirstRow: true } as ParseOptions).map(
      parsePart,
    ) as R;
  }

  if (isQueryExpectingStoragePools(command)) {
    if (output === "") {
      return [] as R;
    }
    return parseCsv(output, { skipFirstRow: true } as ParseOptions).map(
      parsePart,
    ) as R;
  }

  if (isQueryExpectingInitShutdownScripts(command)) {
    if (output === "") {
      return [] as R;
    }
    return parseCsv(output, { skipFirstRow: true } as ParseOptions).map(
      parsePart,
    ) as R;
  }

  if (isQueryExpectingSingleValue(command)) {
    return parsePart(output) as R;
  }

  if (isQueryExpectingVoid(command)) {
    return undefined as R;
  }

  if (output === "") {
    return [] as R;
  }
  return parseCsv(output, { skipFirstRow: true } as ParseOptions).map(
    parsePart,
  ) as R;
}

if (import.meta.main) {
  const results = await Promise.all(Deno.args.map((c) => truenasCli(c)));
  for (const result of results) {
    console.table(result);
  }
}
