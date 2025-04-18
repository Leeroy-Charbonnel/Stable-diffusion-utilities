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

  //Generated images
  generatedImages: ImageMetadata[];

  //API methods
  checkConnection: () => Promise<boolean>;
  generateImage: (prompt: Prompt) => Promise<ImageMetadata | null>;
  refreshImages: () => Promise<void>;
  deleteImage: (id: string) => Promise<boolean>;
  updateImageTags: (id: string, tags: string[]) => Promise<boolean>;
  updateImageMetadata: (id: string, updates: Partial<ImageMetadata>) => Promise<boolean>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<ImageMetadata[]>([]);

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

  //Refresh the list of generated images
  const refreshImages = async (): Promise<void> => {
    try {
      const images = await fileSystemApi.getAllImageMetadata();
      setGeneratedImages(images);
    } catch (err) {
      setError("Error refreshing images: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  //Delete an image
  const deleteImage = async (id: string): Promise<boolean> => {
    try {
      const success = await fileSystemApi.deleteImage(id);
      if (success) {
        setGeneratedImages(prev => prev.filter(img => img.id !== id));
      }
      return success;
    } catch (err) {
      setError("Error deleting image: " + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  //Update an image's tags
  const updateImageTags = async (id: string, tags: string[]): Promise<boolean> => {
    try {
      const success = await fileSystemApi.updateImageMetadata(id, { tags });
      if (success) {
        setGeneratedImages(prev => prev.map(img =>
          img.id === id ? { ...img, tags } : img
        ));
      }
      return success;
    } catch (err) {
      setError("Error updating image tags: " + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  //Update an image's metadata
  const updateImageMetadata = async (id: string, updates: Partial<ImageMetadata>): Promise<boolean> => {
    try {
      const success = await fileSystemApi.updateImageMetadata(id, updates);
      if (success) {
        setGeneratedImages(prev => prev.map(img =>
          img.id === id ? { ...img, ...updates } : img
        ));
      }
      return success;
    } catch (err) {
      setError("Error updating image metadata: " + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  //Load images on initial mount
  useEffect(() => {
    checkConnection();
    refreshImages();
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