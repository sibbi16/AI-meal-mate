import { NextRequest, NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/gemini/service';

const FALLBACK_MESSAGE = "I'd love to help plan meals! Ask me for a weekly meal plan and I'll share ideas for breakfast, lunch, dinner, and snacks.";

export async function POST(request: NextRequest) {
  try {
    const { message, recipeCount, hasExistingPlan } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({
        message: "Try sending me a question about meals or nutrition and I'll do my best to help!"
      });
    }

    // Check if this is a meal plan request
    const mealPlanKeywords = ['meal plan', 'weekly plan', 'week', 'plan for', 'create plan', 'generate plan', 'create for','days'];
    const isMealPlanRequest = mealPlanKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    // Also check if message contains "create" or "make" with a number of days
    const createWithDaysMatch = message.match(/(?:create|make|plan).*?(\d+)\s*days?/i);
    
    if ((isMealPlanRequest || createWithDaysMatch) && recipeCount !== undefined) {
      // Extract number of days from message
      let numberOfDays: number | null = null;
      
      // Check for "X week(s)" pattern
      const weeksMatch = message.match(/(\d+)\s*weeks?/i);
      if (weeksMatch) {
        numberOfDays = parseInt(weeksMatch[1]) * 7;
      } else {
        // Check for "X day(s)" pattern
        const daysMatch = message.match(/(\d+)\s*days?/i);
        if (daysMatch) {
          numberOfDays = parseInt(daysMatch[1]);
        }
      }

      // Extract start date from message (e.g., "from Oct 10", "starting Oct 10", "from 10/10")
      const startDateMatch = message.match(/(?:from|starting|start)\s+(?:(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)|([A-Za-z]+\s+\d{1,2}))/i);
      let startDate = null;
      if (startDateMatch) {
        const dateStr = startDateMatch[1] || startDateMatch[2];
        startDate = new Date(dateStr);
        if (isNaN(startDate.getTime())) {
          startDate = null;
        }
      }

      // If user has existing plan and not explicitly saying "new" or "edit", ask what to do
      // Also skip this check if they're providing days (means they already decided)
      if (hasExistingPlan && !message.toLowerCase().includes('new') && !message.toLowerCase().includes('edit') && !numberOfDays) {
        return NextResponse.json({
          message: `You already have a meal plan. Would you like to:\n\n1. **Edit** the existing meal plan\n2. Create a **new** meal plan\n\nPlease let me know!`,
          needsAction: true
        });
      }

      // If number of days is not specified, ask for it
      if (!numberOfDays) {
        return NextResponse.json({
          message: `Great! I'll create a meal plan for you using your ${recipeCount} saved recipe${recipeCount > 1 ? 's' : ''}.\n\nHow many days would you like the meal plan to cover? (For example: 3 days, 7 days, 14 days)`,
          needsDays: true
        });
      }

      // All info available, tell client to generate
      const dateInfo = startDate ? ` starting from ${startDate.toLocaleDateString()}` : '';
      return NextResponse.json({
        message: `Perfect! I'll create a ${numberOfDays}-day meal plan${dateInfo}. Generating now...`,
        shouldGenerate: true,
        numberOfDays,
        startDate: startDate ? startDate.toISOString() : null
      });
    }

    // Handle "edit" or "new" responses
    if (message.toLowerCase().includes('edit') && hasExistingPlan) {
      return NextResponse.json({
        message: `Great! I'll help you edit your existing meal plan. How many days should the updated plan cover?`,
        needsDays: true,
        isEdit: true
      });
    }

    if (message.toLowerCase().includes('new')) {
      return NextResponse.json({
        message: `Perfect! I'll create a new meal plan for you. How many days would you like it to cover?`,
        needsDays: true,
        isNew: true
      });
    }

    // Check if user is responding with just a number or "X week(s)" (answering the "how many days" question)
    const numberOnlyMatch = message.match(/^(\d+)\s*(?:days?)?$/i);
    const weekOnlyMatch = message.match(/^(\d+)\s*weeks?$/i);
    
    if (weekOnlyMatch && recipeCount !== undefined) {
      const weeks = parseInt(weekOnlyMatch[1]);
      const days = weeks * 7;
      return NextResponse.json({
        message: `Perfect! I'll create a ${days}-day meal plan for you. Generating now...`,
        shouldGenerate: true,
        numberOfDays: days
      });
    }
    
    if (numberOnlyMatch && recipeCount !== undefined) {
      const days = parseInt(numberOnlyMatch[1]);
      return NextResponse.json({
        message: `Perfect! I'll create a ${days}-day meal plan for you. Generating now...`,
        shouldGenerate: true,
        numberOfDays: days
      });
    }

    // General conversation
    let service;
    try {
      service = getGeminiService();
    } catch (error) {
      console.warn('Gemini service unavailable:', error);
      return NextResponse.json({ message: FALLBACK_MESSAGE });
    }

    const reply = await service.generateChatReply(message);
    return NextResponse.json({ message: reply });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ message: FALLBACK_MESSAGE });
  }
}
