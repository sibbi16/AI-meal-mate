import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { load as loadHtml } from 'cheerio';
import { Recipe, RawRecipeResponse, GeminiGenerateRecipeInput } from './types';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export class GeminiService {
  private readonly model: GenerativeModel;
  private readonly apiKey: string;

  constructor() {
    this.apiKey =
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';

    if (!this.apiKey) {
      throw new Error('Missing Gemini API key. Set GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY.');
    }

    const client = new GoogleGenerativeAI(this.apiKey);
    this.model = client.getGenerativeModel({
      model: DEFAULT_MODEL,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
      }
    });
  }

  async generateRecipe(input: GeminiGenerateRecipeInput): Promise<Recipe> {
    if (input.imageBase64 && input.imageMimeType) {
      const responseText = await this.generateFromImage(input.imageBase64, input.imageMimeType);
      return this.parseRecipeResponse(responseText);
    }

    if (input.prompt && this.isUrl(input.prompt)) {
      const url = input.prompt;

      if (this.isImageUrl(url)) {
        const { base64, mimeType } = await this.fetchImageAsBase64(url);
        const responseText = await this.generateFromImage(base64, mimeType);
        return this.parseRecipeResponse(responseText);
      }

      const extracted = await this.extractRecipeFromUrl(url);
      if (extracted) {
        return extracted;
      }

      const pageText = await this.fetchPageText(url);
      const responseText = await this.generateFromText(`Webpage content: ${pageText.slice(0, 4000)}`);
      return this.parseRecipeResponse(responseText);
    }

    if (input.prompt) {
      const responseText = await this.generateFromStructuredPrompt(input.prompt);
      return this.parseRecipeResponse(responseText);
    }

    return {
      recipeName: 'Error',
      ingredients: [],
      steps: [],
      duration: 'Not specified'
    };
  }

  async generateMealPlan(recipes: string[]): Promise<string> {
    if (!recipes.length) {
      throw new Error('No recipes provided for meal plan generation.');
    }

    const prompt = this.buildMealPlanPrompt(recipes);
    return this.generateFromText(prompt);
  }

  async generateChatReply(userMessage: string): Promise<string> {
    if (!userMessage.trim()) {
      throw new Error('Cannot generate reply for an empty message.');
    }

    const prompt = `You are Meal Mate, a friendly AI meal planning assistant.

User message: "${userMessage.trim()}"

Respond conversationally and helpfully. Keep the tone friendly and concise. Encourage the user to explore meal planning features when relevant.`;

    return this.generateFromText(prompt);
  }

  private async generateFromStructuredPrompt(userPrompt: string): Promise<string> {
    const prompt = `You are a professional chef. Using the user request below, produce a JSON object with this exact shape:
{
  "recipe_name": string,
  "ingredients": string[],
  "steps": string[],
  "duration": string
}

Rules:
- Only output JSON. Do not wrap in backticks.
- Each ingredient must include quantities when possible.
- Steps must be detailed instructions.
- Duration must be a total time string like "30 minutes".

User request: ${userPrompt}`;

    return this.generateFromText(prompt);
  }

  private async generateFromImage(base64: string, mimeType: string): Promise<string> {
    const result = await this.model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64,
                mimeType
              }
            },
            { text: this.getRecipeFormatPrompt() }
          ]
        }
      ]
    });

    return this.extractText(result);
  }

  private async generateFromText(text: string): Promise<string> {
    const result = await this.model.generateContent(text);
    return this.extractText(result);
  }

  private extractText(result: Awaited<ReturnType<GenerativeModel['generateContent']>>): string {
    try {
      const { response } = result;
      if (!response) {
        throw new Error('No response from Gemini');
      }

      if (typeof response.text === 'function') {
        return response.text();
      }

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts as Array<{ text?: string }> | undefined;
      const textPart = parts?.find((part) => typeof part.text === 'string' && part.text.length > 0);
      if (textPart?.text) {
        return textPart.text;
      }

      return JSON.stringify(response);
    } catch (error) {
      console.error('Failed to extract Gemini response text', error);
      throw new Error('Failed to extract Gemini response text');
    }
  }

  private parseRecipeResponse(rawText: string): Recipe {
    const cleaned = rawText.trim();
    const jsonSection = this.extractJson(cleaned);

    if (jsonSection) {
      try {
        const parsed = JSON.parse(jsonSection) as RawRecipeResponse;
        return this.transformRecipe(parsed);
      } catch (error) {
        console.warn('Gemini returned invalid JSON, falling back to regex parsing.', error);
      }
    }

    return this.parseRecipeFromFormattedText(cleaned);
  }

  private transformRecipe(raw: RawRecipeResponse): Recipe {
    return {
      recipeName: raw.recipe_name?.trim() || 'Generated Recipe',
      ingredients: raw.ingredients?.map((item) => item.trim()).filter(Boolean) || ['No ingredients found'],
      steps: raw.steps?.map((item) => item.trim()).filter(Boolean) || ['No steps found'],
      duration: raw.duration?.trim() || 'Not specified'
    };
  }

  private parseRecipeFromFormattedText(text: string): Recipe {
    const recipeName = this.extractSingle(text, [
      /RECIPE NAME:\s*(.+)/i,
      /^(.+?)(?:\n|$)/,
      /#\s*(.+)/
    ]) || 'Generated Recipe';

    const duration = this.extractSingle(text, [
      /DURATION:\s*(.+)/i,
      /TOTAL TIME:\s*(.+)/i,
      /COOKING TIME:\s*(.+)/i
    ]) || 'Not specified';

    const ingredients = this.extractListSection(text, 'INGREDIENTS');
    const steps = this.extractListSection(text, 'STEPS');

    return {
      recipeName,
      ingredients: ingredients.length ? ingredients : ['No ingredients found'],
      steps: steps.length ? steps : ['No steps found'],
      duration
    };
  }

  private extractSingle(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (candidate && !/^INGREDIENTS/i.test(candidate) && !/^STEPS/i.test(candidate)) {
          return candidate;
        }
      }
    }
    return null;
  }

  private extractListSection(text: string, sectionTitle: string): string[] {
    const regex = new RegExp(`${sectionTitle}:?\\n([\\s\\S]*?)(?:\\n\\n|$|^[A-Z ]+:)`, 'im');
    const match = text.match(regex);
    if (!match || !match[1]) {
      return [];
    }

    return match[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^[-*•\d.\s]+/, '').trim())
      .filter(Boolean);
  }

  private extractJson(text: string): string | null {
    const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      return fenceMatch[1].trim();
    }

    const plainMatch = text.match(/\{[\s\S]*\}/);
    return plainMatch ? plainMatch[0] : null;
  }

  private async extractRecipeFromUrl(url: string): Promise<Recipe | null> {
    try {
      const response = await fetchWithTimeout(url, { headers: DEFAULT_HEADERS });
      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      const $ = loadHtml(html);

      const scripts = $('script[type="application/ld+json"]').toArray();
      for (const script of scripts) {
        const jsonText = $(script).contents().text();
        if (!jsonText) continue;

        try {
          const data = JSON.parse(jsonText);
          const recipe = this.findRecipeInJsonLd(data);
          if (recipe) {
            return recipe;
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      console.warn('Failed to extract recipe from url', error);
    }

    return null;
  }

  private findRecipeInJsonLd(data: unknown): Recipe | null {
    if (Array.isArray(data)) {
      for (const item of data) {
        const recipe = this.findRecipeInJsonLd(item);
        if (recipe) return recipe;
      }
      return null;
    }

    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      const nodeType = obj['@type'];
      if (typeof nodeType === 'string' && nodeType.toLowerCase() === 'recipe') {
        const name = typeof obj['name'] === 'string' ? obj['name'] : 'Unknown Recipe';
        const ingredientNode = obj['recipeIngredient'];
        const ingredients = Array.isArray(ingredientNode)
          ? ingredientNode.map((item) => String(item)).filter(Boolean)
          : [];
        const duration = typeof obj['totalTime'] === 'string' ? obj['totalTime'] : 'Not specified';

        return {
          recipeName: name,
          ingredients,
          steps: this.normaliseInstructions(obj['recipeInstructions']),
          duration
        };
      }

      for (const key of Object.keys(obj)) {
        const recipe = this.findRecipeInJsonLd(obj[key]);
        if (recipe) return recipe;
      }
    }

    return null;
  }
  
  private normaliseInstructions(instructions: unknown): string[] {
    if (!instructions) return [];

    if (Array.isArray(instructions)) {
      return instructions
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') {
            const text = (item as { text?: unknown; name?: unknown }).text;
            const name = (item as { text?: unknown; name?: unknown }).name;
            if (typeof text === 'string' && text.trim()) return text.trim();
            if (typeof name === 'string' && name.trim()) return name.trim();
          }
          return '';
        })
        .filter(Boolean);
    }

    if (typeof instructions === 'string') {
      return instructions.split('\n').map((line) => line.trim()).filter(Boolean);
    }

    return [];
  }

  private async fetchPageText(url: string): Promise<string> {
    const response = await fetchWithTimeout(url, { headers: DEFAULT_HEADERS });
    if (!response.ok) {
      throw new Error('Failed to fetch webpage content');
    }
    const html = await response.text();
    const $ = loadHtml(html);
    return $('body').text();
  }

  private async fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
    const response = await fetchWithTimeout(url, { headers: DEFAULT_HEADERS });
    if (!response.ok) {
      throw new Error('Failed to fetch image URL');
    }
    const mimeType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());
    return { base64: buffer.toString('base64'), mimeType };
  }

  private isUrl(text: string): boolean {
    try {
      const url = new URL(text);
      return Boolean(url.protocol.startsWith('http'));
    } catch {
      return false;
    }
  }

  private isImageUrl(url: string): boolean {
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some((ext) => url.toLowerCase().endsWith(ext));
  }

  private getRecipeFormatPrompt(): string {
    return `You are a professional chef. Generate a detailed recipe and format it EXACTLY as shown below. Do not deviate from this format:

RECIPE NAME: [Name of the recipe]

DURATION: [Total time like "30 minutes" or "1 hour 30 minutes"]

INGREDIENTS:
- [First ingredient with exact measurements]
- [Second ingredient with exact measurements]
- [Continue with each ingredient on a separate line starting with dash]

STEPS:
1. [First step with detailed instructions]
2. [Second step with detailed instructions]
3. [Continue with numbered steps]

CRITICAL: Follow this exact format. Do not add extra text, explanations, or formatting outside these sections.`;
  }

  private buildMealPlanPrompt(recipes: string[]): string {
    const recipeList = recipes.join(', ');
    return `Create a comprehensive weekly meal plan using these recipes: ${recipeList}.

Please create a detailed 7-day meal plan that includes:

1. RECIPE LIST: ${recipeList}

2. WEEKLY MEAL PLAN:
   - Monday: Breakfast, Lunch, Dinner, Snacks
   - Tuesday: Breakfast, Lunch, Dinner, Snacks
   - Wednesday: Breakfast, Lunch, Dinner, Snacks
   - Thursday: Breakfast, Lunch, Dinner, Snacks
   - Friday: Breakfast, Lunch, Dinner, Snacks
   - Saturday: Breakfast, Lunch, Dinner, Snacks
   - Sunday: Breakfast, Lunch, Dinner, Snacks

3. MEAL PREP TIPS:
   - Suggestions for preparing meals in advance
   - Storage recommendations
   - Time-saving strategies

4. SHOPPING LIST:
   - Organized by food categories
   - Quantities for the entire week

5. NUTRITIONAL NOTES:
   - Key nutrients and health benefits
   - Portion size recommendations
   - Dietary considerations

Make sure to incorporate the provided recipes throughout the week in a balanced and practical way.`;
  }
}

let singleton: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!singleton) {
    singleton = new GeminiService();
  }
  return singleton;
}
