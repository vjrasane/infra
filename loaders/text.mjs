import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const TEXT = /\.ya?ml$/;

export async function load(url, context, nextLoad) {
  if (TEXT.test(new URL(url).pathname)) {
    const source = await readFile(fileURLToPath(url), "utf8");
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${JSON.stringify(source)};`,
    };
  }
  return nextLoad(url, context);
}
