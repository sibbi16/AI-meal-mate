import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - Fetch all meal plans for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch meal plans
    const { data: mealPlans, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching meal plans:', error);
      return NextResponse.json({ error: 'Failed to fetch meal plans' }, { status: 500 });
    }

    // Transform database format to frontend format
    const transformedMealPlans = mealPlans?.map(plan => ({
      id: plan.id,
      weekStartDate: plan.week_start_date,
      weekEndDate: plan.week_end_date,
      days: plan.plan_data,
      createdAt: new Date(plan.created_at)
    })) || [];

    return NextResponse.json({ mealPlans: transformedMealPlans });

  } catch (error) {
    console.error('Error in GET /api/meal-mate/meal-plans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save a new meal plan
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mealPlan = await request.json();

    // Insert meal plan into database
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        week_start_date: mealPlan.weekStartDate,
        week_end_date: mealPlan.weekEndDate,
        plan_data: mealPlan.days
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving meal plan:', error);
      return NextResponse.json({ error: 'Failed to save meal plan' }, { status: 500 });
    }

    // Transform back to frontend format
    const savedMealPlan = {
      id: data.id,
      weekStartDate: data.week_start_date,
      weekEndDate: data.week_end_date,
      days: data.plan_data,
      createdAt: new Date(data.created_at)
    };

    return NextResponse.json({ mealPlan: savedMealPlan });

  } catch (error) {
    console.error('Error in POST /api/meal-mate/meal-plans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a meal plan
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mealPlanId = searchParams.get('id');

    if (!mealPlanId) {
      return NextResponse.json({ error: 'Meal plan ID required' }, { status: 400 });
    }

    // Delete meal plan
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', mealPlanId)
      .eq('user_id', user.id); // Ensure user owns the meal plan

    if (error) {
      console.error('Error deleting meal plan:', error);
      return NextResponse.json({ error: 'Failed to delete meal plan' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/meal-mate/meal-plans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
