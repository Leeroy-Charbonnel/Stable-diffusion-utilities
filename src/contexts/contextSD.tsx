import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ImageMetadata, Prompt } from '@/types';
import * as apiSD from '@/services/apiSD';
import * as apiFS from '@/services/apiFs';
import * as apiPrompt from '@/services/apiPrompt';
import { generateUUID } from '@/lib/utils';

interface ApiContextType {
  apiSD: typeof apiSD;
  apiFS: typeof apiFS;
  apiPrompt: typeof apiPrompt;

  //Connection state
  isConnected: boolean;
  isLoading: boolean;

  //Available options from SD API - loaded only once
  availableSamplers: string[];
  availableModels: string[];
  availableLoras: any[];

  //API methods
  checkConnection: () => Promise<boolean>;
  generateImage: (prompt: Prompt) => Promise<ImageMetadata | null>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const SdProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [availableSamplers, setAvailableSamplers] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableLoras, setAvailableLoras] = useState<any[]>([]);


  useEffect(() => {
    const initializeApi = async () => {
      const connected = await checkConnection();

      if (connected) {
        try {
          const [samplers, models, loras] = await Promise.all([
            apiSD.getSamplers(),
            apiSD.getModels(),
            apiSD.getLoras()
          ]);

          setAvailableSamplers(samplers);
          setAvailableModels(models);
          setAvailableLoras(loras);
          console.log('contextSD - API data loaded successfully');
        } catch (error) {
          console.error('Failed to load API data:', error);
        } finally {
        }
      }
    };

    initializeApi();
  }, []);

  const checkConnection = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const connected = await apiSD.testConnection();
      setIsConnected(connected);
      if (!connected) { console.log("Connection failed. Check if SD server is running.") }
      return connected;
    } catch (err) {
      console.log("Error checking connection:", err);
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const generateImage = async (prompt: Prompt): Promise<ImageMetadata | null> => {
    setIsLoading(true);

    try {
      const params: any = {
        prompt: prompt.text,
        negative_prompt: prompt.negativePrompt,
        seed: prompt.seed === undefined ? -1 : prompt.seed,
        steps: prompt.steps || 20,
        width: prompt.width || 512,
        height: prompt.height || 512,
        sampler_name: prompt.sampler || "Euler a",
        cfg_scale: 7.5,
        batch_size: 1,
        n_iter: 1,
      };

      params.override_settings = {
        sd_model_checkpoint: prompt.model
      };

      if (prompt.loras && prompt.loras.length > 0) {
        params.prompt = params.prompt + " " + prompt.loras.map(lora => `<lora:${lora.name}:${lora.weight}>`).join(", ");
      }

      const result = await apiSD.generateImage(params);
      if (!result || !result.images || result.images.length === 0) throw new Error("Failed to generate image");
      const generatedImage = await apiFS.saveGeneratedImage(generateUUID(), result.images[0], prompt);

      return generatedImage;
    } catch (err) {
      console.log("Error generating image:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };



  const value = {
    apiSD: apiSD,
    apiFS,
    apiPrompt,
    isConnected,
    isLoading,
    availableSamplers,
    availableModels,
    availableLoras,
    checkConnection,
    generateImage
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};