// src/components/part-prompt/nodes/PromptNode.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { NodeData } from '@/types';

export function PromptNode({ data, id, selected }: NodeProps<NodeData>) {
  const [content, setContent] = useState(data.content || '');
  const [variables, setVariables] = useState(data.variables || '');
  const [activeTab, setActiveTab] = useState('prompt');
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Update the node data when content or variables change
  useEffect(() => {
    data.content = content;
    data.variables = variables;
  }, [content, variables, data]);
  
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);
  
  const handleVariablesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVariables(e.target.value);
  }, []);
  
  // Generate a preview with variable placeholders
  const getPreview = useCallback(() => {
    let previewText = content;
    try {
      // Parse variables
      const parsedVariables: Record<string, string[]> = {};
      const lines = variables.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const [name, values] = line.split(':', 2);
        if (name && values) {
          const varName = name.trim();
          const varValues = values.split('|').map(v => v.trim()).filter(Boolean);
          parsedVariables[varName] = varValues;
        }
      }
      
      // Replace placeholders with first value or placeholder text
      for (const [name, values] of Object.entries(parsedVariables)) {
        const placeholder = `%${name}%`;
        const replacement = values.length > 0 ? values[0] : `[${name}]`;
        previewText = previewText.replace(new RegExp(placeholder, 'g'), replacement);
      }
      
      // Process probability patterns
      const probPattern = /\((.*?) (\d+)%\)/g;
      previewText = previewText.replace(probPattern, (_, content, probability) => {
        return `(${content} ${probability}%)`;
      });
      
      return previewText;
    } catch (error) {
      console.error('Error generating preview:', error);
      return content;
    }
  }, [content, variables]);
  
  return (
    <div 
      ref={nodeRef} 
      className="border border-border rounded-md bg-background p-4 shadow-md relative min-w-[250px] min-h-[200px]"
    >
      <NodeResizer 
        minWidth={250} 
        minHeight={200} 
        isVisible={selected} 
        lineClassName="border-primary"
        handleClassName="h-3 w-3 border border-primary bg-background"
      />
      
      <div className="font-medium text-sm mb-2 text-foreground/70">
        Prompt Node
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-2 w-full">
          <TabsTrigger value="prompt" className="flex-1">Prompt</TabsTrigger>
          <TabsTrigger value="variables" className="flex-1">Variables</TabsTrigger>
          <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="prompt" className="h-full">
          <Textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Enter prompt text here. Use %variable% for variables."
            className="resize-none h-full min-h-[120px] w-full"
          />
        </TabsContent>
        
        <TabsContent value="variables" className="h-full">
          <Label htmlFor={`variables-${id}`} className="text-xs block mb-1">
            Format: variable: value1 | value2 | value3
          </Label>
          <Textarea
            id={`variables-${id}`}
            value={variables}
            onChange={handleVariablesChange}
            placeholder="var1: value1-1 | value1-2\nvar2: value2-1 | value2-2"
            className="resize-none h-full min-h-[120px] w-full font-mono text-sm"
          />
        </TabsContent>
        
        <TabsContent value="preview" className="h-full">
          <div className="border rounded p-2 min-h-[120px] h-full overflow-auto whitespace-pre-wrap text-sm">
            {getPreview()}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="w-3 h-3 !bg-primary border-foreground"
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