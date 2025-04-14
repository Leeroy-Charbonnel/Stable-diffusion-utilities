// src/types/prompt.ts
export interface PromptConfig {
  id: string;
  prompt: string;
  negativePrompt?: string;
  runCount: number;
  seed?: number;
  steps?: number;
  sampler?: string;
  width?: number;
  height?: number;
  cfgScale?: number;
  otherParams?: Record<string, any>;
}

// src/types/image.ts
export interface ImageMetadata {
  id: string;
  filename: string;
  path: string;
  prompt: string;
  negativePrompt?: string;
  seed: number;
  steps: number;
  sampler: string;
  width: number;
  height: number;
  cfgScale: number;
  tags: string[];
  createdAt: string;
  otherParams?: Record<string, any>;
}

export interface ImageWithBlob extends ImageMetadata {
  blob?: Blob;
  url?: string;
}

// src/types/api.ts
export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface TextToImageParams {
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  steps?: number;
  cfg_scale?: number;
  width?: number;
  height?: number;
  sampler_name?: string;
  batch_size?: number;
  n_iter?: number;
  [key: string]: any;
}

export interface TextToImageResponse {
  images: string[];
  parameters: TextToImageParams;
  info: string;
}
