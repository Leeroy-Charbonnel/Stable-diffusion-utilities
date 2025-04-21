import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Check, X, Play, ChevronDown, ChevronUp, StopCircle } from 'lucide-react';
import { Prompt } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { PromptForm } from './PromptForm';
import { DEBOUNCE_DELAY } from '@/lib/constants';

type PromptCardProps = {
  prompt: Prompt;
  index: number;
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
  const [accordionValue, setAccordionValue] = useState<string | undefined>(
    prompt.isOpen ? prompt.id : undefined
  );
  const [localPrompt, setLocalPrompt] = useState<Prompt>(prompt);
  const nameUpdateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  //Effect to sync accordionValue with prompt.isOpen
  useEffect(() => {
    // We no longer disable accordion when executing, so we only check prompt.isOpen
    setAccordionValue(prompt.isOpen ? prompt.id : undefined);
  }, [prompt.id, prompt.isOpen]);

  //Fix for ensuring accordion is properly closed when prompt.isOpen is false
  useEffect(() => {
    if (!prompt.isOpen && accordionValue === prompt.id) {
      setAccordionValue(undefined);
    }
  }, [prompt.isOpen, accordionValue, prompt.id]);

  //Update local prompt when props change
  useEffect(() => {
    setLocalPrompt(prompt);
    setNameValue(prompt.name);
  }, [prompt]);

  //Cleanup on unmount
  useEffect(() => {
    return () => {
      if (nameUpdateTimeoutRef.current) {
        clearTimeout(nameUpdateTimeoutRef.current);
      }
    };
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(e.target.value);
  };

  const saveNameChange = () => {
    if (nameValue.trim()) {
      // Update local state immediately
      setLocalPrompt(prev => ({ ...prev, name: nameValue }));

      // Clear any pending updates
      if (nameUpdateTimeoutRef.current) {
        clearTimeout(nameUpdateTimeoutRef.current);
      }

      // Debounce the actual save
      nameUpdateTimeoutRef.current = setTimeout(() => {
        onPromptUpdate({ ...prompt, name: nameValue });
      }, DEBOUNCE_DELAY);

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

  const handleOpenAccordion = (value: string) => {
    const newIsOpen = value === prompt.id;
    //Update local state immediately for better user experience
    setAccordionValue(newIsOpen ? prompt.id : undefined);
    //Update parent state
    onPromptUpdate({ ...prompt, isOpen: newIsOpen });
  };

  const handlePromptUpdate = (updatedPrompt: Prompt) => {
    // Update local state immediately for responsive UI
    setLocalPrompt(updatedPrompt);

    // Pass the update to parent component (which will handle debouncing)
    onPromptUpdate(updatedPrompt);
  };

  const currentProgress = (localPrompt.currentRun / localPrompt.runCount) * 100;

  return (
    <Card className={`mx-auto my-2 overflow-hidden p-0 max-w-[950px]`}>
      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        className="w-full"
        onValueChange={handleOpenAccordion}
      >
        <AccordionItem value={localPrompt.id} className="border-none">
          <div className="px-3 py-2 flex items-center justify-between border-b">
            <div className="flex-1 truncate flex items-center">
              <div className="flex items-center mr-1">
                <span className="text-xs font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{index}</span>
              </div>
              <AccordionTrigger className="hover:no-underline py-0 mr-2 flex"></AccordionTrigger>

              {isExecuting && (<h3 className="text-sm font-medium truncate">{localPrompt.name}</h3>)}

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
                    {localPrompt.name}
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
                  onClick={() => { onRunPrompt(localPrompt); }}
                  className="h-7 text-xs"
                  disabled={isExecuting || !isApiConnected}
                >
                  <Play className="mr-1 h-3 w-3" />
                  Run
                </Button>
              )}

              <div className="text-xs bg-secondary text-secondary-foreground rounded py-1.5 px-3">{localPrompt.runCount}×</div>

              <Button variant="ghost" size="icon" onClick={() => { onMove(localPrompt.id, 'up'); }}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                disabled={isExecuting}>
                <ChevronUp />
              </Button>

              <Button variant="ghost" size="icon" onClick={() => { onMove(localPrompt.id, 'down'); }}
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

          {!accordionValue && (
            <div className={`px-3 ${isExecuting ? "pb-2" : "py-2"} border-b`}>
              <div className="flex flex-wrap gap-1">
                {/* Model Badge - Primary */}
                {localPrompt.model && (
                  <Badge key="model" variant="default" className="text-xs px-1 py-0 h-5 truncate max-w-[150px]" title={localPrompt.model}>
                    {localPrompt.model}
                  </Badge>
                )}

                {/* LoRA Badges */}
                {localPrompt.loras && localPrompt.loras.map(lora => (
                  <Badge key={`lora-${lora.name}`} variant="outline" className="text-xs px-1 py-0 h-5 border-primary/50 text-primary-foreground truncate max-w-[120px]" title={lora.name}>
                    {lora.name}
                  </Badge>
                ))}

                {/* Regular Tag Badges */}
                {localPrompt.tags && localPrompt.tags.map(tag => (
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