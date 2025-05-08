import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateChatCompletion, getOpenAiModels } from '@/services/apiAI';
import { checkIfModelExist, generateUUID } from '@/lib/utils';
import { DEFAULT_AI_API_KEY } from '@/lib/constantsKeys';
import { AiChatRole, ChatMessage } from '@/types';
import { CHAT_SYSTEM_EXTRACTION_PROMPT, CHAT_SYSTEM_GENERATION_PROMPT } from '@/lib/constantsAI';
import { DEFAULT_PROMPT_CFG_SCALE, DEFAULT_PROMPT_HEIGHT, DEFAULT_PROMPT_NAME, DEFAULT_PROMPT_STEP, DEFAULT_PROMPT_WIDTH, FILE_API_BASE_URL } from '@/lib/constants';

const DEFAULT_AI_SETTINGS: AiSettings = {
  apiKey: DEFAULT_AI_API_KEY,
  model: 'gpt-4.1',
  temperature: 0.7,
  maxTokens: 5000,
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

  //Setting updaters
  const setModel = (model: string) => { setSettings((prev) => ({ ...prev, model })); };
  const setTemperature = (temperature: number) => { setSettings((prev) => ({ ...prev, temperature })); };
  const setMaxTokens = (maxTokens: number) => { setSettings((prev) => ({ ...prev, maxTokens })); };

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

      if (response && response.data) {

        const chatModels = response.data
          .filter((model: any) =>
            model.id.includes('gpt') &&
            !model.id.includes('preview') &&
            !model.id.includes('image') &&
            !model.id.includes('mini') &&
            model.id.match(new RegExp("-", "g")).length < 3
          )
          .map((model: any) => model.id);

        setAvailableModels(chatModels);

        if (chatModels.length > 0 && !chatModels.includes(settings.model)) {
          setModel(chatModels[0]);
        }
      } else {
        // Fallback models if API doesn't return proper data
        setAvailableModels([]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Fallback to default models
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };



  const createMessage = (content: string, role: 'user' | 'assistant' | 'system' = 'user') => {
    return {
      id: generateUUID(),
      role,
      content,
      timestamp: new Date().toISOString(),
    };
  }

  //Send a message and get a response
  const sendMessage = async (content: string, role: 'user' | 'assistant' | 'system' = 'user') => {
    if (!content.trim()) return;

    setError(null);
    if (role === 'user') { setIsProcessing(true); }

    let newMessage: ChatMessage;
    let updatedMessages: ChatMessage[] = [...messages];
    let updatedMode = checkIfExtractionMode(content) ? 'extraction' : 'generation';

    //Setup system prompt
    if (messages.length == 0 || updatedMode === 'extraction') {
    }

    const mContent = JSON.stringify({ message: content, data: {} });
    newMessage = createMessage(mContent, role);
    updatedMessages = [...updatedMessages, newMessage];
    setMessages(updatedMessages);

    //If it's a user message, get a response from the AI
    if (role === 'user') {
      try {
        //Get response from OpenAI
        const response = await generateChatCompletion(settings.model, updatedMessages, settings.temperature, settings.maxTokens);
        if (!response) {
          throw new Error('Failed to get a response from the AI.');
        }

        //Add the assistant's response
        const assistantMessage: ChatMessage = createMessage(response, 'assistant');
        console.log(assistantMessage);

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
    return content.includes("image.civitai.com");
  }

  const fetchCivitaiData = async (imageUrl: string): Promise<{ base64: string }> => {
    try {
      const encodedUrl = encodeURIComponent(imageUrl);
      const response = await fetch(`${FILE_API_BASE_URL}/civitai/image/${encodedUrl}`);

      if (!response.ok) {
        throw new Error('Failed to fetch image data');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch image data');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching image data:', error);
      return { base64: '' };
    }
  };




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