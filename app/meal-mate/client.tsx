'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage, Message } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { MealPlanView, MealPlan } from '@/components/chat/MealPlanView';
import { RecipeCard, Recipe } from '@/components/chat/RecipeCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserWithRoles } from '@/utils/supabase/server';
import { toast } from 'sonner';
interface MealMateClientProps {
  user: UserWithRoles | null;
}

export function MealMateClient({ user }: MealMateClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [currentMealPlan, setCurrentMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'recipes' | 'meal-plan'>('chat');
  const [isInitialized, setIsInitialized] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (value: string) => {
    if (value === 'chat' || value === 'recipes' || value === 'meal-plan') {
      setActiveTab(value);
    }
  };

  // Initialize welcome message and load recipes on client side only
  useEffect(() => {
    if (!isInitialized) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: "👋 Hi! I'm Meal Mate, your AI cooking assistant. I can help you:\n\n• Save recipes from images, URLs, or text\n• Organize your recipe library\n• Create personalized weekly meal plans\n\nHow can I help you today?",
          timestamp: new Date()
        }
      ]);
      setIsInitialized(true);
      
      // Load saved recipes and meal plans from database
      loadRecipes();
      loadMealPlans();
    }
  }, [isInitialized]);

  const loadRecipes = async () => {
    try {
      const response = await fetch('/api/meal-mate/recipes');
      if (response.ok) {
        const data = await response.json();
        setSavedRecipes(data.recipes || []);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  const loadMealPlans = async () => {
    try {
      const response = await fetch('/api/meal-mate/meal-plans');
      if (response.ok) {
        const data = await response.json();
        // Load the most recent meal plan
        if (data.mealPlans && data.mealPlans.length > 0) {
          setCurrentMealPlan(data.mealPlans[0]);
        }
      }
    } catch (error) {
      console.error('Error loading meal plans:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: Message['role'], content: string, extra?: Partial<Message>) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      ...extra
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const handleSendMessage = async (message: string) => {
    addMessage('user', message);
    setIsLoading(true);

    try {
      // Check if it's a URL
      const urlPattern = /^https?:\/\//;
      if (urlPattern.test(message)) {
        addMessage('assistant', '🔍 Analyzing the recipe from this URL...');
        
        const response = await fetch('/api/meal-mate/extract-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message,
            type: 'url',
            userId: user?.id
          })
        });

        if (!response.ok) throw new Error('Failed to extract recipe');

        const data = await response.json();
        setCurrentRecipe(data.recipe);
        addMessage('assistant', '✨ ' + data.message);
        return;
      }

      // Check if user is asking for a meal plan or answering meal plan questions
      const mealPlanKeywords = ['meal plan', 'weekly plan', 'week', 'plan for', 'create plan', 'generate plan'];
      const isMealPlanRequest = mealPlanKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );

      if (isMealPlanRequest) {
        if (savedRecipes.length === 0) {
          addMessage('assistant', '📚 You need to save some recipes first before I can create a meal plan. Try adding recipes by sharing a URL, uploading an image, or describing a recipe!');
          return;
        }

        // Use chat API to handle conversational meal planning
        const response = await fetch('/api/meal-mate/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message,
            userId: user?.id,
            recipeCount: savedRecipes.length,
            hasExistingPlan: currentMealPlan !== null
          })
        });

        if (!response.ok) throw new Error('Failed to get response');

        const data = await response.json();
        addMessage('assistant', data.message);

        // If AI says to generate, trigger generation
        if (data.shouldGenerate) {
          await handleGenerateMealPlan(data.numberOfDays || 7, data.startDate);
        }
        return;
      }

      // Check if user is describing a recipe
      const recipeKeywords = ['recipe', 'cook', 'make', 'prepare', 'ingredient', 'dish'];
      const isRecipeDescription = recipeKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );

      if (isRecipeDescription) {
        addMessage('assistant', '👨‍🍳 Extracting recipe from your description...');
        
        const response = await fetch('/api/meal-mate/extract-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message,
            type: 'text',
            userId: user?.id
          })
        });

        if (!response.ok) throw new Error('Failed to extract recipe');

        const data = await response.json();
        setCurrentRecipe(data.recipe);
        addMessage('assistant', '✨ ' + data.message);
        return;
      }

      // Check if user is responding with a number or "edit"/"new" (for meal plan days)
      const numberOnlyMatch = message.match(/^(\d+)\s*(?:days?)?$/i);
      const isEditOrNew = message.toLowerCase().includes('edit') || message.toLowerCase().includes('new');
      
      if ((numberOnlyMatch || isEditOrNew) && savedRecipes.length > 0) {
        const response = await fetch('/api/meal-mate/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message,
            userId: user?.id,
            recipeCount: savedRecipes.length,
            hasExistingPlan: currentMealPlan !== null
          })
        });

        if (!response.ok) throw new Error('Failed to get response');

        const data = await response.json();
        addMessage('assistant', data.message);

        if (data.shouldGenerate) {
          await handleGenerateMealPlan(data.numberOfDays || 7, data.startDate);
        }
        return;
      }

      // General conversation
      const response = await fetch('/api/meal-mate/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          userId: user?.id
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      addMessage('assistant', data.message);
    } catch (error) {
      console.error('Error:', error);
      addMessage('assistant', 'Sorry, I encountered an error. Please try again!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMealPlan = async (numberOfDays: number = 7, startDate?: string | null) => {
    setIsGeneratingPlan(true);
    const dateInfo = startDate ? ` starting from ${new Date(startDate).toLocaleDateString()}` : '';
    const toastId = toast.loading(`Generating your ${numberOfDays}-day meal plan${dateInfo}...`);

    try {
      addMessage('assistant', `🎨 Creating your personalized ${numberOfDays}-day meal plan${dateInfo} using your saved recipes...`);
      
      const response = await fetch('/api/meal-mate/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userMessage: `Create a meal plan for ${numberOfDays} days${dateInfo}`,
          userId: user?.id,
          recipes: savedRecipes,
          numberOfDays,
          startDate
        })
      });

      if (!response.ok) throw new Error('Failed to generate meal plan');

      const data = await response.json();
      
      if (data.mealPlan) {
        setCurrentMealPlan(data.mealPlan);
        toast.success(`${numberOfDays}-day meal plan created successfully!`, { id: toastId });
        addMessage('assistant', `✨ Your ${numberOfDays}-day meal plan is ready! Check the Meal Plan tab to see it.`);
        setActiveTab('meal-plan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate meal plan. Please try again.', { id: toastId });
      addMessage('assistant', 'Sorry, I encountered an error creating the meal plan. Please try again!');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSendImage = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    addMessage('user', 'I uploaded a recipe image', { imageUrl });
    setIsLoading(true);

    try {
      addMessage('assistant', '📸 Analyzing the recipe from your image...');
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', user?.id || '');

      const response = await fetch('/api/meal-mate/extract-from-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to extract recipe from image');

      const data = await response.json();
      setCurrentRecipe({ ...data.recipe, imageUrl });
      addMessage('assistant', '✨ ' + data.message);
    } catch (error) {
      console.error('Error:', error);
      addMessage('assistant', 'Sorry, I couldn\'t process the image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
    setIsSavingRecipe(true);
    const toastId = toast.loading('Saving recipe...');
    
    try {
      const response = await fetch('/api/meal-mate/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe)
      });

      if (response.ok) {
        const data = await response.json();
        setSavedRecipes((prev) => [...prev, data.recipe]);
        setCurrentRecipe(null);
        toast.success(`Recipe "${recipe.title}" saved successfully!`, { id: toastId });
        addMessage('system', `✅ Recipe "${recipe.title}" has been saved to your library!`);
        setActiveTab('recipes');
      } else {
        toast.error('Failed to save recipe. Please try again.', { id: toastId });
        addMessage('system', '❌ Failed to save recipe. Please try again.');
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast.error('Failed to save recipe. Please try again.', { id: toastId });
      addMessage('system', '❌ Failed to save recipe. Please try again.');
    } finally {
      setIsSavingRecipe(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/meal-mate/recipes?id=${recipeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSavedRecipes((prev) => prev.filter((r) => r.id !== recipeId));
        addMessage('system', '🗑️ Recipe deleted from your library.');
      } else {
        addMessage('system', '❌ Failed to delete recipe. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      addMessage('system', '❌ Failed to delete recipe. Please try again.');
    }
  };

  const handleCreateMealPlan = async () => {
    if (savedRecipes.length === 0) {
      toast.error('You need to save some recipes first!');
      addMessage('assistant', '📚 You need to save some recipes first before I can create a meal plan. Try adding recipes by sharing a URL, uploading an image, or describing a recipe!');
      setActiveTab('chat');
      return;
    }

    addMessage('user', 'Create a meal plan for this week');
    setIsGeneratingPlan(true);
    const toastId = toast.loading('Generating your meal plan...');

    try {
      addMessage('assistant', '🎨 Creating your personalized weekly meal plan using your saved recipes...');
      
      const response = await fetch('/api/meal-mate/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userMessage: 'Create a meal plan for this week',
          userId: user?.id,
          recipes: savedRecipes
        })
      });

      if (!response.ok) throw new Error('Failed to generate meal plan');

      const data = await response.json();
      
      if (data.mealPlan) {
        setCurrentMealPlan(data.mealPlan);
        toast.success('Meal plan created and saved successfully!', { id: toastId });
        addMessage('assistant', '✨ Your weekly meal plan is ready and saved! Check the Meal Plan tab to see it.');
        setActiveTab('meal-plan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate meal plan. Please try again.', { id: toastId });
      addMessage('assistant', 'Sorry, I encountered an error creating the meal plan. Please try again!');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-2xl">
              🍽️
            </div>
            <div>
              <h1 className="text-xl font-bold">Meal Mate</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Your AI Cooking Assistant
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleCreateMealPlan}
            variant="default"
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            Create Meal Plan
          </Button>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-zinc-200 dark:border-zinc-800 bg-transparent h-auto p-0">
          <TabsTrigger
            value="chat"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="recipes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            Recipes ({savedRecipes.length})
          </TabsTrigger>
          <TabsTrigger
            value="meal-plan"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            Meal Plan
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900/50"
          >
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                userAvatar={user?.avatar_url ?? undefined}
                userName={user?.full_name ?? 'You'}
              />
            ))}

            {/* Current Recipe Preview */}
            {currentRecipe && (
              <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <RecipeCard
                  recipe={currentRecipe}
                  onSave={handleSaveRecipe}
                  showActions={true}
                  compact={false}
                  isSaving={isSavingRecipe}
                />
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm">Meal Mate is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            onSendMessage={handleSendMessage}
            onSendImage={handleSendImage}
            disabled={isLoading}
          />
        </TabsContent>

        {/* Recipes Tab */}
        <TabsContent value="recipes" className="flex-1 overflow-y-auto p-4 mt-0 data-[state=inactive]:hidden">
          {savedRecipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-4xl mb-4">
                📚
              </div>
              <h3 className="text-xl font-semibold mb-2">No recipes yet</h3>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-md mb-6">
                Start adding recipes by chatting with Meal Mate. You can share URLs, upload images, or describe recipes!
              </p>
              <Button onClick={() => setActiveTab('chat')}>
                Go to Chat
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onDelete={handleDeleteRecipe}
                  showActions={true}
                  compact={false}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Meal Plan Tab */}
        <TabsContent value="meal-plan" className="flex-1 overflow-y-auto p-4 mt-0 data-[state=inactive]:hidden">
          {currentMealPlan ? (
            <MealPlanView mealPlan={currentMealPlan} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-4xl mb-4">
                📅
              </div>
              <h3 className="text-xl font-semibold mb-2">No meal plan yet</h3>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-md mb-6">
                Create a weekly meal plan using your saved recipes. I'll help you organize your meals for the week!
              </p>
              <Button
                onClick={handleCreateMealPlan}
                disabled={savedRecipes.length === 0 || isGeneratingPlan}
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
              >
                {isGeneratingPlan ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating Plan...
                  </>
                ) : (
                  'Create Meal Plan'
                )}
              </Button>
              {savedRecipes.length === 0 && (
                <p className="text-sm text-zinc-400 mt-3">
                  Add some recipes first to create a meal plan
                </p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
