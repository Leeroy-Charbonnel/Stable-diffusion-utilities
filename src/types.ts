
export interface LoraEditorConfig {
  name: string;
  weight: number;
  random: boolean;
}

export interface LoraConfig {
  name: string;
  weight: number;
}

export interface ModelConfig {
  label: string;
  value: string;
}

export type ExecutionStatus = 'idle' | 'execution' | 'cancelling' | 'completed';
export type AiChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  timestamp: string;
}


export interface PromptEditor {
  id: string;
  isOpen: boolean;
  runCount: number;
  currentRun: number;
  status: string;

  name: string;
  text: string;
  negativePrompt: string;
  cfgScale: number;
  seed: number;
  steps: number;
  sampler: string;
  width: number;
  height: number;
  tags: string[];

  models: ModelConfig[];
  lorasRandom: boolean;
  loras: LoraEditorConfig[];

}

export interface Prompt {
  name: string;
  text: string;
  negativePrompt: string;
  cfgScale: number;
  seed: number;
  steps: number;
  sampler: string;
  model: string;
  loras: LoraConfig[];
  width: number;
  height: number;
  tags: string[];

}

export interface ImageMetadata {
  id: string;
  path: string;
  folder: string;
  createdAt: string;
  promptData: Prompt;
}


export interface SaveImageRequest {
  id: string;
  imageBase64: string;
  metadata: ImageMetadata;
}