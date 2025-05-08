// src/components/part-prompt/custom-nodes/Node.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, GripVertical, CornerRightDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NodeProps } from './types';

export const Node: React.FC<NodeProps & {
  title: string;
  children: React.ReactNode;
  inputCount?: number;
  outputCount?: number;
  inputLabels?: string[];
  outputLabels?: string[];
  isResizable?: boolean;
}> = ({
  id,
  position,
  title,
  children,
  removeNode,
  inputCount = 0,
  outputCount = 1,
  startConnection,
  finishConnection,
  inputLabels = [],
  outputLabels = [],
  isResizable = false
}) => {
    const [pos, setPos] = useState(position);
    const [size, setSize] = useState({ width: 300, height: 'auto' });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);
    const dragStartX = useRef(0);
    const dragStartY = useRef(0);
    const nodeStartX = useRef(0);
    const nodeStartY = useRef(0);
    const resizeStartWidth = useRef(0);
    const resizeStartHeight = useRef(0);

    // Update position if it changes externally
    useEffect(() => {
      setPos(position);
    }, [position]);

    // Handle drag start
    const handleDragStart = (e: React.MouseEvent) => {
      if (e.target instanceof HTMLElement &&
        (e.target.classList.contains('port') ||
          e.target.closest('.port') ||
          e.target.closest('.node-content') ||
          e.target.closest('.resize-handle'))) {
        return;
      }

      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
      nodeStartX.current = pos.x;
      nodeStartY.current = pos.y;
    };

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsResizing(true);
      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;

      // Get current node dimensions
      if (nodeRef.current) {
        resizeStartWidth.current = nodeRef.current.offsetWidth;
        resizeStartHeight.current = nodeRef.current.offsetHeight;
      }
    };

    // Handle node dragging and resizing
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const dx = e.clientX - dragStartX.current;
          const dy = e.clientY - dragStartY.current;

          setPos({
            x: nodeStartX.current + dx,
            y: nodeStartY.current + dy
          });
        } else if (isResizing) {
          const dx = e.clientX - dragStartX.current;
          const dy = e.clientY - dragStartY.current;

          setSize({
            width: Math.max(200, resizeStartWidth.current + dx),
            height: Math.max(100, resizeStartHeight.current + dy)
          });
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, isResizing]);

    // Handle copy paste behavior
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Only process if this node is selected (you'd need to add selection state)
        // For demonstration, we'll just check if the node is being hovered
        if (!nodeRef.current || !nodeRef.current.matches(':hover')) return;

        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'c') {
            // Copy node data to clipboard
            const nodeCopy = {
              type: 'node',
              id,
              position: pos,
              // Include other data you want to copy
            };
            localStorage.setItem('node-clipboard', JSON.stringify(nodeCopy));
          } else if (e.key === 'v') {
            // Paste node (this would need to be handled at the NodeSystem level)
            // For now, just console log
            console.log('Paste requested for node', id);
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [id, pos]);

    // Render input ports with labels
    const renderInputPorts = () => {
      return Array.from({ length: inputCount }).map((_, index) => (
        <div
          key={`input-${index}`}
          className="port-container flex items-center absolute left-0 h-6"
          style={{ top: `${40 + index * 30}px` }}
        >
          <div
            id={`input-port-${id}-${index}`}
            className="port input-port w-3 h-3 bg-blue-500 rounded-full -ml-1.5 cursor-pointer hover:scale-125 transition-transform"
            onMouseDown={() => startConnection(id, 'input', index)}
            onMouseUp={() => finishConnection(id, 'input', index)}
          />
          <span className="text-xs ml-2">{inputLabels[index] || `Input ${index + 1}`}</span>
        </div>
      ));
    };

    // Render output ports with labels
    const renderOutputPorts = () => {
      return Array.from({ length: outputCount }).map((_, index) => (
        <div
          key={`output-${index}`}
          className="port-container flex items-center justify-end absolute right-0 h-6"
          style={{ top: `${40 + index * 30}px` }}
        >
          <span className="text-xs mr-2">{outputLabels[index] || `Output ${index + 1}`}</span>
          <div
            id={`output-port-${id}-${index}`}
            className="port output-port w-3 h-3 bg-green-500 rounded-full -mr-1.5 cursor-pointer hover:scale-125 transition-transform"
            onMouseDown={() => startConnection(id, 'output', index)}
            onMouseUp={() => finishConnection(id, 'output', index)}
          />
        </div>
      ));
    };

    return (
      <div
        id={`node-${id}`}
        ref={nodeRef}
        className="absolute border rounded-md bg-background shadow-md select-none"
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: typeof size.width === 'number' ? `${size.width}px` : size.width,
          height: typeof size.height === 'number' ? `${size.height}px` : size.height,
          zIndex: isDragging || isResizing ? 10 : 1,
        }}
      >
        <div
          className="node-header flex items-center justify-between p-2 bg-secondary rounded-t-md cursor-grab"
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 opacity-50" />
            <div className="font-medium text-sm">{title}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => removeNode(id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="node-content p-3 relative">
          {children}
        </div>

        {renderInputPorts()}
        {renderOutputPorts()}

        {isResizable && (
          <div
            className="resize-handle absolute bottom-1 right-1 cursor-se-resize"
            onMouseDown={handleResizeStart}
          >
            <CornerRightDown className="h-4 w-4 opacity-50" />
          </div>
        )}
      </div>
    );
  };

export default Node;