'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { suggestSmartReplies } from '@/ai/flows/smart-reply-suggestion';
import { Button } from '../ui/button';
import { Message } from '@/lib/types';

interface SmartRepliesProps {
  lastMessage: Message | null;
  onSuggestionClick: (suggestion: string) => void;
  chatHistory: string[];
}

export default function SmartReplies({ lastMessage, onSuggestionClick, chatHistory }: SmartRepliesProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lastMessage && lastMessage.text) {
      const fetchSuggestions = async () => {
        setLoading(true);
        try {
          const result = await suggestSmartReplies({
            messageContent: lastMessage.text!,
            chatHistory: chatHistory.slice(-5), // Use last 5 messages for context
          });
          setSuggestions(result.suggestions);
        } catch (error) {
          console.error('Failed to fetch smart replies:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      };
      fetchSuggestions();
    } else {
        setSuggestions([]);
    }
  }, [lastMessage, chatHistory]);

  if (!lastMessage || suggestions.length === 0 && !loading) return null;

  return (
    <div className="mb-2 h-8">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating replies...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
           <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="h-auto py-1 px-3 whitespace-nowrap"
              onClick={() => onSuggestionClick(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
