export interface LabelItem {
  name: string;
  label: string;
}

export interface LabelsData {
  modelLabels: LabelItem[];
  lorasLabels: LabelItem[];
  embeddingsLabels: LabelItem[];
}


export interface Lora {
  name: string;
  weight: number;
}

export interface LoraEditorConfig {
  name: string;
  weight: number;
  random: boolean;
}

// Add embedding interface
export interface Embedding {
  name: string;
  weight: number;
}

export interface EmbeddingEditorConfig {
  name: string;
  weight: number;
  random: boolean;
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

  models: string[];
  lorasRandom: boolean;
  loras: LoraEditorConfig[];
  embeddingsRandom: boolean; // Added
  embeddings: EmbeddingEditorConfig[]; // Added
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
  loras: Lora[];
  embeddings: Embedding[]; // Added
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

export interface ProgressData {
  progress: number;
  eta_relative: number;
  state: {
    skipped: boolean;
    interrupted: boolean;
    stopping_generation: boolean;
    job: string;
    job_count: number;
    job_timestamp: string;
    job_no: number;
    sampling_step: number;
    sampling_steps: number;
  };
  current_image: string;
  textinfo: string | null;
}