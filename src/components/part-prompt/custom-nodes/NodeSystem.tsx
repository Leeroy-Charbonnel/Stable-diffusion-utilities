// src/components/part-prompt/custom-nodes/NodeSystem.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Node } from './Node';
import { StringNode } from './StringNode';
import { VariablesNode } from './VariablesNode';
import { PromptNode } from './PromptNode';
import { DisplayNode } from './DisplayNode';
import { Connection, NodeType, NodeInstance, Position, NodeInputOutput } from './types';
import { generateUUID } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ZoomIn, ZoomOut, MinusCircle, Menu, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const NodeSystem: React.FC = () => {
    const [nodes, setNodes] = useState<NodeInstance[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [connecting, setConnecting] = useState<NodeInputOutput | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [selectedNodeType, setSelectedNodeType] = useState<NodeType>('string');
    const [flowResult, setFlowResult] = useState<any>(null);

    const canvasRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragStartY = useRef(0);
    const panStartX = useRef(0);
    const panStartY = useRef(0);

    // State for context menu
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        canvasX: number;
        canvasY: number;
    }>({
        visible: false,
        x: 0,
        y: 0,
        canvasX: 0,
        canvasY: 0
    });


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Implement keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'c') {
                    // Get the node under the cursor
                    // This is simplified; you might want more sophisticated selection logic
                    const nodeElements = document.querySelectorAll('[id^="node-"]');
                    let nodeUnderCursor = null;

                    nodeElements.forEach(el => {
                        if (el.matches(':hover')) {
                            const nodeId = el.id.replace('node-', '');
                            nodeUnderCursor = nodeId;
                        }
                    });

                    if (nodeUnderCursor) {
                        copyNode(nodeUnderCursor);
                        e.preventDefault();
                    }
                } else if (e.key === 'v') {
                    // Get cursor position relative to canvas
                    if (canvasRef.current) {
                        const rect = canvasRef.current.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / zoom) - (pan.x / zoom);
                        const y = ((e.clientY - rect.top) / zoom) - (pan.y / zoom);

                        pasteNode({ x, y });
                        e.preventDefault();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [zoom, pan, nodes]);


    // Create a new node
    const addNode = useCallback((type: NodeType, position: { x: number, y: number }, initialData?: any) => {
        const id = generateUUID();

        let defaultData = {};

        // Set default data based on node type
        switch (type) {
            case 'string':
                defaultData = { value: 'Enter text here...' };
                break;
            case 'variables':
                defaultData = {
                    name: 'var1',
                    variables: [{
                        id: generateUUID(),
                        name: 'value1',
                        probability: 100,
                    }],
                    variableId: id,
                };
                break;
            case 'prompt':
            case 'display':
                defaultData = { value: '' };
                break;
        }

        // Create new node with default or provided data
        const newNode: NodeInstance = {
            id,
            type,
            position,
            data: initialData ? { ...defaultData, ...initialData } : defaultData
        };

        setNodes(prev => [...prev, newNode]);
        return newNode;
    }, []);

    // Remove a node and its connections
    const removeNode = useCallback((id: string) => {
        setNodes(prev => prev.filter(node => node.id !== id));
        setConnections(prev => prev.filter(
            conn => conn.source.nodeId !== id && conn.target.nodeId !== id
        ));
    }, []);

    // Update node data
    const updateNodeData = useCallback((id: string, data: any) => {
        setNodes(prev => prev.map(node => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, ...data } };
            }

            // If this is a variables node, update all linked variables nodes
            if (node.type === 'variables' && data.variableId) {
                const sourceNode = prev.find(n => n.id === id);
                if (sourceNode?.type === 'variables' && sourceNode.data.variableId === node.data.variableId) {
                    return { ...node, data: { ...node.data, ...data } };
                }
            }

            return node;
        }));
    }, []);

    // Start connecting nodes
    const startConnection = useCallback((nodeId: string, type: 'input' | 'output', index: number = 0) => {
        setConnecting({ nodeId, type, index });
    }, []);

    // Finish connection between nodes
    const finishConnection = useCallback((nodeId: string, type: 'input' | 'output', index: number = 0) => {
        if (!connecting) return;

        // Cannot connect to self
        if (connecting.nodeId === nodeId) {
            setConnecting(null);
            return;
        }

        // Cannot connect input to input or output to output
        if (connecting.type === type) {
            setConnecting(null);
            return;
        }

        // Create connection object
        const source = connecting.type === 'output'
            ? { nodeId: connecting.nodeId, index: connecting.index }
            : { nodeId, index };

        const target = connecting.type === 'input'
            ? { nodeId: connecting.nodeId, index: connecting.index }
            : { nodeId, index };

        // Check if connection already exists
        const connectionExists = connections.some(
            conn =>
                conn.source.nodeId === source.nodeId &&
                conn.source.index === source.index &&
                conn.target.nodeId === target.nodeId &&
                conn.target.index === target.index
        );

        if (!connectionExists) {
            setConnections(prev => [...prev, { id: generateUUID(), source, target }]);
        }

        setConnecting(null);
    }, [connecting, connections]);

    // Remove a connection
    const removeConnection = useCallback((connectionId: string) => {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    }, []);

    // Handle zooming
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY;
        setZoom(prev => {
            const newZoom = Math.max(0.1, Math.min(2, prev - delta * 0.001));
            return newZoom;
        });
    }, []);

    // Handle canvas panning
    const handlePanStart = useCallback((e: React.MouseEvent) => {
        if (e.button === 1 || e.button === 0 && e.altKey) { // Middle mouse button or Alt+Left click
            e.preventDefault();
            isDragging.current = true;
            dragStartX.current = e.clientX;
            dragStartY.current = e.clientY;
            panStartX.current = pan.x;
            panStartY.current = pan.y;
        }
    }, [pan]);

    const handlePanMove = useCallback((e: MouseEvent) => {
        if (isDragging.current) {
            const dx = e.clientX - dragStartX.current;
            const dy = e.clientY - dragStartY.current;
            setPan({
                x: panStartX.current + dx,
                y: panStartY.current + dy
            });
        }
    }, []);

    const handlePanEnd = useCallback(() => {
        isDragging.current = false;
    }, []);

    // Add listeners for global mouse events
    useEffect(() => {
        window.addEventListener('mousemove', handlePanMove);
        window.addEventListener('mouseup', handlePanEnd);

        return () => {
            window.removeEventListener('mousemove', handlePanMove);
            window.removeEventListener('mouseup', handlePanEnd);
        };
    }, [handlePanMove, handlePanEnd]);

    // Handle context menu for adding nodes
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();

        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - pan.x) / zoom;
        const canvasY = (e.clientY - rect.top - pan.y) / zoom;

        // Show context menu at click position
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            canvasX,
            canvasY
        });
    }, [pan, zoom]);

    // Handle selecting a node type from context menu
    const handleNodeTypeSelect = useCallback((type: NodeType) => {
        addNode(type, { x: contextMenu.canvasX, y: contextMenu.canvasY });
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, [addNode, contextMenu]);


    const copyNode = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Store node data in localStorage
        const nodeCopy = {
            type: node.type,
            data: { ...node.data },
        };

        try {
            localStorage.setItem('node-clipboard', JSON.stringify(nodeCopy));
            console.log('Node copied to clipboard:', nodeCopy);
        } catch (e) {
            console.error('Failed to copy node:', e);
        }
    };

    // Paste node from clipboard
    const pasteNode = (position: { x: number, y: number }) => {
        try {
            const clipboard = localStorage.getItem('node-clipboard');
            if (!clipboard) return;

            const nodeCopy = JSON.parse(clipboard);

            // Create a new node with the copied data
            addNode(nodeCopy.type as NodeType, position, nodeCopy.data);
        } catch (e) {
            console.error('Failed to paste node:', e);
        }
    };





    // Run the flow
    const runFlow = useCallback(() => {
        // Clear previous results
        setFlowResult(null);

        // Create a map to store node outputs
        const nodeOutputs = new Map<string, any>();
        const processedNodes = new Set<string>();

        // Process nodes in order (simple topological sort)
        const processNode = (nodeId: string): any => {
            // If we've already processed this node, return its output
            if (processedNodes.has(nodeId)) {
                return nodeOutputs.get(nodeId);
            }

            const node = nodes.find(n => n.id === nodeId);
            if (!node) return null;

            let result: any = null;

            // Process based on node type
            switch (node.type) {
                case 'string':
                    result = node.data.value;
                    break;

                case 'variables':
                    // Get random value based on probability
                    const vars = node.data.variables || [];
                    if (vars.length > 0) {
                        // Sum of all probabilities
                        const totalProb = vars.reduce((sum, v) => sum + (v.probability || 100), 0);
                        let random = Math.random() * totalProb;

                        // Select a value based on probability
                        for (const v of vars) {
                            random -= (v.probability || 100);
                            if (random <= 0) {
                                result = v.name;
                                break;
                            }
                        }

                        // Fallback to first value
                        if (!result) {
                            result = vars[0].name;
                        }
                    }
                    break;

                case 'prompt':
                    // Get the prompt template
                    let promptTemplate = node.data.value || '';

                    // Find all input connections to this node
                    const inputConnections = connections.filter(
                        conn => conn.target.nodeId === nodeId
                    );

                    // Process each connected input
                    for (const conn of inputConnections) {
                        const sourceOutput = processNode(conn.source.nodeId);
                        const sourceNode = nodes.find(n => n.id === conn.source.nodeId);

                        if (sourceNode?.type === 'variables') {
                            // Replace variable placeholder with value
                            const varName = sourceNode.data.name || '';
                            promptTemplate = promptTemplate.replace(
                                new RegExp(`%${varName}%`, 'g'),
                                sourceOutput || ''
                            );
                        }
                    }

                    result = promptTemplate;
                    break;

                case 'display':
                    // Just pass through the input
                    const displayInputs = connections.filter(
                        conn => conn.target.nodeId === nodeId
                    );

                    if (displayInputs.length > 0) {
                        result = processNode(displayInputs[0].source.nodeId);
                    }
                    break;
            }

            // Store the result and mark as processed
            nodeOutputs.set(nodeId, result);
            processedNodes.add(nodeId);

            return result;
        };

        // Process all display nodes first (they should show final results)
        const displayNodes = nodes.filter(n => n.type === 'display');
        const results: Record<string, any> = {};

        for (const node of displayNodes) {
            results[node.id] = processNode(node.id);
        }

        // Process any other terminal nodes (nodes with no outputs)
        const connectedAsSource = new Set(connections.map(c => c.source.nodeId));
        const terminalNodes = nodes.filter(
            n => !connectedAsSource.has(n.id) && n.type !== 'display'
        );

        for (const node of terminalNodes) {
            results[node.id] = processNode(node.id);
        }

        setFlowResult(results);

        // Update display nodes with their input values
        for (const node of displayNodes) {
            updateNodeData(node.id, { value: results[node.id] || '' });
        }
    }, [nodes, connections, updateNodeData]);

    // Get position for node port
    const getPortPosition = (node: NodeInstance, type: 'input' | 'output', index: number): Position => {
        // For exact positioning based on the actual node element in the DOM
        const nodeElement = document.getElementById(`node-${node.id}`);

        if (!nodeElement) {
            // Direct fallback to node position with offsets
            const nodeWidth = 200; // Approximate width of a node
            return {
                x: node.position.x + (type === 'input' ? 0 : nodeWidth),
                y: node.position.y + 40 + (index * 30)
            };
        }

        const nodeRect = nodeElement.getBoundingClientRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };

        const portElement = document.getElementById(`${type}-port-${node.id}-${index}`);

        if (portElement) {
            const portRect = portElement.getBoundingClientRect();
            return {
                x: (portRect.left + portRect.width / 2 - canvasRect.left) / zoom,
                y: (portRect.top + portRect.height / 2 - canvasRect.top) / zoom
            };
        }

        // If port element not found, calculate based on node element
        return {
            x: (nodeRect.left + (type === 'input' ? 0 : nodeRect.width) - canvasRect.left) / zoom,
            y: (nodeRect.top + 40 + (index * 30) - canvasRect.top) / zoom
        };
    };

    // Update connection positions when nodes move
    useEffect(() => {
        // Re-render connections when nodes are moved
        const renderTimer = requestAnimationFrame(() => {
            // This forces a re-render, which recalculates connection positions
            setConnections(prev => [...prev]);
        });

        return () => cancelAnimationFrame(renderTimer);
    }, [nodes]);

    // Render connections
    const renderConnections = () => {
        return connections.map(conn => {
            const sourceNode = nodes.find(n => n.id === conn.source.nodeId);
            const targetNode = nodes.find(n => n.id === conn.target.nodeId);

            if (!sourceNode || !targetNode) return null;

            // Calculate positions for connection
            const sourcePos = getPortPosition(sourceNode, 'output', conn.source.index);
            const targetPos = getPortPosition(targetNode, 'input', conn.target.index);

            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;
            const controlPointX = Math.abs(dx) * 0.5;

            // Calculate path for better hit detection
            const path = `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + controlPointX} ${sourcePos.y}, ${targetPos.x - controlPointX} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;

            return (
                <svg
                    key={conn.id}
                    className="absolute top-0 left-0 w-full h-full z-0"
                    style={{ overflow: 'visible' }}
                >
                    <path
                        d={path}
                        stroke="transparent"
                        strokeWidth="10"
                        fill="none"
                        className="cursor-pointer"
                        onClick={() => removeConnection(conn.id)}
                    />
                    <path
                        d={path}
                        stroke="var(--border)"
                        strokeWidth="2"
                        fill="none"
                        className="connection-path"
                        onClick={() => removeConnection(conn.id)}
                    />
                </svg>
            );
        });
    };

    // Save workflow to JSON
    const saveWorkflow = () => {
        const workflow = {
            nodes,
            connections,
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Load workflow from JSON
    const loadWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workflow = JSON.parse(e.target?.result as string);

                if (workflow && workflow.nodes && workflow.connections) {
                    setNodes(workflow.nodes);
                    setConnections(workflow.connections);
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

    // Node type menu for context menu
    const NodeTypeMenu = ({ x, y, onSelect }: { x: number, y: number, onSelect: (type: NodeType) => void }) => {
        return (
            <div
                className="absolute z-50 bg-background border rounded-md shadow-md overflow-hidden"
                style={{ left: `${x}px`, top: `${y}px` }}
            >
                <div className="p-2 bg-muted font-medium text-sm">Add Node</div>
                <div className="p-1">
                    <button
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-sm"
                        onClick={() => onSelect('string')}
                    >
                        String Node
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-sm"
                        onClick={() => onSelect('variables')}
                    >
                        Link Node
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-sm"
                        onClick={() => onSelect('prompt')}
                    >
                        Prompt Node
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-sm"
                        onClick={() => onSelect('display')}
                    >
                        Display Node
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full">
            <div className="p-4 border-b flex justify-between items-center">
                <h1 className="text-xl font-bold">Custom Node System</h1>

                <div className="flex items-center space-x-4">
                    <Button onClick={runFlow} variant="default">
                        Run Flow
                    </Button>

                    <Separator orientation="vertical" className="h-8" />

                    <Button onClick={saveWorkflow} variant="outline">
                        Save
                    </Button>

                    <label htmlFor="load-workflow">
                        <Button variant="outline" asChild>
                            <span>Load</span>
                        </Button>
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

            <div
                ref={canvasRef}
                className="flex-grow overflow-hidden bg-background relative"
                onWheel={handleWheel}
                onMouseDown={handlePanStart}
                onContextMenu={handleContextMenu}
                style={{
                    backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
                    backgroundSize: '25px 25px'
                }}
            >
                <div
                    className="absolute origin-top-left"
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        width: '100%',
                        height: '100%'
                    }}
                >
                    {renderConnections()}

                    {nodes.map(node => {
                        switch (node.type) {
                            case 'string':
                                return (
                                    <StringNode
                                        key={node.id}
                                        id={node.id}
                                        position={node.position}
                                        data={node.data}
                                        updateNodeData={updateNodeData}
                                        removeNode={removeNode}
                                        startConnection={startConnection}
                                        finishConnection={finishConnection}
                                    />
                                );
                            case 'variables':
                                return (
                                    <VariablesNode
                                        key={node.id}
                                        id={node.id}
                                        position={node.position}
                                        data={node.data}
                                        updateNodeData={updateNodeData}
                                        removeNode={removeNode}
                                        startConnection={startConnection}
                                        finishConnection={finishConnection}
                                    />
                                );
                            case 'prompt':
                                return (
                                    <PromptNode
                                        key={node.id}
                                        id={node.id}
                                        position={node.position}
                                        data={node.data}
                                        updateNodeData={updateNodeData}
                                        removeNode={removeNode}
                                        startConnection={startConnection}
                                        finishConnection={finishConnection}
                                        connections={connections}
                                    />
                                );
                            case 'display':
                                return (
                                    <DisplayNode
                                        key={node.id}
                                        id={node.id}
                                        position={node.position}
                                        data={node.data}
                                        updateNodeData={updateNodeData}
                                        removeNode={removeNode}
                                        startConnection={startConnection}
                                        finishConnection={finishConnection}
                                    />
                                );
                            default:
                                return null;
                        }
                    })}

                    {/* Temporary connection while dragging */}
                    {connecting && (
                        <svg
                            className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                            style={{ overflow: 'visible' }}
                        >
                            <ConnectionLine
                                connecting={connecting}
                                nodes={nodes}
                                getPortPosition={getPortPosition}
                            />
                        </svg>
                    )}
                </div>

                {/* Toolbar in the bottom left */}
                <div className="absolute bottom-4 left-4 bg-background border rounded-md shadow-md p-2 z-10 flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="mx-1 text-sm">{Math.round(zoom * 100)}%</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Context menu for adding nodes */}
            {contextMenu.visible && (
                <NodeTypeMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onSelect={handleNodeTypeSelect}
                />
            )}

            {/* Click outside handler to close context menu */}
            {contextMenu.visible && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}
                />
            )}
        </div>
    );
};

// Helper component for rendering temporary connection line
const ConnectionLine: React.FC<{
    connecting: NodeInputOutput;
    nodes: NodeInstance[];
    getPortPosition: (node: NodeInstance, type: 'input' | 'output', index: number) => Position;
}> = ({ connecting, nodes, getPortPosition }) => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const canvasRect = document.getElementById('node-canvas')?.getBoundingClientRect() || { left: 0, top: 0 };
            setMousePos({
                x: e.clientX - canvasRect.left,
                y: e.clientY - canvasRect.top
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const node = nodes.find(n => n.id === connecting.nodeId);
    if (!node) return null;

    const nodePos = getPortPosition(node, connecting.type, connecting.index);
    const controlPointX = Math.abs(mousePos.x - nodePos.x) * 0.5;

    return (
        <path
            d={
                connecting.type === 'output'
                    ? `M ${nodePos.x} ${nodePos.y} C ${nodePos.x + controlPointX} ${nodePos.y}, ${mousePos.x - controlPointX} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`
                    : `M ${mousePos.x} ${mousePos.y} C ${mousePos.x + controlPointX} ${mousePos.y}, ${nodePos.x - controlPointX} ${nodePos.y}, ${nodePos.x} ${nodePos.y}`
            }
            stroke="var(--border)"
            strokeWidth="2"
            strokeDasharray="5,5"
            fill="none"
        />
    );
};

export default NodeSystem;