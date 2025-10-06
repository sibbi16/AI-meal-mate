import { NextRequest, NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/gemini/service';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Please provide a prompt, image URL, or recipe link.' },
        { status: 400 }
      );
    }

    const service = getGeminiService();
    const recipeData = await service.generateRecipe({ prompt: message.trim() });

    const recipe = {
      id: Date.now().toString(),
      title: recipeData.recipeName || 'Generated Recipe',
      description: `Cooking time: ${recipeData.duration || 'Not specified'}`,
      ingredients: recipeData.ingredients,
      instructions: recipeData.steps,
      prepTime: recipeData.duration || 'Not specified',
      cookTime: recipeData.duration || 'Not specified',
      servings: 4,
      tags: [],
      createdAt: new Date()
    };

    return NextResponse.json({
      recipe,
      message: 'Recipe extracted successfully! Review and save it to your library.'
    });
  } catch (error) {
    console.error('Error extracting recipe:', error);
    return NextResponse.json(
      { error: 'Failed to extract recipe. Ensure your Gemini API key is configured.' },
      { status: 500 }
    );
  }
}

