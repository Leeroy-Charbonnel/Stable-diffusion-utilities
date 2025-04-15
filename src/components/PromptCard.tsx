// src/components/PromptCard.tsx
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Check, X, Play } from 'lucide-react';
import { Prompt } from '../types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PromptForm } from './PromptForm';

type PromptCardProps = {
  prompt: Prompt;
  onEditToggle: () => void;
  onDelete: () => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  isEditing: boolean;
  onPromptUpdate: (updatedPrompt: Prompt) => void;
  onRunPrompt: (prompt: Prompt) => void;
  availableSamplers?: string[];
  availableModels?: string[];
  availableLoras?: any[];
  currentModel?: string;
};

export function PromptCard({
  prompt,
  onEditToggle,
  onDelete,
  onMove,
  isEditing,
  onPromptUpdate,
  onRunPrompt,
  availableSamplers = [],
  availableModels = [],
  availableLoras = [],
  currentModel = ''
}: PromptCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(prompt.name);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(e.target.value);
  };

  const saveNameChange = () => {
    if (nameValue.trim()) {
      onPromptUpdate({
        ...prompt,
        name: nameValue
      });
      setIsEditingName(false);
    }
  };

  const cancelNameEdit = () => {
    setNameValue(prompt.name);
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveNameChange();
    } else if (e.key === 'Escape') {
      cancelNameEdit();
    }
  };

  return (
    <Card className="overflow-hidden">
      <Accordion
        type="single"
        collapsible
        className="w-full"
        value={isEditing ? prompt.id : undefined}
      >
        <AccordionItem value={prompt.id} className="border-none">
          <div className="px-3 py-2 flex items-center justify-between border-b">
            <div className="flex-1 truncate flex items-center">
              {isEditingName ? (
                <div className="flex items-center flex-1">
                  <Input
                    value={nameValue}
                    onChange={handleNameChange}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="h-7 text-sm py-0"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={saveNameChange}
                    className="h-6 w-6 ml-1"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={cancelNameEdit}
                    className="h-6 w-6"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <AccordionTrigger className="hover:no-underline py-0 flex">
                  <h3
                    className="text-sm font-medium truncate hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingName(true);
                    }}
                  >
                    {prompt.name}
                  </h3>
                </AccordionTrigger>
              )}
            </div>
            <div className="flex items-center space-x-1 ml-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRunPrompt(prompt);
                }}
                className="h-7 text-xs"
              >
                <Play className="mr-1 h-3 w-3" />
                Run
              </Button>
              <div className="text-xs bg-secondary text-secondary-foreground rounded px-1.5 py-0.5">
                {prompt.runCount}×
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(prompt.id, 'up');
                }}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(prompt.id, 'down');
                }}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="px-3 py-2 border-b">
            {prompt.tags && prompt.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {prompt.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs px-1 py-0 h-5">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No tags</div>
            )}
          </div>

          <AccordionContent className="pt-0">
            <div className="p-4">
              <PromptForm
                prompt={prompt}
                onSubmit={onPromptUpdate}
                onCancel={onEditToggle}
                availableSamplers={availableSamplers}
                availableModels={availableModels}
                availableLoras={availableLoras}
                currentModel={currentModel}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}