import { truenasCli } from "./cli.ts";
import { WithId } from "./with-id.ts";

export type InitShutdownScriptCreate =
  `system init_shutdown_script create ${string}`;
export type InitShutdownScriptUpdate =
  `system init_shutdown_script update ${string}`;

export function isInitShutdownScriptCreate(
  query: string,
): query is InitShutdownScriptCreate {
  return query.startsWith("system init_shutdown_script create");
}

export function isInitShutdownScriptUpdate(
  query: string,
): query is InitShutdownScriptUpdate {
  return query.startsWith("system init_shutdown_script update");
}

export type InitShutdownScript = {
  when: "PREINIT" | "POSTINIT" | "SHUTDOWN";
  enabled: boolean;
  comment?: string;
  type: "COMMAND" | "SCRIPT";
  command?: string;
  script?: string;
};

export function getInitShutdownScripts(): Promise<
  WithId<InitShutdownScript>[]
> {
  return truenasCli("system init_shutdown_script query");
}

export function isEqualTo<T extends Record<string, unknown>>(
  expected: T,
) {
  return function (actual: T) {
    return Object.entries(expected).every(([key, value]) => {
      return actual[key] === value;
    });
  };
}

export async function createInitShutdownScript(
  initShutdownScript: InitShutdownScript,
): Promise<InitShutdownScript> {
  await truenasCli("system init_shutdown_script create", initShutdownScript);

  const scripts = await getInitShutdownScripts();
  const created: undefined | InitShutdownScript = scripts.find(
    isEqualTo(initShutdownScript),
  );
  if (!created) {
    throw new Error("Failed to create init/shutdown script.");
  }

  return created;
}

export async function updateInitShutdownScript(
  id: number,
  desired: Partial<InitShutdownScript>,
) {
  await truenasCli(
    `system init_shutdown_script update`,
    { id, ...desired },
  );
}
