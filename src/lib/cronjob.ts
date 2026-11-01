import { facts } from "module-runner";
import { apt, copy, cron, file, shell } from "module-runner/builtin";
import { toEnvFile } from "./utils";
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
  const { env = {}, deps = [] } = opts;
  const identifier = kebabCase(name);

  await apt("Install dependences for cronjob " + name, { name: deps });

  for (const d of ["~/logs", "~/scripts"]) {
    await file(`Create directory ${d} for cronjob ${name}`, {
      path: d,
      state: "directory",
      mode: "0750",
    });
  }

  let changed = false;

  const remoteScriptPath = `~/scripts/${identifier}.sh`;
  await copy("Install script for cronjob " + name, {
    content: script,
    dest: remoteScriptPath,
    mode: "0750",
  }).then((r) => {
    changed = changed || r.changed;
  });

  const { ansible_user_dir } = await facts();
  const logFilePath = `${ansible_user_dir}/logs/${identifier}.log`;

  let cmd = `${remoteScriptPath}${args ? " " + args.join(" ") : ""}`;

  if (Object.keys(env).length) {
    const remoteEnvFilePath = `~/scripts/${identifier}.env`;
    await copy(
      "Copy env file for cronjob " + name,
      {
        content: toEnvFile(env),
        dest: remoteEnvFilePath,
        mode: "0600",
      },
      { noLog: true },
    ).then((r) => {
      changed = changed || r.changed;
    });

    cmd = `set -a; . ${remoteEnvFilePath}; set +a; ${cmd}`;
  }

  const job = `${cmd} >> ${logFilePath} 2>&1;`;
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
      content: `${logFilePath} {
          daily
          rotate 7
          compress
          missingok
          notifempty
          copytruncate
      }`,
    },
    { become: true },
  );

  if (changed && opts.immediate)
    await shell("Run cronjob " + name + " immediately", { cmd });

  return { changed, cmd, job };
};
