import { z } from "zod";

export const recipeSchema = z.object({
  title: z.string().trim().min(1, "Tittel er påkrevd").max(100, "Tittel må være mindre enn 100 tegn"),
  servings: z.number().min(1, "Antall personer må være minst 1").max(50, "Antall personer må være mindre enn 50"),
  icon: z.number().min(1).max(10),
  ingredients: z.array(z.string().trim().min(1, "Ingrediens kan ikke være tom")).min(1, "Minst én ingrediens er påkrevd"),
  instructions: z.array(z.string().trim().min(1, "Steg kan ikke være tomt")).min(1, "Minst ett steg er påkrevd"),
  tags: z.array(z.string().trim().min(1)),
  description: z.string().max(500, "Beskrivelse må være mindre enn 500 tegn").optional(),
  sourceUrl: z.string().url("Ugyldig URL").optional().or(z.literal(""))
});

export type RecipeSchemaInput = z.input<typeof recipeSchema>;
export type RecipeSchemaOutput = z.output<typeof recipeSchema>;
