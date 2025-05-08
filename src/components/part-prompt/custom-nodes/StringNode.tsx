// src/components/part-prompt/custom-nodes/StringNode.tsx
import React from 'react';
import { Node } from './Node';
import { Textarea } from '@/components/ui/textarea';
import { NodeProps } from './types';

export const StringNode: React.FC<NodeProps> = ({
  id,
  position,
  data,
  updateNodeData,
  removeNode,
  startConnection,
  finishConnection
}) => {
  // Handle textarea change
  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { value: e.target.value });
  };
  
  return (
    <Node
      id={id}
      position={position}
      title="String Node"
      removeNode={removeNode}
      startConnection={startConnection}
      finishConnection={finishConnection}
      inputCount={0}
      outputCount={1}
      outputLabels={["String"]}
      isResizable={true}
    >
      <div className="flex flex-col gap-2">
        <Textarea
          value={data.value || ''}
          onChange={handleValueChange}
          placeholder="Enter text here..."
          className="min-h-[100px] w-full text-sm"
        />
      </div>
    </Node>
  );
};

export default StringNode;