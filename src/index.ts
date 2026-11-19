import { jellyfin } from "./jellyfin";
import { parseArgs } from "node:util";
import { immich } from "./immich";
import { handlers, withContext } from "./lib/context.ts";
import { Target } from "./lib/inventory.ts";
import { all, rpi5_01 } from "./inventory.ts";
import { addGithubKeys } from "./common.ts";
import { samba } from "./samba/index.ts";
import { filterTraffic } from "./traefik/index.ts";

const { values } = parseArgs({
  allowPositionals: false,
  options: {
    host: { type: "string", multiple: true, short: "h", default: [] },
    tags: { type: "string", multiple: true, short: "t", default: [] },
  },
});

const filter = (target: Target) => {
  if (!values.host.length) return true;
  if (!target.name) return false;
  return values.host.includes(target.name);
};

withContext({ tags: values.tags, filter }, async () => {
  await Promise.all([
    //-------------------
    all.run(addGithubKeys),

    rpi5_01.run(jellyfin),
    rpi5_01.run(immich),
    rpi5_01.run(samba),
    rpi5_01.run(filterTraffic),
  ]);

  await handlers().run();
});
