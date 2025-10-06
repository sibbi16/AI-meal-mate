import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - Fetch all recipes for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch recipes
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipes:', error);
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
    }

    // Transform database format to frontend format
    const transformedRecipes = recipes?.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTime: recipe.prep_time,
      cookTime: recipe.cook_time,
      servings: recipe.servings,
      imageUrl: recipe.image_url,
      tags: recipe.tags || [],
      createdAt: new Date(recipe.created_at)
    })) || [];

    return NextResponse.json({ recipes: transformedRecipes });

  } catch (error) {
    console.error('Error in GET /api/meal-mate/recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save a new recipe
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipe = await request.json();

    // Insert recipe into database
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        servings: recipe.servings,
        image_url: recipe.imageUrl,
        tags: recipe.tags || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving recipe:', error);
      return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 });
    }

    // Transform back to frontend format
    const savedRecipe = {
      id: data.id,
      title: data.title,
      description: data.description,
      ingredients: data.ingredients,
      instructions: data.instructions,
      prepTime: data.prep_time,
      cookTime: data.cook_time,
      servings: data.servings,
      imageUrl: data.image_url,
      tags: data.tags || [],
      createdAt: new Date(data.created_at)
    };

    return NextResponse.json({ recipe: savedRecipe });

  } catch (error) {
    console.error('Error in POST /api/meal-mate/recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a recipe
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get('id');

    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID required' }, { status: 400 });
    }

    // Delete recipe
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', user.id); // Ensure user owns the recipe

    if (error) {
      console.error('Error deleting recipe:', error);
      return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/meal-mate/recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
