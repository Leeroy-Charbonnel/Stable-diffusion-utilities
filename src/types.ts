export type Tab = 'prompts' | 'ai';
export type AiChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  timestamp: string;
}



// src/components/part-prompt/custom-nodes/types.ts
export type NodeType = 'string' | 'variables' | 'prompt' | 'display';

export interface Position {
  x: number;
  y: number;
}

export interface NodeInputOutput {
  nodeId: string;
  type: 'input' | 'output';
  index: number;
}

export interface Connection {
  id: string;
  source: {
    nodeId: string;
    index: number;
  };
  target: {
    nodeId: string;
    index: number;
  };
}

export interface VariableItem {
  id: string;
  name: string;
  probability: number;
}

export interface NodeData {
  value?: string;
  variables?: VariableItem[];
  name?: string;
  variableId?: string;
  [key: string]: any;
}

export interface NodeInstance {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
}

export interface NodeProps {
  id: string;
  position: Position;
  data: NodeData;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  removeNode: (id: string) => void;
  startConnection: (nodeId: string, type: 'input' | 'output', index?: number) => void;
  finishConnection: (nodeId: string, type: 'input' | 'output', index?: number) => void;
  connections?: Connection[];
}

export interface Workflow {
  nodes: NodeInstance[];
  connections: Connection[];
  timestamp: string;
}