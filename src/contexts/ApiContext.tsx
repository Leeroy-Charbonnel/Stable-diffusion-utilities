import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ImageMetadata, Prompt } from '@/types';

import { apiService, ApiService } from '@/services/stableDiffusionApi';
import * as fileSystemApi from '@/services/fileSystemApi';
import * as promptsApi from '@/services/promptsApi';
import { generateUUID } from '@/lib/utils';

interface ApiContextType {
  //Service objects
  stableDiffusionApi: ApiService;
  fileSystemApi: typeof fileSystemApi;
  promptsApi: typeof promptsApi;

  //SD Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  //Available options from SD API - loaded only once
  availableSamplers: string[];
  availableModels: string[];
  availableLoras: any[];
  isLoadingApiData: boolean;

  //API methods
  checkConnection: () => Promise<boolean>;
  generateImage: (prompt: Prompt) => Promise<ImageMetadata | null>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  //Shared API data - loaded once
  const [availableSamplers, setAvailableSamplers] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableLoras, setAvailableLoras] = useState<any[]>([]);
  const [isLoadingApiData, setIsLoadingApiData] = useState<boolean>(false);

  //Check connection to Stable Diffusion API
  const checkConnection = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const connected = await apiService.testConnection();
      setIsConnected(connected);

      if (!connected) { setError("Connection failed. Check if SD server is running."); }
      return connected;
    } catch (err) {
      setError("API error: " + (err instanceof Error ? err.message : String(err)));
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  //Generate an image based on a prompt
  const generateImage = async (prompt: Prompt): Promise<ImageMetadata | null> => {
    setIsLoading(true);
    setError(null);

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

      const result = await apiService.generateImage(params);

      if (!result || !result.images || result.images.length === 0) {
        throw new Error("Failed to generate image");
      }

      //Save the generated image
      const generatedImage = await fileSystemApi.saveGeneratedImage(
        generateUUID(),
        result.images[0],
        prompt
      );

      return generatedImage;
    } catch (err) {
      setError("Error generating image: " + (err instanceof Error ? err.message : String(err)));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  //Load initial data on mount - THIS ONLY HAPPENS ONCE
  useEffect(() => {
    const initializeApi = async () => {
      const connected = await checkConnection();
      
      if (connected) {
        //Load all API data in one go
        setIsLoadingApiData(true);
        try {
          const [samplers, models, loras] = await Promise.all([
            apiService.getSamplers(),
            apiService.getModels(),
            apiService.getLoras()
          ]);
  
          setAvailableSamplers(samplers);
          setAvailableModels(models);
          setAvailableLoras(loras);
        } catch (error) {
          console.error('Failed to load API data:', error);
          setError("Failed to load API data: " + (error instanceof Error ? error.message : String(error)));
        } finally {
          setIsLoadingApiData(false);
        }
      }
    };
    
    initializeApi();
  }, []);

  const value = {
    stableDiffusionApi: apiService,
    fileSystemApi,
    promptsApi,
    isConnected,
    isLoading,
    error,
    availableSamplers,
    availableModels,
    availableLoras,
    isLoadingApiData,
    checkConnection,
    generateImage
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

//Custom hook to use the API context
export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};