import {
  apt,
  group,
  lineinfile,
  service,
  shell,
  user,
} from "module-runner/builtin";
import { createFiles, dir } from "../lib/files";
import { task } from "../lib/task";
import { homelabResticRepo, setupResticBackup } from "../restic";
import { decryptSecrets } from "../secrets";
import encrypted from "./secrets.json";

const shareName = "karkkishare";
const shareUser = "smbshare";
const shareGroup = "shared";
const shareGid = 1001;

const perms = {
  become: true,
  owner: shareUser,
  group: shareGroup,
  mode: "2775",
};

const shareDir = dir("/mnt/shared", perms);
export const mediaDir = shareDir.dir("media", perms);
export const musicDir = mediaDir.dir("music", perms);

const sambaSecrets = () => decryptSecrets(encrypted);

const dropinContent = `[${shareName}]
path = ${shareDir.path}
valid users = ${shareUser}
force user = ${shareUser}
force group = ${shareGroup}
create mask = 0664
force create mode = 0664
directory mask = 2775
force directory mode = 2775
writeable = yes
browseable = yes
public = no
`;
const sambaConfDir = dir("/etc/samba/smb.conf.d", { become: true });
const dropinFile = sambaConfDir.file(`${shareName}.conf`, dropinContent, {
  become: true,
});

const reload = task([], async () => {
  await service(
    "Reload smbd",
    { name: "smbd", state: "reloaded" },
    { become: true },
  );
});

const deps = task(["samba"], async () => {
  await apt("Install samba", { name: ["samba"] });
});

const directories = task(["samba"], async () => {
  await createFiles(shareDir, mediaDir, musicDir, sambaConfDir);
});

const auth = task(["samba"], async () => {
  await deps();
  const { SMB_PASSWORD } = await sambaSecrets();

  await group(
    "Create share group",
    { name: shareGroup, gid: shareGid },
    { become: true },
  );
  await user(
    "Create samba user",
    {
      name: shareUser,
      groups: [shareGroup],
      shell: "/usr/sbin/nologin",
      create_home: false,
      password_lock: true,
      append: true,
    },
    { become: true },
  );

  await shell(
    "Set samba password",
    {
      cmd: `printf '%s\\n%s\\n' "$SMB_PASSWORD" "$SMB_PASSWORD" | smbpasswd -s -a ${shareUser}`,
    },
    { become: true, env: { SMB_PASSWORD }, noLog: true },
  );
});

const setup = task(["samba"], async () => {
  await deps();
  await directories();

  await dropinFile.create().then(reload.register);

  await lineinfile(
    "Include samba dropins",
    {
      path: "/etc/samba/smb.conf",
      line: `   include = ${dropinFile.path}`,
      insertafter: "^\\[global\\]",
    },
    { become: true },
  ).then(reload.register);
});

const backup = task(["restic", "samba"], async () => {
  await setupResticBackup("samba", [shareDir.path], await homelabResticRepo(), {
    hour: "4",
  });
});

export const samba = async () => {
  await deps();
  await auth();
  await setup();
  await backup();
};
