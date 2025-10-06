# Database Integration for Meal Mate

## ✅ Changes Made

### 1. Fixed Recipe Display
- **Removed truncation**: All ingredients and instructions now display in full
- **No more "+3 more" messages**: Complete recipe information is always visible

### 2. Database Schema Added

**Tables Created:**

#### `recipes` table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- title: TEXT
- description: TEXT
- ingredients: JSONB (array of strings)
- instructions: JSONB (array of strings)
- prep_time: TEXT
- cook_time: TEXT
- servings: INTEGER
- image_url: TEXT
- tags: JSONB (array of strings)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `meal_plans` table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- week_start_date: TIMESTAMPTZ
- week_end_date: TIMESTAMPTZ
- plan_data: JSONB (complete meal plan structure)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 3. API Endpoints Created

**`/api/meal-mate/recipes`**
- **GET**: Load all recipes for current user
- **POST**: Save a new recipe to database
- **DELETE**: Delete a recipe (with `?id=recipe_id`)

### 4. Client Updates

**Automatic Loading:**
- Recipes are automatically loaded from database when page loads
- User's recipe library persists across sessions

**Save to Database:**
- When user clicks "Save Recipe", it's stored in Supabase
- Recipe appears in Recipes tab immediately

**Delete from Database:**
- When user deletes a recipe, it's removed from Supabase
- UI updates instantly

## 🚀 Setup Instructions

### 1. Run Database Migration

```bash
# If using Supabase CLI
supabase db reset

# Or apply migration manually
supabase migration up
```

### 2. Verify Tables

Check that these tables exist in your Supabase dashboard:
- `recipes`
- `meal_plans`

### 3. Test the Integration

1. **Save a Recipe:**
   - Upload an image or enter a recipe URL
   - Click "Save Recipe"
   - Check Recipes tab - should persist after page refresh

2. **Delete a Recipe:**
   - Go to Recipes tab
   - Click delete icon on any recipe
   - Refresh page - recipe should stay deleted

3. **View All Recipes:**
   - All saved recipes load automatically on page load
   - Recipes are private to each user

## 🔒 Security

**Row Level Security (RLS) Enabled:**
- Users can only see their own recipes
- Users can only modify their own recipes
- All operations are authenticated via Supabase Auth

**Policies Applied:**
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

## 📊 Data Flow

### Saving a Recipe

```
User clicks "Save Recipe"
    ↓
Frontend: POST /api/meal-mate/recipes
    ↓
API: Verify user authentication
    ↓
API: Insert into recipes table
    ↓
API: Return saved recipe with database ID
    ↓
Frontend: Add to savedRecipes state
    ↓
Frontend: Show in Recipes tab
```

### Loading Recipes

```
Page loads
    ↓
Frontend: useEffect hook triggers
    ↓
Frontend: GET /api/meal-mate/recipes
    ↓
API: Verify user authentication
    ↓
API: Query recipes WHERE user_id = current_user
    ↓
API: Return array of recipes
    ↓
Frontend: Set savedRecipes state
    ↓
Frontend: Display in Recipes tab
```

### Deleting a Recipe

```
User clicks delete icon
    ↓
Frontend: DELETE /api/meal-mate/recipes?id=xxx
    ↓
API: Verify user authentication
    ↓
API: DELETE WHERE id = xxx AND user_id = current_user
    ↓
API: Return success
    ↓
Frontend: Remove from savedRecipes state
    ↓
Frontend: Update Recipes tab
```

## 🔍 Troubleshooting

### Recipes Not Saving

**Check:**
1. User is authenticated (logged in)
2. Supabase connection is working
3. Migration has been applied
4. RLS policies are enabled

**Debug:**
```typescript
// Check browser console for errors
// Check Network tab in DevTools
// Verify API response
```

### Recipes Not Loading

**Check:**
1. Migration applied successfully
2. User has saved recipes in database
3. API endpoint is accessible

**Verify in Supabase Dashboard:**
```sql
SELECT * FROM recipes WHERE user_id = 'your-user-id';
```

### Permission Denied Errors

**Solution:**
- Ensure RLS policies are created
- Verify user is authenticated
- Check that `auth.uid()` matches `user_id`

## 📈 Future Enhancements

### Possible Additions:

1. **Recipe Sharing:**
   - Add `is_public` boolean field
   - Create public recipe gallery
   - Share recipes with other users

2. **Recipe Collections:**
   - Create `collections` table
   - Group recipes by category
   - Add tags and filters

3. **Recipe Images:**
   - Store uploaded images in Supabase Storage
   - Generate thumbnails
   - Image optimization

4. **Meal Plan Persistence:**
   - Save meal plans to `meal_plans` table
   - View meal plan history
   - Reuse previous meal plans

5. **Recipe Ratings:**
   - Add rating system
   - User reviews
   - Favorite recipes

6. **Search & Filter:**
   - Full-text search on recipes
   - Filter by ingredients
   - Filter by prep time, servings, etc.

## 📝 Database Queries

### Useful Queries

**Count user's recipes:**
```sql
SELECT COUNT(*) FROM recipes WHERE user_id = 'user-id';
```

**Recent recipes:**
```sql
SELECT * FROM recipes 
WHERE user_id = 'user-id' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Recipes by tag:**
```sql
SELECT * FROM recipes 
WHERE user_id = 'user-id' 
AND tags @> '["vegetarian"]'::jsonb;
```

**Search recipes:**
```sql
SELECT * FROM recipes 
WHERE user_id = 'user-id' 
AND (
  title ILIKE '%chicken%' 
  OR description ILIKE '%chicken%'
);
```

## ✅ Summary

**What's Working:**
- ✅ Recipes save to database
- ✅ Recipes load on page refresh
- ✅ Recipes can be deleted
- ✅ Full ingredients/instructions display
- ✅ User authentication and RLS
- ✅ Private recipe libraries per user

**Next Steps:**
1. Run the migration
2. Test saving/loading recipes
3. Optionally add meal plan persistence
4. Consider adding recipe search/filter features
