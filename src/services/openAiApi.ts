// src/services/openAiApi.ts
import { AiModel, ChatMessage, CivitaiData } from '@/types';

//OpenAI API URLs
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const CIVITAI_SCRAPER_SYSTEM_PROMPT = `You are a helpful assistant specialized in extracting Stable Diffusion generation parameters from Civitai image pages. 
Given a URL or HTML content from Civitai, extract the following information in JSON format:
- prompt
- negativePrompt
- model
- sampler
- seed
- steps
- width
- height
- loras (as an array of objects with name and weight properties)

Return ONLY the JSON with no explanations or additional text. If any field is not found, omit it from the JSON.`;

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

//Extract data from a Civitai URL
export const extractCivitaiData = async (
  apiKey: string,
  url: string
): Promise<CivitaiData | null> => {
  try {
    //Fetch the HTML content from the URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch Civitai page: ${response.status}`);
    }
    const htmlContent = await response.text();

    //Extract the relevant information using OpenAI
    const extractedData = await chatWithOpenAI(
      apiKey,
      'gpt-3.5-turbo',
      [
        { role: 'system', content: CIVITAI_SCRAPER_SYSTEM_PROMPT },
        { role: 'user', content: `Extract Stable Diffusion parameters from this Civitai page: ${htmlContent}` }
      ],
      0.3,
      2000
    );

    if (!extractedData) {
      throw new Error('Failed to extract data from Civitai page');
    }

    //Parse the JSON response
    try {
      const data = JSON.parse(extractedData);
      return data as CivitaiData;
    } catch (error) {
      console.error('Error parsing JSON from OpenAI response:', error);
      console.log('Raw response:', extractedData);
      return null;
    }
  } catch (error) {
    console.error('Error extracting data from Civitai:', error);
    return null;
  }
};

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