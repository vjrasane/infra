import { facts } from "module-runner";
import { apt, copy, cron, file, shell } from "module-runner/builtin";
import { toShellEnvFile } from "./utils";
import { kebabCase } from "lodash";

export const setupCronjob = async (
  name: string,
  script: string,
  args: string[] = [],
  opts: {
    env?: Record<string, string>;
    minute?: string;
    hour?: string;
    day?: string;
    deps?: string[];
    immediate?: boolean;
  } = {},
) => {
  const {
    ansible_user_dir: home,
    ansible_user_id: user,
    ansible_user_gid: gid,
  } = await facts();
  const { env = {}, deps = [] } = opts;
  const identifier = kebabCase(name);

  const cronDir = `${home}/.local/libexec/cronjobs`;
  const envDir = `${home}/.config/cronjobs`;
  const logDir = `${home}/.local/state/cronjobs`;

  const scriptPath = `${cronDir}/${identifier}.sh`;
  const envPath = `${envDir}/${identifier}.env`;
  const logPath = `${logDir}/${identifier}.log`;

  if (deps.length)
    await apt("Install dependences for cronjob " + name, { name: deps });

  await createDir(name, logDir, "0750");
  await createDir(name, cronDir, "0750");

  let changed = false;

  await copy("Install script for cronjob " + name, {
    content: script,
    dest: scriptPath,
    mode: "0750",
  }).then((r) => {
    changed = changed || r.changed;
  });

  let cmd = `${scriptPath}${args.length ? " " + args.join(" ") : ""}`;

  if (Object.keys(env).length) {
    await createDir(name, envDir, "0700");
    await copy(
      "Copy env file for cronjob " + name,
      {
        content: toShellEnvFile(env),
        dest: envPath,
        mode: "0600",
      },
      { noLog: true },
    ).then((r) => {
      changed = changed || r.changed;
    });

    cmd = `set -a; . ${envPath}; set +a; ${cmd}`;
  }

  const job = `${cmd} >> ${logPath} 2>&1;`;
  await cron("Setup cron " + name, {
    name: identifier,
    minute: opts.minute ?? "*/5",
    hour: opts.hour ?? "*",
    day: opts.day ?? "*",
    job,
  }).then((r) => {
    changed = changed || r.changed;
  });

  await copy(
    "Setup log rotation for cronjob " + name,
    {
      dest: `/etc/logrotate.d/${identifier}`,
      content: `${logPath} {
        su ${user} ${gid}
        daily
        rotate 7
        missingok
        notifempty
        compress
        delaycompress
        create 0640 ${user} ${gid}
      }`,
    },
    { become: true },
  );

  if (changed && opts.immediate)
    await shell("Run cronjob " + name + " immediately", { cmd });

  return { changed, cmd, job };
};

const createDir = async (job: string, dir: string, mode: string) => {
  await file(`Create directory ${dir} for cronjob ${job}`, {
    path: dir,
    state: "directory",
    mode,
  });
};
