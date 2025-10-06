import { NextRequest, NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/gemini/service';

interface RecipeSummary {
  title?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { userMessage, recipes } = await request.json();

    // Get the current week's date range
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay()); // Start from Sunday
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    // Prepare recipe names for Gemini
    const recipeTitles = Array.isArray(recipes)
      ? (recipes as RecipeSummary[])
          .map((recipe) => (typeof recipe?.title === 'string' ? recipe.title.trim() : ''))
          .filter((title): title is string => Boolean(title))
      : [];

    let seedRecipes: string[] = [...recipeTitles];

    if (!seedRecipes.length && typeof userMessage === 'string') {
      seedRecipes = userMessage
        .split(/[,\n]/)
        .map((item: string) => item.trim())
        .filter(Boolean);
    }

    if (!seedRecipes.length) {
      seedRecipes = ['biryani', 'pasta', 'oatmeal', 'salad', 'pizza', 'soup', 'sandwich'];
    }

    const service = getGeminiService();
    const mealPlanText = await service.generateMealPlan(seedRecipes);

    // Parse the meal plan text and structure it
    const mealPlan = parseMealPlanText(mealPlanText, startDate, endDate);

    // Save meal plan to database
    const saveResponse = await fetch(`${request.nextUrl.origin}/api/meal-mate/meal-plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify(mealPlan)
    });

    if (saveResponse.ok) {
      const savedData = await saveResponse.json();
      return NextResponse.json({
        mealPlan: savedData.mealPlan,
        message: 'Your personalized meal plan has been created and saved!'
      });
    }

    // If save fails, still return the meal plan
    return NextResponse.json({
      mealPlan,
      message: 'Your personalized meal plan has been created!'
    });

  } catch (error) {
    console.error('Error generating meal plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate meal plan. Ensure your Gemini API key is configured.' },
      { status: 500 }
    );
  }
}

function parseMealPlanText(mealPlanText: string, startDate: Date, endDate: Date) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Split the meal plan by days
  const lines = mealPlanText.split('\n').filter(line => line.trim());
  
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    // Try to extract meals from the text for this day
    const dayName = dayNames[date.getDay()];
    return {
      day: dayName,
      date: date.toISOString(),
      meals: {
        breakfast: {
          name: extractMealFromText(mealPlanText, dayName, 'breakfast') || 'Breakfast',
          description: 'Delicious morning meal'
        },
        lunch: {
          name: extractMealFromText(mealPlanText, dayName, 'lunch') || 'Lunch',
          description: 'Satisfying midday meal'
        },
        dinner: {
          name: extractMealFromText(mealPlanText, dayName, 'dinner') || 'Dinner',
          description: 'Hearty evening meal'
        }
      }
    };
  });

  return {
    id: Date.now().toString(),
    weekStartDate: startDate.toISOString(),
    weekEndDate: endDate.toISOString(),
    days,
    createdAt: new Date()
  };
}

function extractMealFromText(text: string, day: string, mealType: string): string | null {
  const lowerText = text.toLowerCase();
  const dayIndex = lowerText.indexOf(day.toLowerCase());
  
  if (dayIndex === -1) return null;
  
  const mealIndex = lowerText.indexOf(mealType, dayIndex);
  if (mealIndex === -1) return null;
  
  // Extract text after meal type until next meal or newline
  const afterMeal = text.substring(mealIndex + mealType.length);
  const match = afterMeal.match(/[:\-]\s*([^\n\r]+)/);
  
  return match ? match[1].trim() : null;
}

