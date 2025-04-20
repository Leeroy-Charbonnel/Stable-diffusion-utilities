export interface LoraConfig {
  name: string;
  weight: number;
}

export type ExecutionStatus = 'idle' | 'global-execution' | 'single-execution' | 'cancelling' | 'completed' | 'failed';

export type AiChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  timestamp: string;
}

export interface CivitaiData {
  prompt: string;
  negativePrompt: string;
  model?: string;
  sampler?: string;
  seed?: number;
  steps?: number;
  width?: number;
  height?: number;
  loras?: LoraConfig[];
}

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
  status: string;
}

export interface ImageMetadata {
  id: string;
  name: string;
  folder: string;
  prompt: string;
  negativePrompt?: string;
  seed: number;
  steps: number;
  width: number;
  height: number;
  sampler: string;
  model: string;
  loras: LoraConfig[];
  tags: string[];
  createdAt: string;
}


export interface SaveImageRequest {
  id: string;
  imageBase64: string;
  metadata: ImageMetadata;
}