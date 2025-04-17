import { Prompt, GeneratedImage } from '@/types';
import {
  saveGeneratedImage,
  getAllImageMetadata,
  getImageData as getStoredImageData,
  updateImageMetadata,
  deleteImage as deleteStoredImage
} from '@/lib/fileSystemApi';

// Configure the base URL for the Stable Diffusion API
const API_BASE_URL = 'http://localhost:7860'; // Default local address for AUTOMATIC1111

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
  private cachedImages: GeneratedImage[] = [];
  private isLoadingImages: boolean = false;

  constructor(baseUrl = API_BASE_URL) {
    this.apiUrl = baseUrl;
    console.log(`ApiService initialized with base URL: ${baseUrl}`);
    this.loadImages();
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
      const response = await fetch(`${this.apiUrl}/app_id`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Add a timeout to prevent hanging on connection issues
        signal: AbortSignal.timeout(5000)
      });
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate image, status: ${response.status}, message: ${errorText}`);
      }

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

  // Save generated image with metadata
  async saveGeneratedImage(promptId: string, imageBase64: string, promptData: Prompt): Promise<GeneratedImage | null> {
    console.log(`Saving generated image for prompt ID: ${promptId}`);
    try {
      // Generate a unique ID for the image
      const imageId = crypto.randomUUID();

      // Save using file system API
      const savedImage = await saveGeneratedImage(imageId, imageBase64, promptData);

      if (savedImage) {
        // Update the cached images
        this.cachedImages.push(savedImage);
        console.log(`Image saved successfully with ID: ${imageId}`);
      } else {
        console.error('Failed to save image: No response from file system API');
      }

      return savedImage;
    } catch (error) {
      console.error('Failed to save generated image:', error);
      return null;
    }
  }

  // Load images from the file system API
  private async loadImages() {
    if (this.isLoadingImages) return;

    this.isLoadingImages = true;
    console.log('Loading images from storage...');
    try {
      this.cachedImages = await getAllImageMetadata();
      console.log(`Loaded ${this.cachedImages.length} images from storage`);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      this.isLoadingImages = false;
    }
  }

  // Refresh images from storage
  async refreshImages() {
    console.log('Refreshing images from storage...');
    await this.loadImages();
    return this.cachedImages;
  }

  // Get all saved images
  getStoredImages(): GeneratedImage[] {
    return this.cachedImages;
  }

  // Get image data by ID
  async getImageData(imageId: string): Promise<string | null> {
    try {
      const imageData = await getStoredImageData(imageId);
      return imageData;
    } catch (error) {
      console.error(`Error getting image data for ID ${imageId}:`, error);
      return null;
    }
  }

  // Delete an image
  async deleteImage(imageId: string): Promise<boolean> {
    console.log(`Deleting image with ID: ${imageId}`);
    const success = await deleteStoredImage(imageId);

    if (success) {
      // Update cache
      this.cachedImages = this.cachedImages.filter(img => img.id !== imageId);
      console.log(`Image with ID ${imageId} deleted successfully`);
    } else {
      console.error(`Failed to delete image with ID ${imageId}`);
    }

    return success;
  }

  // Update image metadata
  async updateImageMetadata(imageId: string, updates: Partial<GeneratedImage>): Promise<boolean> {
    console.log(`Updating metadata for image ID: ${imageId}`, updates);
    const success = await updateImageMetadata(imageId, updates);

    if (success) {
      // Update cache
      this.cachedImages = this.cachedImages.map(img =>
        img.id === imageId ? { ...img, ...updates } : img
      );
      console.log(`Metadata updated successfully for image ID: ${imageId}`);
    } else {
      console.error(`Failed to update metadata for image ID: ${imageId}`);
    }

    return success;
  }
}

// Export a singleton instance of the API service
export const apiService = new ApiService();