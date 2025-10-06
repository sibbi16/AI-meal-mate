import { NextRequest, NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/gemini/service';

const FALLBACK_MESSAGE = "I'd love to help plan meals! Ask me for a weekly meal plan and I'll share ideas for breakfast, lunch, dinner, and snacks.";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({
        message: "Try sending me a question about meals or nutrition and I'll do my best to help!"
      });
    }

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
