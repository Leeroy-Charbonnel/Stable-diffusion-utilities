import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatMessage, AiSettings, AiModel } from '@/types';
import { generateChatCompletion } from '@/services/openAiApi';
import { generateUUID } from '@/lib/utils';
import { DEFAULT_AI_API_KEY } from '@/lib/constantsKeys';

const DEFAULT_AI_SETTINGS: AiSettings = {
  apiKey: DEFAULT_AI_API_KEY,
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 1000,
};

interface AiContextType {
  messages: ChatMessage[];
  settings: AiSettings;
  isProcessing: boolean;
  error: string | null;

  //Methods
  sendMessage: (content: string, role?: 'user' | 'assistant' | 'system') => Promise<void>;
  clearMessages: () => void;
  setApiKey: (key: string) => void;
  setModel: (model: AiModel) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
}

//Create the context
const AiContext = createContext<AiContextType | undefined>(undefined);

//Storage keys
const STORAGE_KEY_SETTINGS = 'sd-utilities-ai-settings';
const STORAGE_KEY_MESSAGES = 'sd-utilities-ai-messages';

export const AiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  //State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  //Load settings from local storage
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings) as AiSettings;
        setSettings({ ...DEFAULT_AI_SETTINGS, ...parsedSettings });
      }

      const storedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
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

  //Save messages to local storage when changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving AI messages to localStorage:', error);
    }
  }, [messages]);

  //Setting updaters
  const setApiKey = (key: string) => { setSettings((prev) => ({ ...prev, apiKey: key })); };

  const setModel = (model: AiModel) => { setSettings((prev) => ({ ...prev, model })); };

  const setTemperature = (temperature: number) => { setSettings((prev) => ({ ...prev, temperature })); };

  const setMaxTokens = (maxTokens: number) => { setSettings((prev) => ({ ...prev, maxTokens })); };

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
          DEFAULT_AI_API_KEY,
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
    sendMessage,
    clearMessages,
    setApiKey,
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