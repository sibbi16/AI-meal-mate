'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/cn';

export interface MealPlanDay {
  day: string;
  date: string;
  meals: {
    breakfast?: {
      name: string;
      description?: string;
    };
    lunch?: {
      name: string;
      description?: string;
    };
    dinner?: {
      name: string;
      description?: string;
    };
  };
}

export interface MealPlan {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  days: MealPlanDay[];
  createdAt: Date;
}

interface MealPlanViewProps {
  mealPlan: MealPlan;
}

export function MealPlanView({ mealPlan }: MealPlanViewProps) {
  return (
    <Card className="overflow-hidden border-2 border-orange-200 dark:border-orange-900">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
        <CardTitle className="text-2xl flex items-center gap-2">
          <span>📅</span>
          <span>Weekly Meal Plan</span>
        </CardTitle>
        <p className="text-sm text-white/90 mt-1">
          {new Date(mealPlan.weekStartDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric'
          })}{' '}
          -{' '}
          {new Date(mealPlan.weekEndDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {mealPlan.days.map((day, idx) => (
            <div key={idx} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
              {/* Day header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{day.day}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Meals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Breakfast */}
                <MealSlot
                  label="Breakfast"
                  meal={day.meals.breakfast}
                  icon="☀️"
                />

                {/* Lunch */}
                <MealSlot
                  label="Lunch"
                  meal={day.meals.lunch}
                  icon="🌤️"
                />

                {/* Dinner */}
                <MealSlot
                  label="Dinner"
                  meal={day.meals.dinner}
                  icon="🌙"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface MealSlotProps {
  label: string;
  meal?: {
    name: string;
    description?: string;
  };
  icon: string;
}

function MealSlot({ label, meal, icon }: MealSlotProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      {meal ? (
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {meal.name}
          </p>
          {meal.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
              {meal.description}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-400 dark:text-zinc-600 italic">No meal planned</p>
      )}
    </div>
  );
}
