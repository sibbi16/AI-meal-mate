# Backend Integration Guide

## Quick Start

Your Meal Mate frontend is now integrated with your Python FastAPI backend!

### 1. Start Your Backend

```bash
# Make sure your backend is running
python main.py  # or however you start your FastAPI server
# Should be accessible at http://127.0.0.1:8000
```

### 2. Configure Environment

Add to `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL="http://127.0.0.1:8000"
```

### 3. Start Frontend

```bash
npm run dev
# or
bun dev
```

## API Endpoints Integration

### Recipe Generation

**Frontend → Backend**

```typescript
// When user uploads image or enters text/URL
POST http://127.0.0.1:8000/generate-recipe

FormData:
- prompt: string (recipe URL or description)
- image: File (optional, for image uploads)
```

**Backend → Frontend**

```json
{
  "recipe_name": "Chicken Biryani",
  "duration": "45 minutes",
  "ingredients": [
    "2 cups basmati rice",
    "500g chicken",
    "2 onions, sliced"
  ],
  "steps": [
    "Marinate chicken with spices",
    "Cook rice until 70% done",
    "Layer rice and chicken"
  ]
}
```

### Meal Plan Generation

**Frontend → Backend**

```typescript
// When user clicks "Create Meal Plan"
POST http://127.0.0.1:8000/generate-meal-plan

FormData:
- recipes: string (comma-separated recipe names from saved library)
  Example: "biryani, pasta, oatmeal, salad, pizza, soup, sandwich"
```

**Backend → Frontend**

```json
{
  "meal_plan": "Sunday:\nBreakfast: Oatmeal with fruits\nLunch: Chicken Pasta\nDinner: Biryani\n\nMonday:\nBreakfast: Smoothie Bowl\nLunch: Caesar Salad\nDinner: Pizza\n..."
}
```

## Data Flow

### Recipe Extraction Flow

```
User Action (Upload/URL/Text)
    ↓
Frontend: /api/meal-mate/extract-recipe or /api/meal-mate/extract-from-image
    ↓
Backend: POST /generate-recipe
    ↓
Frontend: Display recipe card for review
    ↓
User: Click "Save Recipe"
    ↓
Frontend: Add to savedRecipes state
    ↓
Frontend: Show in Recipes tab
```

### Meal Plan Generation Flow

```
User: Click "Create Meal Plan" button
    ↓
Frontend: Check if savedRecipes.length > 0
    ↓
Frontend: Extract recipe titles from savedRecipes
    ↓
Frontend: /api/meal-mate/generate-plan
    ↓
Backend: POST /generate-meal-plan with recipe names
    ↓
Frontend: Parse meal plan text
    ↓
Frontend: Display in Meal Plan tab
```

## Testing

### Test Recipe Extraction

1. Navigate to http://localhost:3000/meal-mate
2. Type "chicken biryani recipe" in chat
3. Should call your backend and display extracted recipe
4. Click "Save Recipe"

### Test Image Upload

1. Click the image icon in chat input
2. Upload a food image
3. Should call your backend with the image
4. Review and save the extracted recipe

### Test Meal Plan

1. Save at least 2-3 recipes
2. Click "Create Meal Plan" button
3. Should call your backend with saved recipe names
4. View generated meal plan in Meal Plan tab

## Troubleshooting

### Backend Not Responding

**Symptom**: "Using fallback data - backend may be offline" message

**Solutions**:
1. Check if backend is running: `curl http://127.0.0.1:8000`
2. Verify CORS is enabled in your FastAPI backend
3. Check backend logs for errors

### CORS Issues

Add to your FastAPI backend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Recipe Not Displaying

**Check**:
1. Backend response format matches expected structure
2. Console logs in browser DevTools
3. Network tab shows successful API calls

## Fallback Behavior

The frontend automatically falls back to mock data if:
- Backend is not running
- Backend returns an error
- Network request fails

This allows you to:
- Test the UI without backend
- Develop frontend independently
- Handle backend downtime gracefully

## Next Steps

### Optional Enhancements

1. **Database Integration**: Save recipes to Supabase
2. **User Preferences**: Add dietary restrictions
3. **Shopping Lists**: Generate from meal plans
4. **Recipe Images**: Store uploaded images
5. **Meal Plan History**: Save past meal plans

### Production Deployment

1. Update `NEXT_PUBLIC_BACKEND_URL` to production backend URL
2. Ensure backend has proper authentication
3. Add rate limiting
4. Enable HTTPS
5. Add error monitoring (e.g., Sentry)
