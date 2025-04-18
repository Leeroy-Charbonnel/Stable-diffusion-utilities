export interface LoraConfig {
  name: string;
  weight: number;
}

export type ExecutionStatus = 'idle' | 'global-execution' | 'single-execution' | 'cancelling' | 'completed' | 'failed';


export interface Prompt {
  id: string;
  isOpen: boolean;
  name: string;
  text: string;
  negativePrompt?: string;
  seed: number;
  steps: number;
  sampler: string;
  model: string;
  width: number;
  height: number;
  tags: string[];
  loras?: LoraConfig[];

  runCount: number;
  currentRun: number;
  stauts: string;
}

export interface ImageMetadata {
  id: string;
  folder: string;
  promptId: string;
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