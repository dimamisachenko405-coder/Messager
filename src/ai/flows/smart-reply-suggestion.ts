'use server';
/**
 * @fileOverview A Genkit flow for generating smart reply suggestions.
 *
 * - suggestSmartReplies - A function that generates smart reply suggestions based on message content and chat history.
 * - SmartReplySuggestionInput - The input type for the suggestSmartReplies function.
 * - SmartReplySuggestionOutput - The return type for the suggestSmartReplies function.
 */

// All AI functionality is temporarily disabled to prevent server crashes.

import { z } from 'genkit';

export const SmartReplySuggestionInputSchema = z.object({
  messageContent: z.string().describe('The content of the most recent message for which to suggest replies.'),
  chatHistory: z.array(z.string()).optional().describe('An optional array of previous messages in the conversation for context.'),
});
export type SmartReplySuggestionInput = z.infer<typeof SmartReplySuggestionInputSchema>;

export const SmartReplySuggestionOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested short replies for the message.'),
});
export type SmartReplySuggestionOutput = z.infer<typeof SmartReplySuggestionOutputSchema>;


export async function suggestSmartReplies(
  input: SmartReplySuggestionInput
): Promise<SmartReplySuggestionOutput> {
  console.warn("AI smart replies are currently disabled due to a server-side issue.");
  return { suggestions: [] };
}
