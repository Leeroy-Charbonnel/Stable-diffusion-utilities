import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateChatCompletion, getOpenAiModels } from '@/services/apiAI';
import { generateUUID } from '@/lib/utils';
import { DEFAULT_AI_API_KEY } from '@/lib/constantsKeys';
import { AiChatRole, ChatMessage, Prompt } from '@/types';
import { useApi } from './contextSD';
import { CHAT_SYSTEM_EXTRACTION_PROMPT, CHAT_SYSTEM_GENERATION_PROMPT } from '@/lib/constantsAI';
import { DEFAULT_PROMPT_CFG_SCALE, DEFAULT_PROMPT_HEIGHT, DEFAULT_PROMPT_STEP, DEFAULT_PROMPT_WIDTH } from '@/lib/constants';

const DEFAULT_AI_SETTINGS: AiSettings = {
  apiKey: DEFAULT_AI_API_KEY,
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 1000,
};

interface AiSettings {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface AiContextType {
  messages: ChatMessage[];
  settings: AiSettings;
  isProcessing: boolean;
  error: string | null;
  availableModels: string[];
  isLoadingModels: boolean;

  sendMessage: (content: string, role?: AiChatRole) => Promise<void>;
  clearMessages: () => void;
  setModel: (model: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;


  generatedPrompt: Prompt | null;
  setGeneratedPrompt: (prompt: Prompt) => void;
}

const AiContext = createContext<AiContextType | undefined>(undefined);

const STORAGE_KEY_SETTINGS = 'sd-utilities-ai-settings';

export const AiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  //State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState('generation');

  //Setting updaters
  const setModel = (model: string) => { setSettings((prev) => ({ ...prev, model })); };
  const setTemperature = (temperature: number) => { setSettings((prev) => ({ ...prev, temperature })); };
  const setMaxTokens = (maxTokens: number) => { setSettings((prev) => ({ ...prev, maxTokens })); };

  const [generatedPrompt, setGeneratedPrompt] = useState<Prompt | null>(null);
  const { availableSamplers: availableSDSamplers,
    availableModels: availableSDModels,
    availableLoras: availableSDLoras,
    isLoading: isApiLoading } = useApi();

  //Load settings from local storage
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings) as AiSettings;
        setSettings({ ...DEFAULT_AI_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Error loading AI settings from localStorage:', error);
    }
  }, []);

  //Save settings to local storage when changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving AI settings to localStorage:', error);
    }
  }, [settings]);

  //Fetch available models when component mounts
  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    setIsLoadingModels(true);

    try {
      const response = await getOpenAiModels();

      // Handle the response properly based on the fixed API function
      if (response && response.data) {
        // Filter to get only GPT chat models
        const chatModels = response.data
          .filter((model: any) =>
            model.id.includes('gpt') &&
            model.id.includes('turbo') &&
            !model.id.includes('preview')
          )
          .map((model: any) => model.id);

        setAvailableModels(chatModels);

        // If current model is not in available models, select the first one
        if (chatModels.length > 0 && !chatModels.includes(settings.model)) {
          setModel(chatModels[0]);
        }
      } else {
        // Fallback models if API doesn't return proper data
        setAvailableModels(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Fallback to default models
      setAvailableModels(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']);
    } finally {
      setIsLoadingModels(false);
    }
  };



  const prepareExtractionSystemPrompt = (): string => {
    const modelsSection = `${availableSDModels.join(', ')}`;
    const samplersSection = `${availableSDSamplers.join(', ')}`;
    const lorasSection = `${availableSDLoras.map(l => l.name).join(', ')}`;

    let preparedPrompt = CHAT_SYSTEM_EXTRACTION_PROMPT
      .replace('AVAILABLE_MODELS_PLACEHOLDER', modelsSection)
      .replace('AVAILABLE_SAMPLERS_PLACEHOLDER', samplersSection)
      .replace('AVAILABLE_LORAS_PLACEHOLDER', lorasSection);

    return preparedPrompt;
  }


  const setupSytemPrompt = () => {
    console.log('setupSytemPrompt');
    if (mode == 'extraction') {
      const systemPrompt = prepareExtractionSystemPrompt();
      const newMessage: ChatMessage = {
        id: generateUUID(),
        role: 'system',
        content: systemPrompt,
        timestamp: new Date().toISOString(),
      };
      setMessages([newMessage]);
    } else {
      const newMessage: ChatMessage = {
        id: generateUUID(),
        role: 'system',
        content: CHAT_SYSTEM_GENERATION_PROMPT,
        timestamp: new Date().toISOString(),
      };
      setMessages([newMessage]);
    }
  }

  //Send a message and get a response
  const sendMessage = async (content: string, role: 'user' | 'assistant' | 'system' = 'user') => {
    if (!content.trim()) return;

    setError(null);
    if (role === 'user') { setIsProcessing(true); }

    //Setup system prompt
    if (messages.length == 0) {
      setMode(checkIfExtractionMode(content) ? 'extraction' : 'generation');
      setupSytemPrompt();
    }

    console.log("sendmessage", messages);
    //Treat the message
    if (mode == 'extraction') {
      const civitId = extractCivitaiId(content);
      if (!civitId) return
      const civitData = await fetchCivitaiData(civitId);
      console.log({ civitData });

      //Create a new message
      const newMessage: ChatMessage = {
        id: generateUUID(),
        role: role,
        content: JSON.stringify(civitData),
        timestamp: new Date().toISOString(),
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);

    } else {
      //Create a new message
      const newMessage: ChatMessage = {
        id: generateUUID(),
        role: role,
        content: content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);

    }
    //If it's a user message, get a response from the AI
    if (role === 'user') {
      try {
        //Get response from OpenAI
        const response = await generateChatCompletion(
          settings.model,
          messages,
          settings.temperature,
          settings.maxTokens
        );

        if (!response) {
          throw new Error('Failed to get a response from the AI.');
        }

        //Add the assistant's response
        const assistantMessage: ChatMessage = {
          id: generateUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
        };
        extractPromptFromResponse(response);
        setMessages((prevMessages) => [...prevMessages, assistantMessage]);
      } catch (err) {
        console.error('Error getting AI response:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };


  const checkIfExtractionMode = (content: string): boolean => {
    return content.includes("civitai.com/images");
  }

  const extractCivitaiId = (url: string): string | null => {
    const match = url.match(/https:\/\/civitai\.com\/images\/(\d+)/);
    return match ? match[1] : null;
  };

  const fetchCivitaiData = async (imageId: string): Promise<any> => {
    try {
      const response = await fetch(`https://civitai.com/api/trpc/image.getGenerationData?input={"json":{"id":${imageId}}}`);
      if (!response.ok) {
        throw new Error('Failed to fetch from Civitai API');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Civitai data:', error);
      return null;
    }
  };


  function extractPromptFromResponse(response: string) {
    const jsonResponse = JSON.parse(response);

    if (mode == 'extraction') {
      const prompt: Prompt = {
        id: generateUUID(),
        isOpen: false,
        name: jsonResponse.name,
        text: jsonResponse.text,
        negativePrompt: jsonResponse.negativePrompt,
        cfgScale: jsonResponse.cfgScale,
        seed: jsonResponse.seed,
        steps: jsonResponse.steps,
        sampler: jsonResponse.sampler,
        model: jsonResponse.model,
        width: jsonResponse.width,
        height: jsonResponse.height,
        tags: jsonResponse.tags,
        loras: jsonResponse.loras,
        runCount: 1,
        currentRun: 0,
        status: 'idle'
      }
      setGeneratedPrompt(prompt);
    } else {
      const prompt: Prompt = {
        id: generateUUID(),
        isOpen: false,
        name: jsonResponse.name,
        text: jsonResponse.text,
        negativePrompt: jsonResponse.negativePrompt,
        cfgScale: DEFAULT_PROMPT_CFG_SCALE,
        seed: -1,
        steps: DEFAULT_PROMPT_STEP,
        sampler: availableSDSamplers.length > 0 ? availableSDSamplers[0] : '',
        model: availableModels.length > 0 ? availableModels[0] : '',
        width: DEFAULT_PROMPT_HEIGHT,
        height: DEFAULT_PROMPT_WIDTH,
        tags: jsonResponse.tags,
        loras: [],
        runCount: 1,
        currentRun: 0,
        status: 'idle'
      }
      setGeneratedPrompt(prompt);
    }
  }



  const value: AiContextType = {
    messages,
    settings,
    isProcessing,
    error,
    availableModels,
    isLoadingModels,
    sendMessage,
    clearMessages,
    setModel,
    setTemperature,
    setMaxTokens,
    generatedPrompt,
    setGeneratedPrompt
  };


  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
};

export const useAi = (): AiContextType => {
  const context = useContext(AiContext);
  if (context === undefined) {
    throw new Error('useAi must be used within an AiProvider');
  }
  return context;
};


