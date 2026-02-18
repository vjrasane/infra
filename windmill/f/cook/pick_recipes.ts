import { sampleSize } from "lodash/fp";
import { ParsedRecipe } from "./parse_recipes";

export async function main(
  count: number,
  recipes: ParsedRecipe[],
  course?: string,
  tags: string[] = [],
  selected: ParsedRecipe[] = [],
) {
  const filtered = recipes.filter((r) => {
    const metadata = r.metadata;
    if (course && metadata.course !== course) return false;
    const recipeTags = Array.isArray(metadata.tags) ? metadata.tags : [];
    if (tags.length > 0 && tags.some((t) => !recipeTags.includes(t)))
      return false;
    if (selected.length > 0 && selected.some((s) => s.file === r.file))
      return false;
    return true;
  });

  return sampleSize(count, filtered);
}
