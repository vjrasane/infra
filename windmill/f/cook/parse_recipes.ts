import * as fs from "fs/promises";
import matter from "gray-matter";
import { Recipe } from "@cooklang/cooklang-ts";

export interface ParsedRecipe extends Recipe {
  file: string;
  metadata: {
    [key: string]: any;
  };
}

export async function main(files: string[]) {
  const recipes = await Promise.all(
    files.map(async (file) => {
      const source = await fs.readFile(file, "utf-8");
      const { data: metadata, content } = matter(source);
      const recipe = new Recipe(content);
      return {
        file,
        ...recipe,
        metadata: {
          ...recipe.metadata,
          ...metadata,
        },
      };
    }),
  );

  return recipes;
}
