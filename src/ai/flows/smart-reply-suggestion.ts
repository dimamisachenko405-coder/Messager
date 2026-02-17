'use server';
/**
 * @fileOverview A Genkit flow for generating smart reply suggestions.
 *
 * - suggestSmartReplies - A function that generates smart reply suggestions based on message content and chat history.
 * - SmartReplySuggestionInput - The input type for the suggestSmartReplies function.
 * - SmartReplySuggestionOutput - The return type for the suggestSmartReplies function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SmartReplySuggestionInputSchema = z.object({
  messageContent: z.string().describe('The content of the most recent message for which to suggest replies.'),
  chatHistory: z.array(z.string()).optional().describe('An optional array of previous messages in the conversation for context.'),
});
export type SmartReplySuggestionInput = z.infer<typeof SmartReplySuggestionInputSchema>;

const SmartReplySuggestionOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested short replies for the message.'),
});
export type SmartReplySuggestionOutput = z.infer<typeof SmartReplySuggestionOutputSchema>;

const smartReplyPrompt = ai.definePrompt({
  name: 'smartReplyPrompt',
  input: { schema: SmartReplySuggestionInputSchema },
  output: { schema: SmartReplySuggestionOutputSchema },
  prompt: `You are a helpful assistant that generates short, context-aware, and intelligent reply suggestions for a chat application.
The user has received a new message, and you need to provide 3-5 concise reply options.
Consider the chat history if provided.

Chat History:
{{#if chatHistory}}
{{#each chatHistory}}
- {{{this}}}
{{/each}}
{{else}}
No chat history available.
{{/if}}

New Message: "{{{messageContent}}}"

Please provide 3-5 distinct and relevant reply suggestions.
`,
});

const smartReplySuggestionFlow = ai.defineFlow(
  {
    name: 'smartReplySuggestionFlow',
    inputSchema: SmartReplySuggestionInputSchema,
    outputSchema: SmartReplySuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await smartReplyPrompt(input);
    return output!;
  }
);

export async function suggestSmartReplies(
  input: SmartReplySuggestionInput
): Promise<SmartReplySuggestionOutput> {
  return smartReplySuggestionFlow(input);
}
