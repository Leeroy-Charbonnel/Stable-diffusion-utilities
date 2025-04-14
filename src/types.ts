export interface LoraConfig {
  name: string;
  weight: number;
}

export interface Prompt {
  id: string;
  text: string;
  negativePrompt?: string;
  seed?: number; 
  steps?: number;
  sampler?: string;
  model?: string;
  width?: number;
  height?: number;
  runCount: number;
  tags?: string[];
  loras?: LoraConfig[];
}

export interface GeneratedImage {
  id: string;
  promptId: string;
  filename: string;
  path: string;
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  sampler?: string;
  width?: number;
  height?: number;
  tags: string[];
  createdAt: string;
}