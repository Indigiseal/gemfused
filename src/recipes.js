export const recipes = new Map();

export function registerRecipe(name, ingredients = []) {
  recipes.set(name, ingredients);
}
