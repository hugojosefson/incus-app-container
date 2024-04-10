#!/bin/sh
// 2>/dev/null;DENO_VERSION_RANGE="^1.42.0";DENO_RUN_ARGS="--allow-run=cli --allow-env=VERBOSE,NO_COLOR,FORCE_COLOR,TERM,NODE_DISABLE_COLORS,CI";set -e;V="$DENO_VERSION_RANGE";A="$DENO_RUN_ARGS";h(){ [ -x "$(command -v "$1" 2>&1)" ];};g(){ u="$([ "$(id -u)" != 0 ]&&echo sudo||:)";if h brew;then echo "brew install $1";elif h apt;then echo "($u apt update && $u DEBIAN_FRONTEND=noninteractive apt install -y $1)";elif h yum;then echo "$u yum install -y $1";elif h pacman;then echo "$u pacman -yS --noconfirm $1";elif h opkg-install;then echo "$u opkg-install $1";fi;};p(){ q="$(g "$1")";if [ -z "$q" ];then echo "Please install '$1' manually, then try again.">&2;exit 1;fi;eval "o=\"\$(set +o)\";set -x;$q;set +x;eval \"\$o\"">&2;};f(){ h "$1"||p "$1";};w(){ [ -n "$1" ] && "$1" -V >/dev/null 2>&1;};U="$(l=$(printf "%s" "$V"|wc -c);for i in $(seq 1 $l);do c=$(printf "%s" "$V"|cut -c $i);printf '%%%02X' "'$c";done)";D="$(w "$(command -v deno||:)"||:)";t(){ i="$(if h findmnt;then findmnt -Ononoexec,noro -ttmpfs -nboAVAIL,TARGET|sort -rn|while IFS=$'\n\t ' read -r a m;do [ "$a" -ge 150000000 ]&&[ -d "$m" ]&&printf %s "$m"&&break||:;done;fi)";printf %s "${i:-"${TMPDIR:-/tmp}"}";};s(){ deno eval "import{satisfies as e}from'https://deno.land/x/semver@v1.4.1/mod.ts';Deno.exit(e(Deno.version.deno,'$V')?0:1);">/dev/null 2>&1;};e(){ R="$(t)/deno-range-$V/bin";mkdir -p "$R";export PATH="$R:$PATH";s&&return;f curl;v="$(curl -sSfL "https://semver-version.deno.dev/api/github/denoland/deno/$U")";i="$(t)/deno-$v";ln -sf "$i/bin/deno" "$R/deno";s && return;f unzip;([ "${A#*-q}" != "$A" ]&&exec 2>/dev/null;curl -fsSL https://deno.land/install.sh|DENO_INSTALL="$i" sh -s $DENO_INSTALL_ARGS "$v"|grep -iv discord>&2);};e;exec deno run $A "$0" "$@"
import { mapValues, parseCsv, run } from "./deps.ts";

export async function truenasCli<T>(command: string): Promise<T[] | T> {
  const output = await run([
    "cli",
    ...["--mode", "csv"],
    ...["--command", command],
  ]);
  const csvRows = parseCsv(output, { skipFirstRow: true });
  return csvRows.length ? csvRows.map(parsePart) as T[] : parsePart(output);
}

export function parsePart<T>(input: unknown): T {
  if (input === null) {
    return undefined as T;
  }
  if (Array.isArray(input)) {
    return input.map(parsePart) as T;
  }
  if (typeof input === "string") {
    if (input === "<undefined>" || input === "<null>") {
      return undefined as T;
    }
    if (input === "<empty list>") {
      return [] as T;
    }
    try {
      const parsed = JSON.parse(input);
      return parsePart(parsed);
    } catch {
      return input as T;
    }
  }
  if (typeof input === "object") {
    const asObject = input as Record<string, unknown>;
    if ("parsed" in asObject) {
      return parsePart(asObject.parsed);
    }
    return mapValues(asObject, parsePart) as T;
  }
  return input as T;
}

if (import.meta.main) {
  console.dir(await Promise.all(Deno.args.map(truenasCli)));
}
