import { NextRequest, NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/gemini/service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const userId = formData.get('userId') as string;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = image.type || 'image/png';

    const service = getGeminiService();
    const recipeData = await service.generateRecipe({
      imageBase64: base64,
      imageMimeType: mimeType
    });

    const recipe = {
      id: Date.now().toString(),
      title: recipeData.recipeName || 'Recipe from Image',
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
      message: 'Recipe extracted from image! Review and save it to your library.'
    });

  } catch (error) {
    console.error('Error extracting recipe from image:', error);
    return NextResponse.json(
      { error: 'Failed to extract recipe from image. Ensure your Gemini API key is configured.' },
      { status: 500 }
    );
  }
}
