import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ImageMetadata, Prompt, LabelItem, LabelsData } from '@/types';
import * as apiSD from '@/services/apiSD';
import * as apiFS from '@/services/apiFS';
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
  labelsData: LabelsData;
  availableSamplers: string[];
  availableModels: LabelItem[];
  availableLoras: LabelItem[];

  //API methods
  checkConnection: () => Promise<boolean>;
  generateImage: (prompt: Prompt) => Promise<ImageMetadata | null>;
  updateLabelsData: (labelsData: LabelsData) => void;
  refreshModelsAndLoras: () => Promise<void>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const SdProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [labelsData, setLabelsData] = useState<LabelsData>({ modelLabels: [], lorasLabels: [] });
  const [availableSamplers, setAvailableSamplers] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<LabelItem[]>([]);
  const [availableLoras, setAvailableLoras] = useState<LabelItem[]>([]);

  useEffect(() => {
    const initializeApi = async () => {
      setIsLoading(true);
      const connected = await checkConnection();
      await refreshModelsAndLoras();

      if (connected) {
        try {
          const samplers = await apiSD.getSamplers()
          setAvailableSamplers(samplers);
          console.log(`contextSD - API data loaded successfully`);
        } catch (error) {
          console.error('Failed to load API data:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initializeApi();
  }, []);



  const refreshModelsAndLoras = async () => {
    await apiSD.refreshModels();
    await apiSD.refreshLoras();

    const labelsData = await apiFS.getLabelsData();
    const updatedLabelsData = { modelLabels: [], lorasLabels: [] } as LabelsData;

    const [models, loras] = await Promise.all([
      apiSD.getModels(),
      apiSD.getLoras()
    ]);

    models.forEach((model: string) => {
      updatedLabelsData.modelLabels.push({ name: model, label: labelsData.modelLabels.find((x: LabelItem) => x.name === model)?.label || '' });
    });

    loras.forEach((lora: string) => {
      updatedLabelsData.lorasLabels.push({ name: lora, label: labelsData.lorasLabels.find((x: LabelItem) => x.name === lora)?.label || '' });
    });

    setLabelsData(updatedLabelsData);
    setAvailableModels(updatedLabelsData.modelLabels);
    setAvailableLoras(updatedLabelsData.lorasLabels);
  };


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
        seed: prompt.seed,
        steps: prompt.steps,
        width: prompt.width,
        height: prompt.height,
        sampler_name: prompt.sampler,
        cfg_scale: prompt.cfgScale,
        batch_size: 1,
        n_iter: 1,
      };

      params.override_settings = {
        sd_model_checkpoint: prompt.model
      };

      if (prompt.loras && prompt.loras.length > 0) {
        params.prompt = params.prompt + " " + prompt.loras.map(lora => `<lora:${lora.name}:${lora.weight}>`).join(", ");
      }

      console.log("API SENDING:", params);
      const result = await apiSD.generateImage(params);
      if (!result || !result.images || result.images.length === 0) throw new Error("Failed to generate image");
      console.log("Generated image:", result.images[0]);
      const generatedImage = await apiFS.saveGeneratedImage(generateUUID(), result.images[0], prompt);
      console.log("Generated image:", generatedImage);
      return generatedImage;
    } catch (err) {
      console.log("Error generating image:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };


  const updateLabelsData = async (updatedLabelsData: LabelsData): Promise<boolean> => {
    setLabelsData(updatedLabelsData);
    return true;
  };


  const value = {
    apiSD: apiSD,
    apiFS,
    apiPrompt,
    isConnected,
    isLoading,
    labelsData,
    availableSamplers,
    availableModels,
    availableLoras,
    checkConnection,
    refreshModelsAndLoras,
    updateLabelsData,
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