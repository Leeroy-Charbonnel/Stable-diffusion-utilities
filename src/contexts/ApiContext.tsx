import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Prompt, GeneratedImage } from '@/types';

import { apiService, ApiService } from '@/services/stableDiffusionApi';
import * as fileSystemApi from '@/services/fileSystemApi';
import * as promptsApi from '@/services/promptsApi';

interface ApiContextType {
  //Service objects
  stableDiffusionApi: ApiService;
  fileSystemApi: typeof fileSystemApi;
  promptsApi: typeof promptsApi;

  //Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  generatedImages: GeneratedImage[];

  //API functions
  checkConnection: () => Promise<boolean>;
  generateImage: (prompt: Prompt) => Promise<GeneratedImage | null>;
  refreshImages: () => void;
  deleteImage: (id: string) => Promise<boolean>;
  updateImageTags: (id: string, tags: string[]) => Promise<boolean>;
  updateImageMetadata: (id: string, updates: Partial<GeneratedImage>) => Promise<boolean>;
  setModel: (modelName: string) => Promise<boolean>;
  exportAllData: () => Promise<boolean>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

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

  const refreshImages = () => {
    const images = apiService.getStoredImages();
    setGeneratedImages(images);
  };

  const generateImage = async (prompt: Prompt): Promise<GeneratedImage | null> => {
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
        params.alwayson_scripts = {
          lora: {
            args: prompt.loras.map(lora => ({
              model: lora.name,
              weight: lora.weight
            }))
          }
        };
      }

      const result = await apiService.generateImage(params);

      if (!result || !result.images || result.images.length === 0) {
        throw new Error("Failed to generate image");
      }

      //Take the first image (since we're only generating one per request)
      const imageBase64 = result.images[0];

      //Save the generated image using fileSystemApi directly
      const savedImage = await apiService.saveGeneratedImage(prompt.id, imageBase64, prompt);

      if (savedImage) {
        //Refresh the image list
        refreshImages();
        return savedImage;
      }

      return null;
    } catch (err) {
      setError("Error generating image: " + (err instanceof Error ? err.message : String(err)));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteImage = async (id: string): Promise<boolean> => {
    try {
      const success = await apiService.deleteImage(id);
      if (success) {
        refreshImages();
      }
      return success;
    } catch (err) {
      setError("Error deleting image: " + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  const updateImageTags = async (id: string, tags: string[]): Promise<boolean> => {
    try {
      const success = await apiService.updateImageMetadata(id, { tags });
      if (success) {
        refreshImages();
      }
      return success;
    } catch (err) {
      setError("Error updating image tags: " + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  const updateImageMetadata = async (id: string, updates: Partial<GeneratedImage>): Promise<boolean> => {
    try {
      const success = await apiService.updateImageMetadata(id, updates);
      if (success) {
        refreshImages();
      }
      return success;
    } catch (err) {
      setError("Error updating image metadata: " + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  //Function to set the current model
  const setModel = async (modelName: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const success = await apiService.setModel(modelName);
      return success;
    } catch (err) {
      setError("Failed to set model: " + (err instanceof Error ? err.message : String(err)));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  //Export all data
  const exportData = async (): Promise<boolean> => {
    try {
      return await fileSystemApi.exportAllData();
    } catch (err) {
      setError("Error exporting data: " + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  //Load images on initial mount
  useEffect(() => {
    refreshImages();
    checkConnection();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    stableDiffusionApi: apiService,
    fileSystemApi,
    promptsApi,
    isConnected,
    isLoading,
    error,
    generatedImages,
    checkConnection,
    generateImage,
    refreshImages,
    deleteImage,
    updateImageTags,
    updateImageMetadata,
    setModel,
    exportAllData: exportData,
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