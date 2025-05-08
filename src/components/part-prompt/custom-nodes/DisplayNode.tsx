// src/components/part-prompt/custom-nodes/DisplayNode.tsx
import React from 'react';
import { Node } from './Node';
import { Textarea } from '@/components/ui/textarea';
import { NodeProps } from './types';

export const DisplayNode: React.FC<NodeProps> = ({
  id,
  position,
  data,
  updateNodeData,
  removeNode,
  startConnection,
  finishConnection
}) => {
  return (
    <Node
      id={id}
      position={position}
      title="Display Node"
      removeNode={removeNode}
      startConnection={startConnection}
      finishConnection={finishConnection}
      inputCount={1}
      outputCount={0}
      inputLabels={["Input"]}
      isResizable={true}
    >
      <div className="flex flex-col gap-2 min-w-[250px]">
        <Textarea
          value={data.value || ''}
          readOnly
          disabled
          placeholder="Connect an input to display its output here"
          className="min-h-[100px] w-full bg-muted"
        />
      </div>
    </Node>
  );
};

export default DisplayNode;