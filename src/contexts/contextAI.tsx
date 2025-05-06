import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateChatCompletion, getOpenAiModels } from '@/services/apiAI';
import { checkIfModelExist, generateUUID } from '@/lib/utils';
import { DEFAULT_AI_API_KEY } from '@/lib/constantsKeys';
import { AiChatRole, ChatMessage, Prompt, PromptEditor } from '@/types';
import { useApi } from './contextSD';
import { CHAT_SYSTEM_EXTRACTION_PROMPT, CHAT_SYSTEM_GENERATION_PROMPT } from '@/lib/constantsAI';
import { DEFAULT_PROMPT_CFG_SCALE, DEFAULT_PROMPT_HEIGHT, DEFAULT_PROMPT_NAME, DEFAULT_PROMPT_STEP, DEFAULT_PROMPT_WIDTH, FILE_API_BASE_URL } from '@/lib/constants';
import { getPngInfo } from '@/services/apiSD';

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


  generatedPrompt: PromptEditor | null;
  setGeneratedPrompt: (prompt: PromptEditor) => void;
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

  const [generatedPrompt, setGeneratedPrompt] = useState<PromptEditor | null>(null);
  const { availableSamplers: availableSDSamplers,
    availableModels: availableSDModels,
    availableLoras: availableSDLoras,
    availableEmbeddings: availableSDEmbeddings, // Added embeddings
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



  const prepareExtractionSystemPrompt = (): string => {
    const modelsSection = `${availableSDModels.map(x => `Name : ${x.name} (Label : ${x.label})`).join(', ')}`;
    const lorasSection = `${availableSDLoras.map(x => `Name : ${x.name} (Label : ${x.label})`).join(', ')}`;
    const embeddingsSection = `${availableSDEmbeddings.map(x => `Name : ${x.name} (Label : ${x.label})`).join(', ')}`;
    const samplersSection = `${availableSDSamplers.join(', ')}`;

    let preparedPrompt = CHAT_SYSTEM_EXTRACTION_PROMPT
      .replace('%AVAILABLE_MODELS_PLACEHOLDER%', modelsSection)
      .replace('%AVAILABLE_SAMPLERS_PLACEHOLDER%', samplersSection)
      .replace('%AVAILABLE_LORAS_PLACEHOLDER%', lorasSection)
      .replace('%AVAILABLE_EMBEDDINGS_PLACEHOLDER%', embeddingsSection);

    return preparedPrompt;
  }

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
      const mContent = updatedMode === 'extraction' ? prepareExtractionSystemPrompt() : CHAT_SYSTEM_GENERATION_PROMPT;
      const systemMessage = createMessage(mContent, 'system');
      updatedMessages = [systemMessage];
    }

    //Treat the message
    if (updatedMode == 'extraction') {
      //Get base64 from url, then extract metadata
      const base64Image = (await fetchCivitaiData(content)).base64;
      const civitData = await getPngInfo(base64Image);

      //Create a new message
      const mContent = JSON.stringify({ message: content + JSON.stringify(civitData), data: '' })
      newMessage = createMessage(mContent, role)

      updatedMessages = [...updatedMessages, newMessage];
      setMessages(updatedMessages);
    } else {
      //Create a new message
      const mContent = JSON.stringify({ message: content, data: {} });
      newMessage = createMessage(mContent, role);
      updatedMessages = [...updatedMessages, newMessage];
      setMessages(updatedMessages);
    }
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
        extractPromptFromResponse(response, updatedMode);
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


  function extractPromptFromResponse(response: string, mode: string) {
    const jsonResponse = JSON.parse(response);
    const generatePrompt = jsonResponse.generatePrompt;
    const data = jsonResponse.data;
    console.log(jsonResponse);
    if (!generatePrompt) return;

    if (mode == 'extraction') {
      const prompt: PromptEditor = {
        id: generateUUID(),
        isOpen: false,
        runCount: 1,
        currentRun: 0,
        status: 'idle',

        name: data.name || DEFAULT_PROMPT_NAME,
        text: data.text,
        negativePrompt: data.negativePrompt,
        cfgScale: data.cfgScale,
        seed: data.seed || -1,
        steps: data.steps || DEFAULT_PROMPT_STEP,
        sampler: data.sampler || '',
        width: data.width || DEFAULT_PROMPT_WIDTH,
        height: data.height || DEFAULT_PROMPT_HEIGHT,
        tags: data.tags || [],
        models: [checkIfModelExist(availableSDModels, data.model) ? data.model : availableSDModels[0].name],
        lorasRandom: false,
        loras: data.loras?.filter((l: { name: string, weight: number }) =>
          checkIfModelExist(availableSDLoras, l.name)) || [],
        embeddingsRandom: false,
        embeddings: data.embeddings?.filter((e: { name: string, weight: number }) =>
          checkIfModelExist(availableSDEmbeddings, e.name)) || []
      }
      setGeneratedPrompt(prompt);
    } else {
      const prompt: PromptEditor = {
        id: generateUUID(),
        isOpen: false,
        runCount: 1,
        currentRun: 0,
        status: 'idle',

        name: data.name || DEFAULT_PROMPT_NAME,
        text: data.text,
        negativePrompt: data.negativePrompt,
        cfgScale: DEFAULT_PROMPT_CFG_SCALE,
        seed: -1,
        steps: DEFAULT_PROMPT_STEP,
        sampler: availableSDSamplers.length > 0 ? availableSDSamplers[0] : '',
        width: DEFAULT_PROMPT_WIDTH,
        height: DEFAULT_PROMPT_HEIGHT,
        tags: data.tags || [],
        models: [availableSDModels.length > 0 ? availableSDModels[0].name : ''],
        lorasRandom: false,
        loras: [],
        embeddingsRandom: false,
        embeddings: []
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