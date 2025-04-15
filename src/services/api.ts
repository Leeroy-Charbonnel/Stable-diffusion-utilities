// src/services/api.ts
import { Prompt, GeneratedImage } from '@/types';

// Configure the base URL for the Stable Diffusion API
const API_BASE_URL = 'http://localhost:7860'; //Default local address for AUTOMATIC1111
const STORAGE_KEY = 'sd-utilities-data';

// API request types based on AUTOMATIC1111 API schema
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
  images: string[]; // base64 encoded images
  parameters: any;
  info: string;
}

// API service class
export class ApiService {
  private apiUrl: string;

  constructor(baseUrl = API_BASE_URL) {
    this.apiUrl = baseUrl;
    console.log(`ApiService initialized with base URL: ${baseUrl}`);
  }

  // Set the base URL for the API
  setBaseUrl(url: string) {
    console.log(`API base URL changed from ${this.apiUrl} to ${url}`);
    this.apiUrl = url;
  }

  // Get the API base URL
  getBaseUrl(): string {
    return this.apiUrl;
  }

  // Test the API connection
  async testConnection(): Promise<boolean> {
    console.log(`Testing API connection to ${this.apiUrl}`);
    try {
      const response = await fetch(`${this.apiUrl}/app_id`);
      console.log(`API connection test result: ${response.ok ? 'SUCCESS' : 'FAILED'}, status: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  // Get available samplers
  async getSamplers(): Promise<string[]> {
    console.log(`Fetching samplers from ${this.apiUrl}/sdapi/v1/samplers`);
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/samplers`);
      if (!response.ok) throw new Error(`Failed to fetch samplers, status: ${response.status}`);
      
      const data = await response.json();
      console.log(`Samplers fetched successfully:`, data);
      return data.map((sampler: any) => sampler.name);
    } catch (error) {
      console.error('Failed to fetch samplers:', error);
      return [];
    }
  }

  // Get available SD models
  async getModels(): Promise<string[]> {
    console.log(`Fetching models from ${this.apiUrl}/sdapi/v1/sd-models`);
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/sd-models`);
      if (!response.ok) throw new Error(`Failed to fetch models, status: ${response.status}`);
      
      const data = await response.json();
      console.log(`Models fetched successfully:`, data);
      return data.map((model: any) => model.title);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  }

  // Generate an image using text-to-image
  async generateImage(params: Text2ImageRequest): Promise<Text2ImageResponse | null> {
    console.log(`Generating image with params:`, params);
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) throw new Error(`Failed to generate image, status: ${response.status}`);
      
      const result = await response.json();
      console.log(`Image generation successful, received ${result.images?.length} images`);
      return result;
    } catch (error) {
      console.error('Failed to generate image:', error);
      return null;
    }
  }

  // Set the current SD model
  async setModel(modelTitle: string): Promise<boolean> {
    console.log(`Setting model to: ${modelTitle}`);
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sd_model_checkpoint: modelTitle,
        }),
      });

      console.log(`Set model response: ${response.ok ? 'SUCCESS' : 'FAILED'}, status: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.error('Failed to set model:', error);
      return false;
    }
  }
  
  // Get the current SD model
  async getCurrentModel(): Promise<string | null> {
    console.log(`Fetching current model from ${this.apiUrl}/sdapi/v1/options`);
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/options`);
      if (!response.ok) throw new Error(`Failed to fetch current model, status: ${response.status}`);
      
      const data = await response.json();
      console.log(`Current model fetched:`, data.sd_model_checkpoint);
      return data.sd_model_checkpoint || null;
    } catch (error) {
      console.error('Failed to get current model:', error);
      return null;
    }
  }
  
  // Get available LoRAs
  async getLoras(): Promise<any[]> {
    console.log(`Fetching LoRAs from ${this.apiUrl}/sdapi/v1/loras`);
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/loras`);
      if (!response.ok) throw new Error(`Failed to fetch LoRAs, status: ${response.status}`);
      
      const data = await response.json();
      console.log(`LoRAs fetched successfully:`, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch LoRAs:', error);
      return [];
    }
  }

  // Save base64 image to file (this would be handled by the backend in a real app)
  // For now we'll just simulate it by saving to local storage
  async saveGeneratedImage(promptId: string, imageBase64: string, promptData: Prompt): Promise<GeneratedImage | null> {
    console.log(`Saving generated image for prompt ID: ${promptId}`);
    try {
      // Generate a unique ID for the image
      const imageId = crypto.randomUUID();
      
      // In a real application, you would send this to your backend to save the image file
      // Here we'll simulate it with local storage
      const timestamp = new Date().toISOString();
      const filename = `img_${timestamp.replace(/[:.]/g, '-')}_${imageId.slice(0, 8)}.png`;
      
      const generatedImage: GeneratedImage = {
        id: imageId,
        promptId: promptId,
        filename: filename,
        path: `generated/${filename}`, // This would be a real path in a production app
        prompt: promptData.text,
        negativePrompt: promptData.negativePrompt,
        seed: promptData.seed,
        steps: promptData.steps,
        sampler: promptData.sampler,
        width: promptData.width,
        height: promptData.height,
        tags: promptData.tags || [],
        createdAt: timestamp,
      };
      
      // Save to local storage
      const existingDataStr = localStorage.getItem(STORAGE_KEY);
      const existingData = existingDataStr ? JSON.parse(existingDataStr) : { images: [] };
      
      // Store the base64 image data temporarily (in a production app, this would be a file path)
      // Warning: This will quickly fill up local storage with large images
      // Only for demonstration purposes
      localStorage.setItem(`img_${imageId}`, imageBase64);
      
      existingData.images = [...existingData.images, generatedImage];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
      
      console.log(`Image saved successfully with ID: ${imageId}`);
      return generatedImage;
    } catch (error) {
      console.error('Failed to save generated image:', error);
      return null;
    }
  }

  // Get all saved images
  getStoredImages(): GeneratedImage[] {
    console.log(`Retrieving stored images from localStorage`);
    const dataStr = localStorage.getItem(STORAGE_KEY);
    if (!dataStr) {
      console.log('No stored images found');
      return [];
    }
    
    const data = JSON.parse(dataStr);
    console.log(`Retrieved ${data.images?.length || 0} stored images`);
    return data.images || [];
  }

  // Get image data by ID
  getImageData(imageId: string): string | null {
    const imageData = localStorage.getItem(`img_${imageId}`);
    console.log(`Retrieved image data for ID ${imageId}: ${imageData ? 'SUCCESS' : 'NOT FOUND'}`);
    return imageData;
  }

  // Delete an image
  deleteImage(imageId: string): boolean {
    console.log(`Deleting image with ID: ${imageId}`);
    try {
      // Remove the image data
      localStorage.removeItem(`img_${imageId}`);
      
      // Remove from the image list
      const dataStr = localStorage.getItem(STORAGE_KEY);
      if (!dataStr) return false;
      
      const data = JSON.parse(dataStr);
      const initialCount = data.images.length;
      data.images = data.images.filter((img: GeneratedImage) => img.id !== imageId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      
      console.log(`Image deleted successfully. Images before: ${initialCount}, after: ${data.images.length}`);
      return true;
    } catch (error) {
      console.error('Failed to delete image:', error);
      return false;
    }
  }

  // Update image metadata
  updateImageMetadata(imageId: string, updates: Partial<GeneratedImage>): boolean {
    console.log(`Updating metadata for image ID: ${imageId}`, updates);
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      if (!dataStr) return false;
      
      const data = JSON.parse(dataStr);
      data.images = data.images.map((img: GeneratedImage) => {
        if (img.id === imageId) {
          return { ...img, ...updates };
        }
        return img;
      });
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log(`Image metadata updated successfully`);
      return true;
    } catch (error) {
      console.error('Failed to update image metadata:', error);
      return false;
    }
  }
}

// Export a singleton instance of the API service
export const apiService = new ApiService();