// src/components/part-prompt/custom-nodes/PromptNode.tsx
import React, { useState, useEffect } from 'react';
import { Node } from './Node';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { NodeProps, Connection } from './types';

export const PromptNode: React.FC<NodeProps & { connections?: Connection[] }> = ({
  id,
  position,
  data,
  updateNodeData,
  removeNode,
  startConnection,
  finishConnection,
  connections = []
}) => {
  const [inputCount, setInputCount] = useState(1);
  
  // Handle text value change
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { value: e.target.value });
  };
  
  // Count active connections to this node
  useEffect(() => {
    const connectedInputs = connections.filter(
      conn => conn.target.nodeId === id
    );
    
    // Always have at least one available input
    setInputCount(Math.max(connectedInputs.length + 1, 1));
  }, [connections, id]);
  
  // Get connected variables
  const connectedVariables = connections
    .filter(conn => conn.target.nodeId === id)
    .map(conn => {
      const variableId = conn.source.nodeId;
      const sourceNode = connections.find(c => c.source.nodeId === variableId)?.source.nodeId;
      const sourceNodeData = sourceNode ? { id: sourceNode } : null;
      return { index: conn.target.index, sourceNode: sourceNodeData };
    });
  
  return (
    <Node
      id={id}
      position={position}
      title="Prompt Node"
      removeNode={removeNode}
      startConnection={startConnection}
      finishConnection={finishConnection}
      inputCount={inputCount}
      outputCount={1}
      inputLabels={Array.from({ length: inputCount }).map((_, idx) => `Input ${idx + 1}`)}
      outputLabels={["Output"]}
      isResizable={true}
    >
      <div className="flex flex-col gap-3 min-w-[300px]">
        <Input
          value={data.value || ''}
          onChange={handleValueChange}
          placeholder="Enter prompt template. Use %variable_name% for variables."
          className="w-full"
        />
        
        <div className="mt-2">
          <div className="text-sm font-medium mb-2">Connected Variables:</div>
          <div className="flex flex-wrap gap-2">
            {connectedVariables.length > 0 ? (
              connectedVariables.map((variable, index) => (
                <Badge key={index} variant="secondary">
                  Input {variable.index + 1}
                </Badge>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                Connect variable nodes to inputs
              </div>
            )}
          </div>
        </div>
      </div>
    </Node>
  );
};

export default PromptNode;