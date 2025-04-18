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

//API service class
export class ApiService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = SD_API_BASE_URL;
    console.log(`STABLE_DIFFUSION_API : ApiService initialized with base URL: ${this.apiUrl}`);
  }


  //Test the API connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/app_id`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      console.log(`STABLE_DIFFUSION_API : API connection test result: ${response.ok ? 'SUCCESS' : 'FAILED'}, status: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  //Get available samplers
  async getSamplers(): Promise<string[]> {
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/samplers`);
      if (!response.ok) throw new Error(`STABLE_DIFFUSION_API : Failed to fetch samplers, status: ${response.status}`);

      const data = await response.json();
      console.log(`STABLE_DIFFUSION_API : Samplers fetched successfully:`, data);
      return data.map((sampler: any) => sampler.name);
    } catch (error) {
      console.error('STABLE_DIFFUSION_API : Failed to fetch samplers:', error);
      return [];
    }
  }

  //Get available SD models
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/sd-models`);
      if (!response.ok) throw new Error(`STABLE_DIFFUSION_API : Failed to fetch models, status: ${response.status}`);

      const data = await response.json();
      console.log(`STABLE_DIFFUSION_API : Models fetched successfully:`, data);
      return data.map((model: any) => model.title);
    } catch (error) {
      console.error('STABLE_DIFFUSION_API : Failed to fetch models:', error);
      return [];
    }
  }

  //Get available LoRAs
  async getLoras(): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/loras`);
      if (!response.ok) throw new Error(`STABLE_DIFFUSION_API : Failed to fetch LoRAs, status: ${response.status}`);

      const data = await response.json();
      console.log(`STABLE_DIFFUSION_API : LoRAs fetched successfully:`, data);
      return data;
    } catch (error) {
      console.error('STABLE_DIFFUSION_API : Failed to fetch LoRAs:', error);
      return [];
    }
  }


  //Generate an image using text-to-image
  async generateImage(params: Text2ImageRequest): Promise<Text2ImageResponse | null> {
    console.log(`STABLE_DIFFUSION_API : Generating image with params:`, params);
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`STABLE_DIFFUSION_API : Failed to generate image, status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log(`STABLE_DIFFUSION_API : Image generation successful, received ${result.images?.length} images`);
      return result;
    } catch (error) {
      console.error('STABLE_DIFFUSION_API : Failed to generate image:', error);
      return null;
    }
  }
}
//Export a singleton instance of the API service
export const apiService = new ApiService();