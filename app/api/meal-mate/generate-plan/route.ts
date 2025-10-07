import { NextRequest, NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/gemini/service';

interface RecipeSummary {
  title?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { userMessage, recipes, numberOfDays, startDate: providedStartDate } = await request.json();

    // Extract number of days from message or use provided value
    let days = numberOfDays;
    if (!days && typeof userMessage === 'string') {
      const daysMatch = userMessage.match(/(\d+)\s*days?/i);
      days = daysMatch ? parseInt(daysMatch[1]) : 7; // Default to 7 days
    }
    if (!days) days = 7;

    // Get the date range based on number of days
    let startDate: Date;
    if (providedStartDate) {
      // Use provided start date
      startDate = new Date(providedStartDate);
    } else {
      // Default to TODAY (not Sunday of current week)
      startDate = new Date();
    }
    
    // Calculate end date: start + (days - 1)
    // For 4 days: Day 0, Day 1, Day 2, Day 3 = start + 3
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (days - 1));
    
    console.log(`[Date Range] Start: ${startDate.toDateString()}, End: ${endDate.toDateString()}, Days: ${days}`);

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
    const mealPlanText = await service.generateMealPlan(seedRecipes, days);

    console.log(`[Meal Plan] Generating ${days}-day plan`);
    console.log('[Meal Plan] Generated text:', mealPlanText.substring(0, 500));

    // Parse the meal plan text and structure it
    const mealPlan = parseMealPlanText(mealPlanText, startDate, endDate, days);

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

function parseMealPlanText(mealPlanText: string, startDate: Date, endDate: Date, numberOfDays: number = 7) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  console.log(`[Parser] Creating ${numberOfDays} days starting from ${startDate.toDateString()} to ${endDate.toDateString()}`);
  
  // ALWAYS use the requested numberOfDays (ignore endDate calculation)
  const daysToCreate = numberOfDays;
  console.log(`[Parser] Will create exactly ${daysToCreate} days`);
  
  // Split the meal plan by days
  const lines = mealPlanText.split('\n').filter(line => line.trim());
  
  const days = Array.from({ length: daysToCreate }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    // Try to extract meals from the text for this day
    const dayName = dayNames[date.getDay()];
    
    const breakfast = extractMealFromText(mealPlanText, dayName, 'breakfast') || 'Breakfast';
    const lunch = extractMealFromText(mealPlanText, dayName, 'lunch') || 'Lunch';
    const dinner = extractMealFromText(mealPlanText, dayName, 'dinner') || 'Dinner';
    
    console.log(`[Parser] Day ${i + 1} (${dayName}): B=${breakfast}, L=${lunch}, D=${dinner}`);
    
    return {
      day: dayName,
      date: date.toISOString(),
      meals: {
        breakfast: {
          name: breakfast,
          description: 'Delicious morning meal'
        },
        lunch: {
          name: lunch,
          description: 'Satisfying midday meal'
        },
        dinner: {
          name: dinner,
          description: 'Hearty evening meal'
        }
      }
    };
  });

  console.log(`[Parser] Created ${days.length} day objects`);
  
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

