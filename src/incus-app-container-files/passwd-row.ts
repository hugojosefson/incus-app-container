import { run } from "./deps.ts";

export type PasswdRow = {
  username: string;
  password: string;
  uid: number;
  gid: number;
  gecos: string;
  home: string;
  shell: string;
};

export function parsePasswdRow(row: string): PasswdRow {
  const [
    username,
    password,
    uid,
    gid,
    gecos,
    home,
    shell,
  ] = row.split(":");
  return {
    username,
    password,
    uid: Number(uid),
    gid: Number(gid),
    gecos,
    home,
    shell,
  };
}

export async function getPasswdRowOfLocalUser(
  username: string,
): Promise<PasswdRow> {
  const passwd = await run(["getent", "passwd", username]);
  return parsePasswdRow(passwd);
}
