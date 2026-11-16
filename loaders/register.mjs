import Module, { register } from "node:module";
import { readFileSync } from "node:fs";

// ESM path: intercept `import x from "./f.yml"` when a module is loaded as ESM.
register("./text.mjs", { parentURL: import.meta.url });

// CommonJS path: this project has no "type":"module", so imports compile to
// require() and the ESM hook above never fires. Register a require extension
// so the raw file contents are returned instead of being parsed as JS.
const loadText = (mod, filename) => {
  mod.exports = readFileSync(filename, "utf8");
};
for (const ext of [".yml", ".yaml", ".sh", ".bash"]) {
  Module._extensions[ext] = loadText;
}
