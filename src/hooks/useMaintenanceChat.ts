import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MaintenanceFormData {
  propertyId: string;
  issueNature: string;
  explanation: string;
  location: string;
  submittedBy: string;
  attemptedFix: string;
  isParticipantRelated?: boolean;
  participantName?: string;
}

interface Property {
  id: string;
  name: string;
}

interface Housemate {
  firstName: string;
  lastName: string;
}

interface UseMaintenanceChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isReady: boolean;
  formData: MaintenanceFormData | null;
  sendMessage: (content: string) => Promise<void>;
  resetChat: () => void;
  initializeChat: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-maintenance-request`;

// Validation for extracted form data
function validateFormData(data: MaintenanceFormData, properties: Property[]): string | null {
  // Check propertyId exists in properties list
  const propertyExists = properties.some(p => p.id === data.propertyId);
  if (!propertyExists) {
    return "The property couldn't be matched. Please clarify which property this is for.";
  }

  // Check required fields are not empty or placeholder-like
  const placeholderPatterns = [
    /^\[.*\]$/,           // [placeholder]
    /^test$/i,            // test
    /^example$/i,         // example
    /^n\/a$/i,            // n/a
    /^placeholder$/i,     // placeholder
    /^unknown$/i,         // unknown
    /^tbd$/i,             // tbd
  ];

  const requiredFields: (keyof MaintenanceFormData)[] = [
    'issueNature', 'explanation', 'location', 'submittedBy', 'attemptedFix'
  ];

  for (const field of requiredFields) {
    const value = data[field];
    if (typeof value !== 'string') continue;
    
    const trimmed = value.trim();
    if (!trimmed) {
      return `Missing ${field}. Please provide this information.`;
    }
    
    // Check for placeholder patterns
    if (placeholderPatterns.some(pattern => pattern.test(trimmed))) {
      return `The ${field} looks like a placeholder. Please provide the actual information.`;
    }
  }

  // Check explanation has reasonable length
  if (data.explanation.trim().split(/\s+/).length < 3) {
    return "The description is too brief. Please provide more details about the issue.";
  }

  return null; // Valid
}

export function useMaintenanceChat(
  properties: Property[] = [], 
  selectedPropertyId?: string,
  housemates: Housemate[] = []
): UseMaintenanceChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [formData, setFormData] = useState<MaintenanceFormData | null>(null);

  // Get selected property name
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = { role: 'user', content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    let assistantContent = '';
    
    // Determine mode: if user types SUBMIT, use extract mode
    const isSubmitRequest = content.trim().toUpperCase() === 'SUBMIT';
    const mode = isSubmitRequest ? 'extract' : 'chat';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: updatedMessages,
          properties: properties.map(p => ({ id: p.id, name: p.name })),
          housemates: housemates.map(h => ({ firstName: h.firstName, lastName: h.lastName })),
          mode,
          selectedPropertyId, // Pass the pre-selected property
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 402) {
          toast.error('AI service unavailable. Please try the regular form.');
        } else {
          toast.error(errorData.error || 'Failed to get response');
        }
        setIsLoading(false);
        return;
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let toolCallArgs = '';
      let isToolCall = false;

      const updateAssistant = (newContent: string) => {
        assistantContent = newContent;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
          }
          return [...prev, { role: 'assistant', content: assistantContent }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;

            // Handle regular content
            if (delta?.content) {
              updateAssistant(assistantContent + delta.content);
            }

            // Handle tool calls - ONLY process in extract mode
            if (mode === 'extract' && delta?.tool_calls?.[0]) {
              isToolCall = true;
              const toolCall = delta.tool_calls[0];
              if (toolCall.function?.arguments) {
                toolCallArgs += toolCall.function.arguments;
              }
            }

            // Check for finish reason - ONLY process tool calls in extract mode
            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (mode === 'extract' && finishReason === 'tool_calls' && toolCallArgs) {
              try {
                const extractedData = JSON.parse(toolCallArgs) as MaintenanceFormData;
                
                // If property was pre-selected, override with that
                if (selectedPropertyId) {
                  extractedData.propertyId = selectedPropertyId;
                }
                
                console.log('Form data extracted:', extractedData);
                
                // Validate the extracted data
                const validationError = validateFormData(extractedData, properties);
                
                if (validationError) {
                  // Validation failed - show error message, don't set ready
                  console.log('Validation failed:', validationError);
                  updateAssistant(validationError + "\n\nPlease provide the missing information and type SUBMIT again when ready.");
                } else {
                  // Validation passed - set form data and ready state
                  setFormData(extractedData);
                  setIsReady(true);
                  
                  // Find property name for display
                  const propertyName = properties.find(p => p.id === extractedData.propertyId)?.name || extractedData.propertyId;
                  
                  // Add a confirmation message
                  const confirmMsg = `Great! I've collected all the information:\n\n` +
                    `Property: ${propertyName}\n` +
                    `Issue: ${extractedData.issueNature}\n` +
                    `Location: ${extractedData.location}\n` +
                    `Description: ${extractedData.explanation}\n` +
                    `Reported by: ${extractedData.submittedBy}\n` +
                    `Attempted fix: ${extractedData.attemptedFix}\n\n` +
                    `Please upload at least one photo of the issue, then click "Submit Request" to complete your report.`;
                  updateAssistant(confirmMsg);
                }
              } catch (e) {
                console.error('Failed to parse tool call arguments:', e);
                updateAssistant("I had trouble processing your request. Please try typing SUBMIT again.");
              }
            }
          } catch {
            // Incomplete JSON, put it back
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Handle any remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(assistantContent + content);
          } catch { /* ignore */ }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [messages, properties, selectedPropertyId]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    setIsReady(false);
    setFormData(null);
  }, []);

  const initializeChat = useCallback(() => {
    if (messages.length === 0) {
      // Customize greeting based on whether property is pre-selected
      const greeting = selectedProperty
        ? `Hi! I'm here to help you report a maintenance issue for ${selectedProperty.name}. What issue are you experiencing?`
        : "Hi! I'm here to help you report a maintenance issue. Which property is this issue at?";
      
      setMessages([{
        role: 'assistant',
        content: greeting
      }]);
    }
  }, [messages.length, selectedProperty]);

  return {
    messages,
    isLoading,
    isReady,
    formData,
    sendMessage,
    resetChat,
    initializeChat,
  };
}
