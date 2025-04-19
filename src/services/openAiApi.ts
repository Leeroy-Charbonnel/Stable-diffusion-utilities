// src/services/openAiApi.ts
import { AiModel, ChatMessage } from '@/types';

//OpenAI API URLs
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

//OpenAI API request interface
interface OpenAIRequest {
  model: string;
  messages: {
    role: string;
    content: string;
  }[];
  temperature: number;
  max_tokens?: number;
}

//OpenAI API response interface
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

//Chat with OpenAI
export const chatWithOpenAI = async (
  apiKey: string,
  model: AiModel,
  messages: { role: string; content: string }[],
  temperature: number = 0.7,
  maxTokens?: number
): Promise<string | null> => {
  try {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const requestBody: OpenAIRequest = {
      model,
      messages,
      temperature,
    };

    if (maxTokens) {
      requestBody.max_tokens = maxTokens;
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json() as OpenAIResponse;
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
};

//Generate a chat completion
export const generateChatCompletion = async (
  apiKey: string,
  model: AiModel,
  messages: ChatMessage[],
  temperature: number = 0.7,
  maxTokens?: number
): Promise<string | null> => {
  //Convert our ChatMessage format to OpenAI format
  const openAiMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  return chatWithOpenAI(apiKey, model, openAiMessages, temperature, maxTokens);
};