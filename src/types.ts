export interface LoraConfig {
  name: string;
  weight: number;
}

export type ExecutionStatus = 'idle' | 'executing' | 'completed' | 'failed';


export interface Prompt {
  id: string;
  isOpen: boolean;
  name: string;
  text: string;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  sampler?: string;
  model?: string;
  width?: number;
  height?: number;
  tags: string[];
  loras?: LoraConfig[];

  runCount: number;
  currentRun: number;
  stauts: string;
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



export interface ImageMetadata {
  id: string;
  path: string;
  filename: string;
  prompt: string;
  negativePrompt?: string;
  seed: number;
  steps: number;
  width: number;
  height: number;
  sampler: string;
  model: string;
  tags: string[];
  createdAt: string;
}


export interface SaveImageRequest {
  id: string;
  imageBase64: string;
  metadata: ImageMetadata;
}