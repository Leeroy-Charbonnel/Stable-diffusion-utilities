import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Edit, Trash2 } from 'lucide-react';
import { Prompt } from '../types';

type PromptCardProps = {
  prompt: Prompt;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
};

export function PromptCard({ prompt, onEdit, onDelete, onMove }: PromptCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="truncate">{prompt.text.substring(0, 60)}{prompt.text.length > 60 ? '...' : ''}</span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMove(prompt.id, 'up')}
              className="h-8 w-8"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMove(prompt.id, 'down')}
              className="h-8 w-8"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-sm space-y-2">
          {prompt.negativePrompt && (
            <div>
              <span className="font-medium">Negative prompt:</span> {prompt.negativePrompt.substring(0, 100)}
              {prompt.negativePrompt.length > 100 ? '...' : ''}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>
              <span className="font-medium">Seed:</span> {prompt.seed || 'Random'}
            </div>
            <div>
              <span className="font-medium">Steps:</span> {prompt.steps}
            </div>
            <div>
              <span className="font-medium">Sampler:</span> {prompt.sampler}
            </div>
            <div>
              <span className="font-medium">Size:</span> {prompt.width}x{prompt.height}
            </div>
          </div>
          <div>
            <span className="font-medium">Run count:</span> {prompt.runCount}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-1">
        <div className="flex justify-end space-x-2 w-full">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}