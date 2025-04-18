import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Check, X, Play, ChevronDown, ChevronUp, StopCircle } from 'lucide-react';
import { Prompt } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { PromptForm } from './PromptForm';

type PromptCardProps = {
  prompt: Prompt;
  onDelete: () => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onPromptUpdate: (updatedPrompt: Prompt) => void;
  onRunPrompt: (prompt: Prompt) => void;
  onCancelExecution?: () => void;
  isExecuted?: boolean;
  isExecuting?: boolean;
  isCurrentlyExecuting?: boolean;
  isApiConnected?: boolean;
  executionProgress?: {
    currentRun: number;
    totalRuns: number;
    currentProgress: number;
  };

  availableSamplers?: string[];
  availableModels?: string[];
  availableLoras?: any[];
};

export function PromptCard({
  prompt,
  onDelete,
  onMove,
  onPromptUpdate,
  onRunPrompt,
  onCancelExecution,
  isExecuted = false,
  isExecuting = false,
  isCurrentlyExecuting = false,
  isApiConnected = false,
  availableSamplers = [],
  availableModels = [],
  availableLoras = []
}: PromptCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(prompt.name);
  const [isAccordionOpen, setIsAccordionOpen] = useState(prompt.isOpen);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(e.target.value);
  };

  const saveNameChange = () => {
    if (nameValue.trim()) {
      onPromptUpdate({ ...prompt, name: nameValue });
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

  const handleOpenAccordion = () => {
    setIsAccordionOpen(!isAccordionOpen);
    onPromptUpdate({ ...prompt, isOpen: !isAccordionOpen });
  };

  const currentProgress = (prompt.currentRun / prompt.runCount) * 100

  return (
    <Card className={`overflow-hidden p-0`}>
      <Accordion
        type="single"
        collapsible
        defaultValue={isAccordionOpen ? prompt.id : undefined}
        className="w-full"
        onValueChange={handleOpenAccordion}
      >
        <AccordionItem value={prompt.id} className="border-none">
          <div className="px-3 py-2 flex items-center justify-between border-b">
            <div className="flex-1 truncate flex items-center">
              <AccordionTrigger disabled={isExecuting} className="hover:no-underline py-0 mr-2 flex"></AccordionTrigger>

              {isExecuting && (<h3 className="text-sm font-medium truncate">{prompt.name}</h3>)}

              {!isExecuting && (
                isEditingName ? (
                  <div className="flex items-center flex-1">
                    <Input value={nameValue} onChange={handleNameChange} onKeyDown={handleKeyDown} autoFocus className="h-7 text-sm py-0" />
                    <Button size="icon" variant="ghost" onClick={saveNameChange} className="h-6 w-6 ml-1 p-3.5"><Check />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelNameEdit} className="h-6 w-6 p-3.5"> <X />
                    </Button>
                  </div>
                ) : (
                  <h3 className="text-sm font-medium truncate hover:underline cursor-pointer" onClick={() => { setIsEditingName(true); }}>
                    {prompt.name}
                  </h3>
                ))}
            </div>
            <div className="flex items-center space-x-1 ml-2">
              {isCurrentlyExecuting && onCancelExecution ? (
                <Button variant="destructive" size="sm" onClick={onCancelExecution} className="h-7 text-xs">
                  <StopCircle className="mr-1 h-3 w-3" />
                  Stop
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { onRunPrompt(prompt); }}
                  className="h-7 text-xs"
                  disabled={isExecuting || !isApiConnected}
                >
                  <Play className="mr-1 h-3 w-3" />
                  Run
                </Button>
              )}

              <div className="text-xs bg-secondary text-secondary-foreground rounded py-1.5 px-3">{prompt.runCount}×</div>

              <Button variant="ghost" size="icon" onClick={() => { onMove(prompt.id, 'up'); }}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                disabled={isExecuting}>
                <ChevronUp />
              </Button>

              <Button variant="ghost" size="icon" onClick={() => { onMove(prompt.id, 'down'); }}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                disabled={isExecuting}>
                <ChevronDown />
              </Button>

              <Button variant="ghost" size="icon" onClick={() => { onDelete(); }}
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                disabled={isExecuting}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {(isExecuted || isCurrentlyExecuting) && (
            <div className="px-3 py-2 space-y-2">
              <div className="w-full">
                <div className="flex items-center gap-2">
                  <Progress value={currentProgress} className="h-1 flex-1" />
                  <span className="text-xs">{prompt.currentRun}/{prompt.runCount}</span>
                </div>
              </div>
            </div>
          )}
          <AccordionContent className="pt-0">
            <div className="p-4">
              <PromptForm
                prompt={prompt}
                onPromptUpdate={onPromptUpdate}
                availableSamplers={availableSamplers}
                availableModels={availableModels}
                availableLoras={availableLoras}
              />
            </div>
          </AccordionContent>

          {!isAccordionOpen && prompt.tags && prompt.tags.length > 0 && (
            <div className={`px-3 ${isExecuting ? "pb-2" : "py-2"} border-b`}>
              <div className="flex flex-wrap gap-1">
                {prompt.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs px-1 py-0 h-5">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </AccordionItem>
      </Accordion>
    </Card>
  );
}