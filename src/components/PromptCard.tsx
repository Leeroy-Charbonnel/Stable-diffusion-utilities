import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Edit, Trash2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Prompt } from '../types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type PromptCardProps = {
  prompt: Prompt;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onDuplicate: (promptId: string) => void;
};

export function PromptCard({ 
  prompt, 
  onEdit, 
  onDelete, 
  onMove, 
  onDuplicate,
}: PromptCardProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="truncate">
                {prompt.text.substring(0, 60)}{prompt.text.length > 60 ? '...' : ''}
              </span>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMove(prompt.id, 'up')}
                  className="h-7 w-7"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMove(prompt.id, 'down')}
                  className="h-7 w-7"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2 pt-0">
            <div className="text-xs space-y-1.5">
              {prompt.negativePrompt && (
                <div className="text-muted-foreground">
                  <span className="font-medium">Negative:</span> {prompt.negativePrompt.substring(0, 80)}
                  {prompt.negativePrompt.length > 80 ? '...' : ''}
                </div>
              )}
              <div className="grid grid-cols-4 gap-x-2 text-muted-foreground">
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
              <div className="text-muted-foreground">
                <span className="font-medium">Run count:</span> {prompt.runCount}
              </div>
              
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {prompt.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-1 pb-3">
            <div className="flex justify-end space-x-1.5 w-full">
              <Button variant="outline" size="sm" onClick={onEdit} className="h-7 text-xs px-2">
                <Edit className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete} className="h-7 text-xs px-2">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </CardFooter>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Prompt
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDuplicate(prompt.id)}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate Prompt
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Prompt
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}