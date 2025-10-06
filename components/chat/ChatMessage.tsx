'use client';

import { cn } from '@/utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

interface ChatMessageProps {
  message: Message;
  userAvatar?: string;
  userName?: string;
}

export function ChatMessage({ message, userAvatar, userName }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className={cn(
        'flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <Avatar className={cn('h-8 w-8 shrink-0', isSystem && 'hidden')}>
        {isUser ? (
          <>
            <AvatarImage src={userAvatar} alt={userName || 'User'} />
            <AvatarFallback className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              {userName?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </>
        ) : (
          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-500 text-white">
            🍽️
          </AvatarFallback>
        )}
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col max-w-[80%] md:max-w-[70%]',
          isUser && 'items-end'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 shadow-sm',
            isUser
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : isSystem
                ? 'bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100 border border-blue-200 dark:border-blue-800'
                : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
          )}
        >
          {/* Image if present */}
          {message.imageUrl && (
            <div className="mb-2 rounded-lg overflow-hidden">
              <img
                src={message.imageUrl}
                alt="Uploaded content"
                className="max-w-full h-auto max-h-64 object-cover"
              />
            </div>
          )}

          {/* Text content */}
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
}
