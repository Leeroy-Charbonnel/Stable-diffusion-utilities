// src/components/part-prompt/PromptsManager.tsx
import React, { useState, useCallback, useRef, MouseEvent } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  NodeTypes,
  useReactFlow,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { generateUUID } from '@/lib/utils';
import { StringNode } from './nodes/StringNode';
import { PromptNode } from './nodes/PromptNode';
import { NodeData, Workflow } from '@/types';

// Define the node types
const nodeTypes: NodeTypes = {
  stringNode: StringNode,
  promptNode: PromptNode,
};

export function PromptsManager() {
  // State for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // State for the save workflow dialog
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  
  // Context menu position
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  // Ref to track the current workflow
  const workflowRef = useRef<Workflow | null>(null);
  
  // Get the ReactFlow instance
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Handle connections between nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );
  
  // Handle right-click to show context menu
  const onContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      if (reactFlowWrapper.current) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });
        setMenuPosition(position);
      }
    },
    [reactFlowInstance]
  );
  
  // Add a new string node
  const addStringNode = useCallback(() => {
    const id = generateUUID();
    const newNode: Node<NodeData> = {
      id,
      type: 'stringNode',
      position: menuPosition,
      data: { label: 'String Node', content: '' },
      style: { width: 300, height: 150 },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [menuPosition, setNodes]);
  
  // Add a new prompt node
  const addPromptNode = useCallback(() => {
    const id = generateUUID();
    const newNode: Node<NodeData> = {
      id,
      type: 'promptNode',
      position: menuPosition,
      data: { 
        label: 'Prompt Node', 
        content: '', 
        variables: 'var1: value1-1 | value1-2\nvar2: value2-1 | value2-2' 
      },
      style: { width: 350, height: 300 },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [menuPosition, setNodes]);
  
  // Save the current workflow
  const saveWorkflow = () => {
    if (!workflowName) return;
    
    const flow = reactFlowInstance.toObject();
    const workflow: Workflow = {
      id: workflowRef.current?.id || generateUUID(),
      name: workflowName,
      nodes: flow.nodes,
      edges: flow.edges,
      viewport: flow.viewport,
      timestamp: new Date().toISOString(),
    };
    
    // Save to localStorage for now, can be replaced with API call
    const existingWorkflows = JSON.parse(localStorage.getItem('node-workflows') || '[]');
    const updatedWorkflows = existingWorkflows.filter((w: Workflow) => w.id !== workflow.id);
    updatedWorkflows.push(workflow);
    localStorage.setItem('node-workflows', JSON.stringify(updatedWorkflows));
    
    workflowRef.current = workflow;
    setSaveDialogOpen(false);
    
    // Save to file
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Load a workflow
  const loadWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflow = JSON.parse(e.target?.result as string) as Workflow;
        if (workflow && workflow.nodes && workflow.edges) {
          setNodes(workflow.nodes);
          setEdges(workflow.edges);
          if (workflow.viewport) {
            reactFlowInstance.setViewport(workflow.viewport);
          }
          workflowRef.current = workflow;
          setWorkflowName(workflow.name);
        }
      } catch (error) {
        console.error('Error loading workflow:', error);
        alert('Invalid workflow file');
      }
    };
    reader.readAsText(file);
    
    // Reset the input value to allow loading the same file again
    event.target.value = '';
  };
  
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">Node-Based Prompt Manager</h1>
        <div className="flex gap-2">
          <Button onClick={() => setSaveDialogOpen(true)}>Save Workflow</Button>
          <label htmlFor="load-workflow">
            <Button >Load Workflow</Button>
            <input
              id="load-workflow"
              type="file"
              accept=".json"
              className="hidden"
              onChange={loadWorkflow}
            />
          </label>
        </div>
      </div>
      
      <div className="flex-grow relative" ref={reactFlowWrapper}>
        <ContextMenu>
          <ContextMenuTrigger>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onContextMenu={onContextMenu}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              maxZoom={2}
              minZoom={0.1}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            >
              <Background color="#aaa" gap={16} />
              <Controls />
              
              <Panel position="bottom-right">
                <div className="bg-background p-2 rounded-md shadow-md">
                  <p className="text-xs">Right-click to add nodes</p>
                </div>
              </Panel>
            </ReactFlow>
          </ContextMenuTrigger>
          
          <ContextMenuContent>
            <ContextMenuItem onClick={addStringNode}>Add String Node</ContextMenuItem>
            <ContextMenuItem onClick={addPromptNode}>Add Prompt Node</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
      
      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Workflow</DialogTitle>
            <DialogDescription>
              Enter a name for your workflow. This will be saved as a JSON file.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workflow-name" className="text-right">
                Name
              </Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={saveWorkflow} disabled={!workflowName}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}