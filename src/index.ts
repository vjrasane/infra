import jellyfin from "./jellyfin/jellyfin.ts";
import immich from "./immich/immich.ts";
import { handlers, withContext } from "./lib/context.ts";
import { Target } from "./lib/inventory.ts";
import { all, rpi5_01 } from "./inventory.ts";
import { addGithubKeys } from "./common.ts";

const [, , limit] = process.argv;

const filter = (target: Target) => {
  if (!limit) return true;
  return target.name === limit;
};

const tags: string[] = [];

withContext({ tags, filter }, async () => {
  await all.run(addGithubKeys);
  await Promise.all([
    //-------------------
    rpi5_01.run(jellyfin),
    rpi5_01.run(immich),
  ]);

  await Promise.all(handlers().map((h) => h()));
});
