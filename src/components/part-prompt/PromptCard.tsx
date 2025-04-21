import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Check, X, Play, ChevronDown, ChevronUp, StopCircle } from 'lucide-react';
import { Prompt } from '@/types';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { PromptForm } from './PromptForm';
// Removed DEBOUNCE_DELAY import

type PromptCardProps = {
  prompt: Prompt;
  index: number;

  showTags?: boolean;
  showModels?: boolean;

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
  index,
  showTags,
  showModels,
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
  const [localPrompt, setLocalPrompt] = useState<Prompt>(prompt);
  // Removed nameUpdateTimeoutRef

  //Update local prompt when props change
  useEffect(() => {
    setLocalPrompt(prompt);
    setNameValue(prompt.name);
  }, [prompt]);

  // Removed cleanup effect for timeout

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(e.target.value);
  };

  const saveNameChange = () => {
    if (nameValue.trim()) {
      //Update local state immediately
      setLocalPrompt(prev => ({ ...prev, name: nameValue }));

      //Direct update without debouncing
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

  const handlePromptUpdate = (updatedPrompt: Prompt) => {
    setLocalPrompt(updatedPrompt);
    onPromptUpdate(updatedPrompt);
  };

  const handleAccordionChange = () => {
    handlePromptUpdate({ ...localPrompt, isOpen: !localPrompt.isOpen })
  }

  const currentProgress = (localPrompt.currentRun / localPrompt.runCount) * 100;

  return (
    <Card className="overflow-hidden p-0 gap-0 max-w-[950px]">
      <Accordion type="single" collapsible value='true' className="w-full" onClick={handleAccordionChange}>
        <AccordionItem value={prompt.isOpen.toString()} className="border-none">
          <div className="px-4 py-2 flex items-center justify-between border-b">
            <div className="flex-1 truncate flex items-center">

              <AccordionTrigger className="hover:no-underline py-0 mr-2 flex"></AccordionTrigger>

              <span className="text-xs font-medium bg-input/30 h-6 w-6 p-3.5 flex items-center justify-center rounded-md mr-2">{index}</span>

              {isExecuting && (<h3 className="text-sm font-medium truncate">{localPrompt.name}</h3>)}

              {!isExecuting && (
                isEditingName ? (
                  <div className="flex items-center flex-1">
                    <Input value={nameValue} onChange={handleNameChange} onKeyDown={handleKeyDown} autoFocus className="h-7 text-sm" />
                    <Button size="icon" variant="outline" onClick={saveNameChange} className="h-6 w-6 mx-1 p-3.5 border-0"><Check /></Button>
                    <Button size="icon" variant="outline" onClick={cancelNameEdit} className="h-6 w-6 p-3.5 border-0"> <X /></Button>
                  </div>
                ) : (
                  <h3 className="text-sm font-medium truncate hover:underline cursor-pointer" onClick={() => { setIsEditingName(true); }}>
                    {localPrompt.name}
                  </h3>
                ))}
            </div>
            <div className="flex items-center space-x-2 ml-2">
              {isCurrentlyExecuting && onCancelExecution ? (
                <Button variant="destructive" size="sm" onClick={onCancelExecution} className="h-6 p-3.5 text-xs border-0">
                  <StopCircle className="mr-1 h-3 w-3" />Stop</Button>
              ) : (
                <Button
                  variant="outline" size="sm" onClick={() => { onRunPrompt(localPrompt); }} className="h-6 p-3.5 text-xs border-0" disabled={isExecuting || !isApiConnected}>
                  <Play className="mr-1 h-3 w-3" />Run</Button>
              )}

              <div className="text-xs font-medium bg-input/30 h-6 px-2 p-3.5 flex items-center justify-center rounded-md">{localPrompt.runCount}×</div>

              <Button variant="ghost" size="icon" onClick={() => { onMove(localPrompt.id, 'up'); }}
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full" disabled={isExecuting}>
                <ChevronUp />
              </Button>

              <Button variant="ghost" size="icon" onClick={() => { onMove(localPrompt.id, 'down'); }}
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full" disabled={isExecuting}>
                <ChevronDown />
              </Button>

              <Button variant="ghost" size="icon" onClick={() => { onDelete(); }}
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" disabled={isExecuting}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>


          {(isExecuted || isCurrentlyExecuting) && (
            <div className="px-4 py-3 space-y-2">
              <div className="w-full">
                <div className="flex items-center gap-2">
                  <Progress value={currentProgress} className="h-1 flex-1" />
                  <span className="text-xs">{localPrompt.currentRun}/{localPrompt.runCount}</span>
                </div>
              </div>
            </div>
          )}
          <AccordionContent className="pt-0">
            <div className="px-0">
              <PromptForm
                prompt={localPrompt}
                onPromptUpdate={handlePromptUpdate}
                availableSamplers={availableSamplers}
                availableModels={availableModels}
                availableLoras={availableLoras}
                readOnly={isExecuting || isCurrentlyExecuting}
              />
            </div>
          </AccordionContent>

        </AccordionItem>
      </Accordion>

      {!prompt.isOpen && (showModels || showTags) && (
        <div className={`p-2`}>
          <div className="flex flex-wrap gap-1.5">
            {/*Model Badge - Primary*/}
            {localPrompt.model && showModels && (
              <div key="model" className="flex items-center px-2 py-0.5 h-5 rounded-md bg-primary/30" title={localPrompt.model}>
                <div className="text-xs max-w-[100px] truncate">
                  {localPrompt.model}
                </div>
              </div>
            )}
            {/*LoRA Badges*/}
            {localPrompt.loras && showModels && localPrompt.loras.map(lora => (
              <div key={lora.name} className="flex items-center px-2 py-0.5 h-5 rounded-md border-primary border-1" title={lora.name}>
                <div className="text-xs max-w-[100px] truncate text-primary">
                  {lora.name}
                </div>
              </div>
            ))}

            {/*Regular Tag Badges*/}
            {localPrompt.tags && showTags && localPrompt.tags.map(tag => (
              <div key={tag} className="flex items-center px-2 py-0.5 h-5 rounded-md bg-input/30">
                <div className="text-xs">
                  {tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}