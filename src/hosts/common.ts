import { authorized_key } from "../ansible/posix";
import { hostRun } from "../lib/inventory";
import { facts } from "module-runner";

const run = async () => {
  const { ansible_user_id } = await facts();

  await authorized_key("Add authorized keys from GitHub", {
    state: "present",
    key: "https://github.com/vjrasane.keys",
    user: ansible_user_id,
  });
};

export const common = hostRun(run);
