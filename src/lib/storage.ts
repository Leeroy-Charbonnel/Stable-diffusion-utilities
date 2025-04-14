// src/lib/storage.ts
import { PromptConfig } from '../types/prompt';
import { ImageMetadata } from '../types/image';

const PROMPTS_STORAGE_KEY = 'sd-prompt-manager-prompts';
const IMAGES_STORAGE_KEY = 'sd-prompt-manager-images';
const SETTINGS_STORAGE_KEY = 'sd-prompt-manager-settings';

export const savePrompts = (prompts: PromptConfig[]): void => {
  localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
};

export const loadPrompts = (): PromptConfig[] => {
  const storedPrompts = localStorage.getItem(PROMPTS_STORAGE_KEY);
  return storedPrompts ? JSON.parse(storedPrompts) : [];
};

export const saveImages = (images: ImageMetadata[]): void => {
  localStorage.setItem(IMAGES_STORAGE_KEY, JSON.stringify(images));
};

export const loadImages = (): ImageMetadata[] => {
  const storedImages = localStorage.getItem(IMAGES_STORAGE_KEY);
  return storedImages ? JSON.parse(storedImages) : [];
};

export const exportData = (): string => {
  const data = {
    prompts: loadPrompts(),
    images: loadImages(),
    settings: loadSettings(),
  };
  return JSON.stringify(data, null, 2);
};

export const importData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    
    if (data.prompts) {
      savePrompts(data.prompts);
    }
    
    if (data.images) {
      saveImages(data.images);
    }
    
    if (data.settings) {
      saveSettings(data.settings);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
};

//Settings management
export interface ApiSettings {
  baseUrl: string;
  username?: string;
  password?: string;
}

export const defaultSettings: ApiSettings = {
  baseUrl: 'http://127.0.0.1:7860',
};

export const saveSettings = (settings: ApiSettings): void => {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

export const loadSettings = (): ApiSettings => {
  const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
  return storedSettings ? JSON.parse(storedSettings) : defaultSettings;
};

// src/lib/api.ts
import { TextToImageParams, TextToImageResponse } from '../types/api';
import { loadSettings } from './storage';

//Basic authentication helper
const createAuthHeader = (username?: string, password?: string) => {
  if (!username || !password) return {};
  
  const credentials = btoa(`${username}:${password}`);
  return {
    'Authorization': `Basic ${credentials}`
  };
};

//API client for stable-diffusion-webui
export class SDApiClient {
  private baseUrl: string;
  private authHeaders: Record<string, string>;
  
  constructor() {
    const settings = loadSettings();
    this.baseUrl = settings.baseUrl;
    this.authHeaders = createAuthHeader(settings.username, settings.password);
  }
  
  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${await response.text()}`);
    }
    
    return response.json();
  }
  
  //Generate images using text-to-image endpoint
  async generateImages(params: TextToImageParams): Promise<TextToImageResponse> {
    return this.fetchApi<TextToImageResponse>('/sdapi/v1/txt2img', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
  
  //Get a list of available samplers
  async getSamplers(): Promise<{name: string; aliases: string[]}[]> {
    return this.fetchApi<{name: string; aliases: string[]}[]>('/sdapi/v1/samplers');
  }
  
  //Get a list of available models
  async getModels(): Promise<{title: string; model_name: string}[]> {
    return this.fetchApi<{title: string; model_name: string}[]>('/sdapi/v1/sd-models');
  }
  
  //Get current options
  async getOptions(): Promise<Record<string, any>> {
    return this.fetchApi<Record<string, any>>('/sdapi/v1/options');
  }
  
  //Set options
  async setOptions(options: Record<string, any>): Promise<Record<string, any>> {
    return this.fetchApi<Record<string, any>>('/sdapi/v1/options', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }
  
  //Helper to convert base64 image to blob
  static base64ToBlob(base64: string, type = 'image/png'): Blob {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type });
  }
  
  //Update API settings
  updateSettings(baseUrl: string, username?: string, password?: string): void {
    this.baseUrl = baseUrl;
    this.authHeaders = createAuthHeader(username, password);
    
    //Save the new settings
    saveSettings({
      baseUrl,
      username,
      password
    });
  }
}

// Default API client instance
export const apiClient = new SDApiClient();

// src/lib/utils.ts
import { ImageMetadata } from '../types/image';
import { PromptConfig } from '../types/prompt';
import { TextToImageParams } from '../types/api';

//Convert a PromptConfig to TextToImageParams for the API
export const promptConfigToApiParams = (config: PromptConfig): TextToImageParams => {
  return {
    prompt: config.prompt,
    negative_prompt: config.negativePrompt,
    seed: config.seed || -1, //Use -1 for random seed
    steps: config.steps || 20,
    cfg_scale: config.cfgScale || 7,
    width: config.width || 512,
    height: config.height || 512,
    sampler_name: config.sampler || 'Euler a',
    batch_size: 1,
    n_iter: 1,
    ...config.otherParams
  };
};

//Create a filename from the prompt (with truncation and sanitization)
export const createFilenameFromPrompt = (prompt: string): string => {
  const sanitized = prompt
    .replace(/[^a-zA-Z0-9]/g, '_') //Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') //Replace multiple underscores with single
    .substring(0, 50); //Truncate to reasonable length
    
  const timestamp = Date.now();
  return `${sanitized}_${timestamp}.png`;
};

//Save a blob to a file
export const saveBlobToFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

//Load file as Text
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

//Helper to get distinct tags from all images
export const getDistinctTags = (images: ImageMetadata[]): string[] => {
  const tagSet = new Set<string>();
  
  images.forEach(image => {
    image.tags.forEach(tag => {
      tagSet.add(tag);
    });
  });
  
  return Array.from(tagSet).sort();
};
