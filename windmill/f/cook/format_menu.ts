import * as path from "path";
import { ParsedRecipe } from "./parse_recipes";

export async function main(menu: ParsedRecipe[]): Promise<string> {
  const names = menu.map((r) => path.parse(r.file).name);
  return names.join("\n");
}
