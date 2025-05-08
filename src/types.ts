// src/types.ts

// Basic image metadata structure
export interface ImageMetadata {
  id: string;
  path: string;
  folder: string;
  createdAt: string;
  promptData: PromptData;
}

// Simplified prompt data structure
export interface PromptData {
  name: string;
  text: string;
  negativePrompt: string;
  cfgScale: number;
  seed: number;
  steps: number;
  sampler: string;
  model: string;
  width: number;
  height: number;
  tags: string[];
  loras: LoraConfig[];
  embeddings: EmbeddingConfig[];
}

// Chat message structure for AI
export interface ChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  timestamp: string;
}

export type AiChatRole = 'user' | 'assistant' | 'system';

// Support types
export interface LoraConfig {
  name: string;
  weight: number;
}

export interface EmbeddingConfig {
  name: string;
  weight: number;
}

export interface LabelItem {
  name: string;
  label: string;
}

export interface LabelsData {
  modelLabels: LabelItem[];
  lorasLabels: LabelItem[];
  embeddingsLabels: LabelItem[];
}