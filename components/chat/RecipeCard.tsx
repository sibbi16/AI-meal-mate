'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  imageUrl?: string;
  tags?: string[];
  createdAt?: Date;
}

interface RecipeCardProps {
  recipe: Recipe;
  onSave?: (recipe: Recipe) => void;
  onDelete?: (recipeId: string) => void;
  showActions?: boolean;
  compact?: boolean;
  isSaving?: boolean;
}

export function RecipeCard({
  recipe,
  onSave,
  onDelete,
  showActions = true,
  compact = false,
  isSaving = false
}: RecipeCardProps) {
  return (
    <Card className={cn('overflow-hidden hover:shadow-lg transition-shadow border-2 border-orange-200 dark:border-orange-900', compact && 'max-w-sm')}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-xl">{recipe.title}</CardTitle>
            {recipe.description && (
              <CardDescription className="mt-1.5">{recipe.description}</CardDescription>
            )}
          </div>
        </div>

        {/* Meta information */}
        <div className="flex flex-wrap gap-2 mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          {recipe.prepTime && (
            <div className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Prep: {recipe.prepTime}</span>
            </div>
          )}
          {recipe.cookTime && (
            <div className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6.5 6.5a7.5 7.5 0 0 1 10.6 0" />
                <path d="M17.5 17.5a7.5 7.5 0 0 1-10.6 0" />
                <circle cx="12" cy="12" r="1" />
              </svg>
              <span>Cook: {recipe.cookTime}</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{recipe.servings} servings</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      {!compact && (
        <CardContent className="space-y-4">
          {/* Ingredients */}
          <div>
            <h4 className="font-semibold mb-2 text-sm">Ingredients</h4>
            <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {recipe.ingredients.map((ingredient, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">•</span>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h4 className="font-semibold mb-2 text-sm">Instructions</h4>
            <ol className="space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
              {recipe.instructions.map((instruction, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                    {idx + 1}.
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      )}

      {showActions && (
        <CardFooter className="flex gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          {onSave && (
            <Button 
              onClick={() => onSave(recipe)} 
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Recipe
                </>
              )}
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={() => onDelete(recipe.id)}
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
