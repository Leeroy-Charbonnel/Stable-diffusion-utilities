
// src/components/part-prompt/nodes/StringNode.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Textarea } from "@/components/ui/textarea";
import { NodeData } from '@/types';

export function StringNode({ data, id, selected }: NodeProps<NodeData>) {
  const [content, setContent] = useState(data.content || '');
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Update the node data when content changes
  useEffect(() => {
    data.content = content;
  }, [content, data]);
  
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);
  
  return (
    <div 
      ref={nodeRef} 
      className="border border-border rounded-md bg-background p-4 shadow-md relative min-w-[200px] min-h-[100px]"
    >
      <NodeResizer 
        minWidth={200} 
        minHeight={100} 
        isVisible={selected} 
        lineClassName="border-primary"
        handleClassName="h-3 w-3 border border-primary bg-background"
      />
      
      <div className="font-medium text-sm mb-2 text-foreground/70">
        String Node
      </div>
      
      <Textarea
        value={content}
        onChange={handleContentChange}
        placeholder="Enter text here..."
        className="resize-none h-full min-h-[80px] w-full"
      />
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-3 h-3 !bg-primary border-foreground"
      />
    </div>
  );
}