export interface Prompt {
  id: string;
  text: string;
  negativePrompt?: string;
  seed?: number; 
  steps?: number;
  sampler?: string;
  width?: number;
  height?: number;
  runCount: number;
  tags?: string[];
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