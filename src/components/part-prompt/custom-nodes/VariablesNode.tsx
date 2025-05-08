// src/components/part-prompt/custom-nodes/VariablesNode.tsx
// Renamed back to "Variables Node" as requested
import React from 'react';
import { Node } from './Node';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { generateUUID } from '@/lib/utils';
import { NodeProps, VariableItem } from './types';

export const VariablesNode: React.FC<NodeProps> = ({
  id,
  position,
  data,
  updateNodeData,
  removeNode,
  startConnection,
  finishConnection
}) => {
  // Handle variable name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { name: e.target.value });
  };
  
  // Add a new variable value
  const addVariableValue = () => {
    const newVar: VariableItem = {
      id: generateUUID(),
      name: `value${(data.variables?.length || 0) + 1}`,
      probability: 100
    };
    
    updateNodeData(id, { 
      variables: [...(data.variables || []), newVar] 
    });
  };
  
  // Remove a variable value
  const removeVariableValue = (variableId: string) => {
    updateNodeData(id, {
      variables: (data.variables || []).filter(v => v.id !== variableId)
    });
  };
  
  // Update a variable value
  const updateVariableValue = (variableId: string, name: string) => {
    updateNodeData(id, {
      variables: (data.variables || []).map(v => 
        v.id === variableId ? { ...v, name } : v
      )
    });
  };
  
  // Update a variable probability
  const updateVariableProbability = (variableId: string, probability: number) => {
    updateNodeData(id, {
      variables: (data.variables || []).map(v => 
        v.id === variableId ? { ...v, probability } : v
      )
    });
  };
  
  return (
    <Node
      id={id}
      position={position}
      title="Variables Node"
      removeNode={removeNode}
      startConnection={startConnection}
      finishConnection={finishConnection}
      inputCount={0}
      outputCount={1}
      outputLabels={[data.name || "Variable"]}
      isResizable={true}
    >
      <div className="flex flex-col gap-3 min-w-[250px]">
        <div className="grid grid-cols-4 gap-2 items-center">
          <Label htmlFor={`var-name-${id}`} className="text-sm">Variable ID:</Label>
          <Input
            id={`var-name-${id}`}
            value={data.name || ''}
            onChange={handleNameChange}
            placeholder="Variable name"
            className="col-span-3 h-8"
          />
        </div>
        
        <div className="mt-2">
          <div className="flex justify-between items-center mb-2">
            <Label className="text-sm font-medium">Possible Values:</Label>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 px-2" 
              onClick={addVariableValue}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Value
            </Button>
          </div>
          
          <div className="space-y-3">
            {(data.variables || []).map((variable, index) => (
              <div key={variable.id} className="border rounded-md p-2">
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={variable.name}
                    onChange={(e) => updateVariableValue(variable.id, e.target.value)}
                    placeholder={`Value ${index + 1}`}
                    className="h-7 flex-grow"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => removeVariableValue(variable.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-4 gap-2 items-center">
                  <Label htmlFor={`prob-${variable.id}`} className="text-xs">
                    Probability:
                  </Label>
                  <div className="col-span-2">
                    <Slider
                      id={`prob-${variable.id}`}
                      value={[variable.probability || 100]}
                      min={1}
                      max={100}
                      step={1}
                      onValueChange={(value) => updateVariableProbability(variable.id, value[0])}
                    />
                  </div>
                  <div className="text-xs text-right">{variable.probability || 100}%</div>
                </div>
              </div>
            ))}
            
            {(!data.variables || data.variables.length === 0) && (
              <div className="text-center text-muted-foreground text-sm py-2">
                No values added. Add a value to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </Node>
  );
};

export default VariablesNode;