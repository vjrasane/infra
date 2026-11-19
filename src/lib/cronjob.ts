import { facts } from "module-runner";
import { toEnvFile } from "./utils";
import { kebabCase } from "lodash";
import { dir } from "./files";

const perms = { become: true, mode: "0600" };

const cronDir = dir("/etc/cron.d");

type Schedule = {
  minute?: string;
  hour?: string;
  dayOfWeek?: string;
  dayOfMonth?: string;
  month?: string;
};

type CronOpts = {
  env?: Record<string, string>;
} & Schedule;

const toCronSchedule = (s: Schedule) => {
  const {
    minute = "*",
    hour = "*",
    dayOfWeek = "*",
    dayOfMonth = "*",
    month = "*",
  } = s;

  return [minute, hour, dayOfMonth, month, dayOfWeek].join(" ");
};

const cronFileContent = (
  command: string,
  user: string,
  opts: CronOpts = {},
) => {
  const { env } = opts;
  return `${env ? toEnvFile(env) + "\n" : ""}${toCronSchedule(opts)} ${user} ${command}\n`;
};

export const setupCronjob = async (
  name: string,
  command: string,
  opts: CronOpts = {},
) => {
  const { ansible_user_id: user } = await facts();
  const identifier = kebabCase(name);
  const logged = `${command} 2>&1 | logger -t ${identifier}`;
  const cronFile = cronDir.file(
    identifier,
    cronFileContent(logged, user, opts),
    perms,
  );

  const changed = await cronFile.create();
  return changed;
};
