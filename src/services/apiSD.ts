import { SD_API_BASE_URL } from '@/lib/constants';

export interface Text2ImageRequest {
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  subseed?: number;
  subseed_strength?: number;
  batch_size?: number;
  n_iter?: number;
  steps?: number;
  cfg_scale?: number;
  width?: number;
  height?: number;
  restore_faces?: boolean;
  sampler_name?: string;
  enable_hr?: boolean;
  denoising_strength?: number;
  override_settings?: {
    sd_model_checkpoint?: string;
  };
  alwayson_scripts?: {
    [key: string]: {
      args: any[];
    };
  };
}
export interface Text2ImageResponse {
  images: string[]; //base64 encoded images
  parameters: any;
  info: string;
}

//Test the API connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${SD_API_BASE_URL}/app_id`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

//Get available samplers
export const getSamplers = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${SD_API_BASE_URL}/sdapi/v1/samplers`);
    if (!response.ok) throw new Error(`STABLE_DIFFUSION_API : Failed to fetch samplers, status: ${response.status}`);

    const data = await response.json();
    return data.map((sampler: any) => sampler.name);
  } catch (error) {
    return [];
  }
}

//Get available SD models
export const getModels = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${SD_API_BASE_URL}/sdapi/v1/sd-models`);
    if (!response.ok) throw new Error(`STABLE_DIFFUSION_API : Failed to fetch models, status: ${response.status}`);

    const data = await response.json();
    return data.map((model: any) => model.model_name);
  } catch (error) {
    return [];
  }
}

//Get available LoRAs
export const getLoras = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${SD_API_BASE_URL}/sdapi/v1/loras`);
    if (!response.ok) throw new Error(`STABLE_DIFFUSION_API : Failed to fetch LoRAs, status: ${response.status}`);

    const data = await response.json();
    return data.map((lora: any) => lora.name);
  } catch (error) {
    return [];
  }
}


//Generate an image using text-to-image
export const generateImage = async (params: Text2ImageRequest): Promise<Text2ImageResponse | null> => {
  try {
    const response = await fetch(`${SD_API_BASE_URL}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    return null;
  }
}

export const refreshLoras = async (): Promise<void> => {
  try {
    const response = await fetch(`${SD_API_BASE_URL}/sdapi/v1/refresh-loras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`Failed to refresh LoRAs: ${response.status}`);
    
  } catch (error) {
    console.error('Error refreshing LoRAs:', error);
  }
};

export const refreshModels = async (): Promise<void> => {
  try {
    const response = await fetch(`${SD_API_BASE_URL}/sdapi/v1/refresh-checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`Failed to refresh models: ${response.status}`);

  } catch (error) {
    console.error('Error refreshing models:', error);
  }
};

//Get PNG info from an image
export const getPngInfo = async (imageBase64: string): Promise<any> => {
  console.log("getPngInfo : imageBase64", imageBase64);
  try {
    const response = await fetch(`${SD_API_BASE_URL}/sdapi/v1/png-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
    });

    if (!response.ok) throw new Error(`Failed to get PNG info, status: ${response.status}`);

    return await response.json();
  } catch (error) {
    console.error('Error getting PNG info:', error);
    return null;
  }
};