export interface LoraConfig {
  name: string;
  weight: number;
}

export type ExecutionStatus = 'idle' | 'global-execution' | 'single-execution' | 'cancelling' | 'completed' | 'failed';
// src/types.ts (add to existing file)

// Add OpenAI related types
export type AiModel = 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface AiSettings {
  apiKey: string;
  model: AiModel;
  temperature: number;
  maxTokens: number;
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
  path: string;
  folder: string;
  promptId: string;
  prompt: string;
  name: string; // Added name field
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