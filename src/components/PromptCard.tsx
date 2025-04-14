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
    <Card className="overflow-hidden">
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="truncate">{prompt.text.substring(0, 60)}{prompt.text.length > 60 ? '...' : ''}</span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMove(prompt.id, 'up')}
              className="h-6 w-6"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMove(prompt.id, 'down')}
              className="h-6 w-6"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-0 px-4 text-xs">
        <div className="space-y-1">
          {prompt.negativePrompt && (
            <div className="text-xs">
              <span className="font-medium">Negative:</span> {prompt.negativePrompt.substring(0, 80)}
              {prompt.negativePrompt.length > 80 ? '...' : ''}
            </div>
          )}
          <div className="grid grid-cols-3 gap-x-2 text-xs">
            <div>
              <span className="font-medium">Seed:</span> {prompt.seed || 'Random'}
            </div>
            <div>
              <span className="font-medium">Steps:</span> {prompt.steps}
            </div>
            <div>
              <span className="font-medium">Run:</span> {prompt.runCount}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-2 text-xs">
            <div>
              <span className="font-medium">Sampler:</span> {prompt.sampler}
            </div>
            <div>
              <span className="font-medium">Size:</span> {prompt.width}x{prompt.height}
            </div>
            {prompt.tags?.length > 0 && (
              <div>
                <span className="font-medium">Tags:</span> {prompt.tags.length}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="py-2 px-4">
        <div className="flex justify-end space-x-2 w-full">
          <Button variant="outline" size="sm" onClick={onEdit} className="h-7 px-2 text-xs">
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} className="h-7 px-2 text-xs">
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}