// src/services/openAiApi.ts
import { ChatMessage } from '@/types';
import { OPENAI_API_MODEL, OPENAI_API_URL } from '@/lib/constantsAI';
import { DEFAULT_AI_API_KEY } from '@/lib/constantsKeys';

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

export const getOpenAiModels = async (): Promise<any> => {
  try {
    const response = await fetch(OPENAI_API_MODEL, {
      method: 'GET',  // Changed from POST to GET as model listing is usually a GET operation
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEFAULT_AI_API_KEY}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    //Only parse the response once and return it
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    //Return a structured object to prevent null reference errors
    return { data: [] };
  }
}

//Chat with OpenAI
export const chatWithOpenAI = async (
  model: string,
  messages: { role: string; content: string }[],
  temperature: number = 0.7,
  maxTokens?: number
): Promise<string | null> => {
  try {
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
        'Authorization': `Bearer ${DEFAULT_AI_API_KEY}`
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
  model: string,
  messages: ChatMessage[],
  temperature: number = 0.7,
  maxTokens?: number
): Promise<string | null> => {
  const openAiMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  return chatWithOpenAI(model, openAiMessages, temperature, maxTokens);
};