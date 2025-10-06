# Meal Mate - AI Meal Planning Assistant

## Overview

Meal Mate is an intelligent meal planning assistant that uses AI to create personalized weekly meal plans through a conversational chat interface. It integrates with your existing Python FastAPI backend for recipe generation and meal planning.

## Features

- **Recipe Extraction**: Extract recipes from images, URLs, or text descriptions
- **Recipe Library**: Save and manage your personal recipe collection
- **Conversational AI Interface**: Chat with Meal Mate to interact with recipes
- **Weekly Meal Plans**: Generate meal plans using your saved recipes
- **Beautiful UI**: Modern, responsive design with smooth animations

## Setup Instructions

### 1. Backend Setup

**Start your Python FastAPI backend:**

```bash
# Make sure your backend is running on http://127.0.0.1:8000
# The backend should have these endpoints:
# - POST /generate-recipe (accepts 'prompt' or 'image')
# - POST /generate-meal-plan (accepts 'recipes')
```

### 2. Environment Variables

Add the backend URL to your `.env.local` file:

```bash
# Meal Mate Backend API URL
NEXT_PUBLIC_BACKEND_URL="http://127.0.0.1:8000"
```

### 3. Fallback Mode

If the backend is unavailable, the application will automatically use mock data, allowing you to test the UI without the backend running.

## How to Use

### Adding Recipes

1. **From Image**: Click the image icon or drag & drop a food photo
2. **From URL**: Paste a recipe URL (e.g., `https://example.com/recipe`)
3. **From Text**: Describe a recipe or type keywords like "chicken biryani recipe"

### Creating Meal Plans

1. Save at least one recipe to your library
2. Click "Create Meal Plan" button or ask "Create a meal plan for this week"
3. View your personalized weekly meal plan in the Meal Plan tab

### Managing Your Library

- **Recipes Tab**: View all saved recipes
- **Save**: Review AI-extracted recipes and click "Save Recipe"
- **Delete**: Remove recipes from your library

## Architecture

### Components

- **`page.tsx`**: Server component that handles authentication
- **`client.tsx`**: Main client component with chat logic
- **`ChatMessage.tsx`**: Individual message display component
- **`ChatInput.tsx`**: Text input component for user messages
- **`MealPlanView.tsx`**: Weekly meal plan display component

### API Routes

- **`/api/meal-mate/generate-plan`**: Generates weekly meal plans using AI
- **`/api/meal-mate/chat`**: Handles general chat messages

## Backend API Integration

The application integrates with your Python FastAPI backend:

### Endpoints Used

**1. POST /generate-recipe**
- Accepts: `FormData` with `prompt` (string) or `image` (file)
- Returns: `{ recipe_name, duration, ingredients[], steps[] }`
- Used for: Recipe extraction from text, URLs, and images

**2. POST /generate-meal-plan**
- Accepts: `FormData` with `recipes` (comma-separated string)
- Returns: `{ meal_plan: string }`
- Used for: Generating weekly meal plans from saved recipes

### Response Format

Your backend should return:

```json
// For /generate-recipe
{
  "recipe_name": "Chicken Biryani",
  "duration": "45 minutes",
  "ingredients": ["2 cups rice", "500g chicken", "..."],
  "steps": ["Marinate chicken...", "Cook rice...", "..."]
}

// For /generate-meal-plan
{
  "meal_plan": "Sunday:\nBreakfast: Oatmeal\nLunch: Pasta\nDinner: Biryani\n..."
}
```

## Customization

### Meal Plan Format

The meal plan structure is defined in `MealPlanView.tsx`:

```typescript
interface MealPlan {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  days: MealPlanDay[];
  createdAt: Date;
}
```

### Styling

The application uses:
- Tailwind CSS for styling
- Gradient theme: Orange to Pink
- Dark mode support
- Responsive design for mobile and desktop

## Future Enhancements

Potential features to add:
- Save meal plans to database
- Recipe details and instructions
- Dietary preferences and restrictions
- Shopping list generation
- Recipe image generation
- Meal plan history

## Troubleshooting

### API Key Issues
- Ensure your API key is correctly set in `.env.local`
- Restart your development server after adding environment variables
- Check API key permissions and quotas

### Mock Data Mode
If you see the same meal plans repeatedly, you're in mock data mode. Add an API key to enable AI-powered generation.

## Support

For issues or questions:
- Check the API provider documentation
- Review the console for error messages
- Ensure your API keys have sufficient quota
