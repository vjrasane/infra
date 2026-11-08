import { apt, file, copy, lineinfile, service } from "module-runner/builtin";

export const setupSambaShare = async (name: string, sharePath: string) => {
  await apt("Install samba", { name: ["samba"] });

  let changed = false;
  await file(
    `Ensure share dir ${sharePath}`,
    {
      path: sharePath,
      state: "directory",
      owner: "1000",
      group: "1000",
      mode: "2775",
    },
    { become: true },
  );

  const dropin = `/etc/samba/smb.conf.d/${name}.conf`;
  await file(
    "Ensure samba dropin dir",
    { path: "/etc/samba/smb.conf.d", state: "directory" },
    { become: true },
  ).then((r) => {
    changed ||= r.changed;
  });

  await copy(
    `Write samba share ${name}`,
    {
      dest: dropin,
      content: `[${name}]\n   path = ${sharePath}\n   writeable = yes\n   browseable = yes\n   public = no\n`,
    },
    { become: true },
  ).then((r) => {
    changed ||= r.changed;
  });

  await lineinfile(
    "Include samba dropins",
    {
      path: "/etc/samba/smb.conf",
      line: `   include = ${dropin}`,
      insertafter: "^\\[global\\]",
    },
    { become: true },
  ).then((r) => {
    changed ||= r.changed;
  });

  if (changed)
    await service(
      "Reload smbd",
      { name: "smbd", state: "reloaded" },
      { become: true },
    );
};
