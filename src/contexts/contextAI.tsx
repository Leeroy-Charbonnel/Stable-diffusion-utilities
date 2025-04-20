import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateChatCompletion, getOpenAiModels } from '@/services/apiAI';
import { generateUUID } from '@/lib/utils';
import { DEFAULT_AI_API_KEY } from '@/lib/constantsKeys';
import { AiChatRole, ChatMessage } from '@/types';

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
  updateMessageContent: (messageId: string, newContent: string) => void;
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

  //Setting updaters
  const setModel = (model: string) => { setSettings((prev) => ({ ...prev, model })); };
  const setTemperature = (temperature: number) => { setSettings((prev) => ({ ...prev, temperature })); };
  const setMaxTokens = (maxTokens: number) => { setSettings((prev) => ({ ...prev, maxTokens })); };

  //Update message content
  const updateMessageContent = (messageId: string, newContent: string) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent } : msg
      )
    );
  };

  //Send a message and get a response
  const sendMessage = async (content: string, role: 'user' | 'assistant' | 'system' = 'user') => {
    if (!content.trim()) return;

    setError(null);

    //For user messages, set isProcessing to true
    if (role === 'user') { setIsProcessing(true); }

    //Create a new message
    const newMessage: ChatMessage = { id: generateUUID(), role, content, timestamp: new Date().toISOString(), };

    //Add the message to the list
    setMessages((prevMessages) => [...prevMessages, newMessage]);

    //If it's a user message, get a response from the AI
    if (role === 'user') {
      try {
        //Get all messages to send to the API
        const updatedMessages = [...messages, newMessage];

        //Get response from OpenAI
        const response = await generateChatCompletion(
          settings.model,
          updatedMessages,
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

  const value: AiContextType = {
    messages,
    settings,
    isProcessing,
    error,
    availableModels,
    isLoadingModels,
    sendMessage,
    clearMessages,
    updateMessageContent,
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