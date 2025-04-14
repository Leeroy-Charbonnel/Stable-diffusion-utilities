// src/components/prompt/PromptForm.tsx
import React, { useState } from 'react';
import { PromptConfig } from '../../types/prompt';
import { usePrompts } from '../../context/PromptContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface PromptFormProps {
  initialPrompt?: PromptConfig;
  onSubmit?: () => void;
}

const DEFAULT_PROMPT: Omit<PromptConfig, 'id'> = {
  prompt: '',
  negativePrompt: '',
  runCount: 1,
  steps: 20,
  sampler: 'Euler a',
  width: 512,
  height: 512,
  cfgScale: 7,
};

const SAMPLER_OPTIONS = [
  'Euler a',
  'Euler',
  'LMS',
  'Heun',
  'DPM2',
  'DPM2 a',
  'DPM++ 2S a',
  'DPM++ 2M',
  'DPM++ SDE',
  'DDIM',
  'PLMS',
];

export const PromptForm: React.FC<PromptFormProps> = ({ initialPrompt, onSubmit }) => {
  const { addPrompt, updatePrompt } = usePrompts();
  const [promptData, setPromptData] = useState<Omit<PromptConfig, 'id'>>(
    initialPrompt ? { ...initialPrompt } : DEFAULT_PROMPT
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPromptData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    
    if (!isNaN(numValue)) {
      setPromptData(prev => ({ ...prev, [name]: numValue }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setPromptData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (initialPrompt) {
      updatePrompt(initialPrompt.id, promptData);
    } else {
      addPrompt(promptData);
      setPromptData(DEFAULT_PROMPT); //Reset form for new prompt
    }
    
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{initialPrompt ? 'Edit Prompt' : 'Create New Prompt'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              name="prompt"
              value={promptData.prompt}
              onChange={handleChange}
              required
              placeholder="Enter your prompt here..."
              className="min-h-32"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="negativePrompt">Negative Prompt</Label>
            <Textarea
              id="negativePrompt"
              name="negativePrompt"
              value={promptData.negativePrompt}
              onChange={handleChange}
              placeholder="Enter negative prompt here..."
              className="min-h-20"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="runCount">Run Count</Label>
              <Input
                id="runCount"
                name="runCount"
                type="number"
                min="1"
                max="100"
                value={promptData.runCount}
                onChange={handleNumberChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seed">Seed (-1 for random)</Label>
              <Input
                id="seed"
                name="seed"
                type="number"
                value={promptData.seed ?? -1}
                onChange={handleNumberChange}
                placeholder="-1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="steps">Steps</Label>
              <Input
                id="steps"
                name="steps"
                type="number"
                min="1"
                max="150"
                value={promptData.steps}
                onChange={handleNumberChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sampler">Sampling Method</Label>
              <Select
                value={promptData.sampler}
                onValueChange={(value) => handleSelectChange('sampler', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sampler" />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLER_OPTIONS.map((sampler) => (
                    <SelectItem key={sampler} value={sampler}>
                      {sampler}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                name="width"
                type="number"
                min="64"
                max="2048"
                step="8"
                value={promptData.width}
                onChange={handleNumberChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                name="height"
                type="number"
                min="64"
                max="2048"
                step="8"
                value={promptData.height}
                onChange={handleNumberChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cfgScale">CFG Scale</Label>
              <Input
                id="cfgScale"
                name="cfgScale"
                type="number"
                min="1"
                max="30"
                step="0.5"
                value={promptData.cfgScale}
                onChange={handleNumberChange}
              />
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => setPromptData(DEFAULT_PROMPT)}>
            Reset
          </Button>
          <Button type="submit">
            {initialPrompt ? 'Update Prompt' : 'Add Prompt'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

// src/components/prompt/PromptItem.tsx
import React from 'react';
import { PromptConfig } from '../../types/prompt';
import { usePrompts } from '../../context/PromptContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Edit, Trash2, Copy, MoveVertical } from 'lucide-react';

interface PromptItemProps {
  prompt: PromptConfig;
  onEdit: (prompt: PromptConfig) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}

export const PromptItem: React.FC<PromptItemProps> = ({ 
  prompt, 
  onEdit, 
  isDragging = false,
  dragHandleProps
}) => {
  const { deletePrompt } = usePrompts();

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      deletePrompt(prompt.id);
    }
  };

  const handleDuplicate = () => {
    //Will be implemented through usePrompts context
    const { id, ...promptData } = prompt;
    const { addPrompt } = usePrompts();
    addPrompt(promptData);
  };

  return (
    <Card 
      className={`mb-4 transition-all ${isDragging ? 'opacity-50 border-dashed' : ''}`}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div {...dragHandleProps} className="cursor-grab p-1">
            <MoveVertical size={18} />
          </div>
          <CardTitle className="text-base">Run {prompt.runCount} time(s)</CardTitle>
        </div>
        <div className="flex gap-1">
          <Badge variant="secondary">
            {prompt.width}×{prompt.height}
          </Badge>
          <Badge variant="outline">{prompt.sampler}</Badge>
          {prompt.seed !== undefined && prompt.seed >= 0 && (
            <Badge variant="outline">Seed: {prompt.seed}</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="text-sm font-medium overflow-hidden">
            <span className="line-clamp-2">{prompt.prompt}</span>
          </div>
          
          {prompt.negativePrompt && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Negative: </span>
              <span className="line-clamp-1">{prompt.negativePrompt}</span>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Steps: {prompt.steps} • CFG: {prompt.cfgScale}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(prompt)}>
          <Edit size={16} className="mr-1" />
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={handleDuplicate}>
          <Copy size={16} className="mr-1" />
          Duplicate
        </Button>
        <Button size="sm" variant="destructive" onClick={handleDelete}>
          <Trash2 size={16} className="mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

// src/components/prompt/PromptList.tsx
import React, { useState } from 'react';
import { PromptConfig } from '../../types/prompt';
import { usePrompts } from '../../context/PromptContext';
import { PromptItem } from './PromptItem';
import { PromptForm } from './PromptForm';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

export const PromptList: React.FC = () => {
  const { prompts, reorderPrompts } = usePrompts();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptConfig | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  
  const handleEdit = (prompt: PromptConfig) => {
    setEditingPrompt(prompt);
    setIsAddDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingPrompt(null);
  };

  const handleClearAll = () => {
    //This will be handled in the usePrompts context
    setClearAllDialogOpen(false);
  };

  //This would be replaced with a proper drag-and-drop implementation
  //using a library like react-beautiful-dnd
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    reorderPrompts(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index >= prompts.length - 1) return;
    reorderPrompts(index, index + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Prompt List ({prompts.length})</h2>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={() => setClearAllDialogOpen(true)}
            disabled={prompts.length === 0}
          >
            Clear All
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus size={16} className="mr-1" /> Add Prompt
          </Button>
        </div>
      </div>

      {prompts.length === 0 ? (
        <div className="text-center p-8 border rounded-lg border-dashed">
          <p className="text-muted-foreground">No prompts added yet. Add your first prompt to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prompts.map((prompt, index) => (
            <PromptItem 
              key={prompt.id} 
              prompt={prompt} 
              onEdit={handleEdit}
              dragHandleProps={{
                //Simplified drag handle props for the example
                onClick: () => {},
              }}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Prompt Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}</DialogTitle>
          </DialogHeader>
          <PromptForm 
            initialPrompt={editingPrompt || undefined} 
            onSubmit={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      {/* Confirm Clear All Dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Prompts</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all prompts in your list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
