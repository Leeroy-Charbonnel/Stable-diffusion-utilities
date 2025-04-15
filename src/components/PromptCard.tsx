// src/components/PromptCard.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Prompt } from '../types';
import { Badge } from '@/components/ui/badge';

type PromptCardProps = {
  prompt: Prompt;
  onEditToggle: () => void;
  onDelete: () => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
};

export function PromptCard({ prompt, onEditToggle, onDelete, onMove }: PromptCardProps) {
  // Create a more compact display of the prompt details
  return (
    <Card className="overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between border-b">
        <div className="flex-1 cursor-pointer" onClick={onEditToggle}>
          <h3 className="text-sm font-medium truncate">{prompt.name}</h3>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(prompt.id, 'up')}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 15-6-6-6 6"/>
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(prompt.id, 'down')}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-3 cursor-pointer" onClick={onEditToggle}>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
          <div className="col-span-2 mb-1">
            <span className="text-xs text-muted-foreground line-clamp-1">{prompt.text}</span>
          </div>
          
          <div>
            <span className="font-medium">Seed:</span> {prompt.seed || 'Random'}
          </div>
          <div>
            <span className="font-medium">Steps:</span> {prompt.steps}
          </div>
          
          <div>
            <span className="font-medium">Size:</span> {prompt.width}×{prompt.height}
          </div>
          <div>
            <span className="font-medium">Run Count:</span> {prompt.runCount}
          </div>
          
          {prompt.loras && prompt.loras.length > 0 && (
            <div className="col-span-2 mt-1">
              <span className="font-medium">LoRAs:</span>{' '}
              {prompt.loras.map(lora => lora.name).join(', ')}
            </div>
          )}
          
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="col-span-2 mt-1">
              <div className="flex flex-wrap gap-1">
                {prompt.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs px-1 py-0 h-5">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}