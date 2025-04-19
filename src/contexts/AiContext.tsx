import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AiModel, AiSettings, ChatMessage, CivitaiData } from '@/types';
import { generateChatCompletion, extractCivitaiData } from '@/services/openAiApi';
import { generateUUID } from '@/lib/utils';

interface AiContextType {
  messages: ChatMessage[];
  isProcessing: boolean;
  error: string | null;
  settings: AiSettings;

  //Actions
  setApiKey: (key: string) => void;
  setModel: (model: AiModel) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;

  //Chat operations
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;

  //Civitai operations
  extractFromCivitai: (url: string) => Promise<CivitaiData | null>;
}

const DEFAULT_SETTINGS: AiSettings = {
  apiKey: '',
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 1000
};

const AiContext = createContext<AiContextType | undefined>(undefined);

export const AiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AiSettings>(() => {
    const storedSettings = localStorage.getItem('ai-settings');
    return storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('ai-settings', JSON.stringify(settings));
  }, [settings]);

  const setApiKey = (key: string) => { setSettings(prev => ({ ...prev, apiKey: key })); };
  const setModel = (model: AiModel) => { setSettings(prev => ({ ...prev, model })); };
  const setTemperature = (temperature: number) => { setSettings(prev => ({ ...prev, temperature })); };
  const setMaxTokens = (maxTokens: number) => { setSettings(prev => ({ ...prev, maxTokens })); };

  //Chat operations
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (!settings.apiKey) {
      setError('API key is required');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      //Add user message
      const userMessage: ChatMessage = {
        id: generateUUID(),
        role: 'user',
        content,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);

      //Generate response
      const allMessages = [...messages, userMessage];
      const response = await generateChatCompletion(
        settings.apiKey,
        settings.model,
        allMessages,
        settings.temperature,
        settings.maxTokens
      );

      if (response) {
        const assistantMessage: ChatMessage = {
          id: generateUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError('Failed to generate response');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  //Civitai operations
  const extractFromCivitai = async (url: string): Promise<CivitaiData | null> => {
    if (!url.trim() || !url.includes('civitai.com')) {
      setError('Please enter a valid Civitai URL');
      return null;
    }

    if (!settings.apiKey) {
      setError('API key is required');
      return null;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const data = await extractCivitaiData(settings.apiKey, url);

      if (!data) {
        setError('Failed to extract data from Civitai');
        return null;
      }

      return data;
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const value = {
    messages,
    isProcessing,
    error,
    settings,
    setApiKey,
    setModel,
    setTemperature,
    setMaxTokens,
    sendMessage,
    clearMessages,
    extractFromCivitai
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