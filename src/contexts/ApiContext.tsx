import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, ApiService } from '@/services/api';
import { Prompt, GeneratedImage } from '@/types';

interface ApiContextType {
  api: ApiService;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  availableSamplers: string[];
  availableModels: string[];
  currentModel: string;
  availableLoras: any[];
  generatedImages: GeneratedImage[];
  checkConnection: () => Promise<boolean>;
  generateImage: (prompt: Prompt) => Promise<GeneratedImage | null>;
  refreshImages: () => void;
  deleteImage: (id: string) => Promise<boolean>;
  updateImageTags: (id: string, tags: string[]) => Promise<boolean>;
  setModel: (modelName: string) => Promise<boolean>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [availableSamplers, setAvailableSamplers] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [availableLoras, setAvailableLoras] = useState<any[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  
  const checkConnection = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const connected = await apiService.testConnection();
      setIsConnected(connected);
      
      if (connected) {
        //If connected, load samplers, models, and loras
        const [samplers, models, loras] = await Promise.all([
          apiService.getSamplers(),
          apiService.getModels(),
          apiService.getLoras()
        ]);
        
        setAvailableSamplers(samplers);
        setAvailableModels(models);
        setAvailableLoras(loras);
      } else {
        setError("Connection failed. Check if SD server is running.");
      }
      
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
      //Map our Prompt type to the API's Text2ImageRequest
      const params: any = {
        prompt: prompt.text,
        negative_prompt: prompt.negativePrompt,
        seed: prompt.seed === undefined ? -1 : prompt.seed, //Use -1 for random seed
        steps: prompt.steps || 20,
        width: prompt.width || 512,
        height: prompt.height || 512,
        sampler_name: prompt.sampler || "Euler a",
        cfg_scale: 7.5, //Default value
        batch_size: 1,
        n_iter: 1, //Number of batches
      };
      
      // Add model override if specified and different from current
      if (prompt.model && prompt.model !== currentModel) {
        params.override_settings = {
          sd_model_checkpoint: prompt.model
        };
      }
      
      // Add LoRAs if specified
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
      
      //Save the generated image
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

  // Function to set the current model
  const setModel = async (modelName: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const success = await apiService.setModel(modelName);
      if (success) {
        setCurrentModel(modelName);
      }
      return success;
    } catch (err) {
      setError("Failed to set model: " + (err instanceof Error ? err.message : String(err)));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  //Load images on initial mount
  useEffect(() => {
    refreshImages();
    checkConnection();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    api: apiService,
    isConnected,
    isLoading,
    error,
    availableSamplers,
    availableModels,
    currentModel,
    availableLoras,
    generatedImages,
    checkConnection,
    generateImage,
    refreshImages,
    deleteImage,
    updateImageTags,
    setModel,
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