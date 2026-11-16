import { currentHost, facts } from "module-runner";
import { package_, command, service, shell } from "module-runner/builtin";
import { authorized_key } from "./ansible/posix/index.ts";
import { task } from "./lib/task.ts";

const { TAILSCALE_AUTH_KEY } = process.env;

const restartSsh = task([], () =>
  service({ name: "ssh", state: "restarted" }, { become: true }),
);

export const addGithubKeys = task(["ssh", "keys"], async () => {
  const { ansible_user_id: user } = await facts();
  await authorized_key("Add SSH keys from GitHub", {
    key: "https://github.com/vjrasane.keys",
    user,
  }).then(restartSsh.register);
});
//
// const setupTailscale = async () => {
//   await package_({ name: "jq", state: "present" }, { become: true });
//
//   let r = await command(
//     "Check if Tailscale is installed",
//     { cmd: "which tailscale" },
//     { ignoreErrors: true },
//   );
//   const isInstalled = r.rc === 0;
//   if (!isInstalled)
//     await shell("Install Tailscale", {
//       cmd: "curl -fsSL https://tailscale.com/install.sh | sh",
//     });
//
//   r = await command(
//     "Check Tailscale status",
//     { cmd: "tailscale status" },
//     { ignoreErrors: true },
//   );
//
//   let hostname: string | undefined;
//   if (r.rc === 0) {
//     r = await shell("Get Tailscale hostname", {
//       cmd: "tailscale status --self --json | jq -r '.Self.HostName'",
//     });
//     hostname = r.stdout.trim();
//   }
//
//   if (!hostname) {
//     await shell(
//       "Join Tailnet",
//       {
//         cmd: `tailscale up --authkey ${TAILSCALE_AUTH_KEY} --hostname ${currentHost().name}`,
//       },
//       { become: true },
//     );
//   }
// };
//
// const setupCloudLinuxHost = async () => {
//   // let { restartSsh } = await prepare();
//
//   await setupTailscale();
// };

// const main = async () => {
//   await aws_ec2.run(setupCloudLinuxHost);
// };
//
// main();
