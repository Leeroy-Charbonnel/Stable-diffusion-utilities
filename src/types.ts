// src/types/nodeTypes.ts
import { Node, Edge, Viewport } from 'reactflow';



export interface NodeData {
  label?: string;
  content: string;
  variables?: string;
  // Add any other custom data properties needed for nodes
}

export interface Workflow {
  id: string;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  viewport: Viewport;
  timestamp: string;
}

export type Tab = 'prompts' | 'ai';
export type AiChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  timestamp: string;
}