export interface Recipe {
  recipeName: string;
  ingredients: string[];
  steps: string[];
  duration: string;
}

export interface RawRecipeResponse {
  recipe_name?: string;
  ingredients?: string[];
  steps?: string[];
  duration?: string;
  error?: string;
}

export interface MealPlanMealDetail {
  name: string;
  description?: string;
}

export interface MealPlanDay {
  day?: string;
  label?: string;
  date: string;
  meals: {
    breakfast: MealPlanMealDetail;
    lunch: MealPlanMealDetail;
    dinner: MealPlanMealDetail;
    snacks?: MealPlanMealDetail;
  };
}

export type MealPlanType = 'weekly' | 'monthly';

export interface MealPlan {
  planType: MealPlanType;
  periodStartDate: string;
  periodEndDate: string;
  periodLabel?: string;
  days: MealPlanDay[];
  mealPrepTips?: string[];
  shoppingList?: Record<string, string[]>;
  nutritionalNotes?: string[];
}

export type GeminiGenerateRecipeInput = {
  prompt?: string;
  imageBase64?: string;
  imageMimeType?: string;
};
