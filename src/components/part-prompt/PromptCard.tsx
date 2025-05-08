import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Check, X, Play, ChevronDown, ChevronUp, SkipForward, StopCircle } from 'lucide-react';
import { LabelItem, PromptEditor } from '@/types';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { PromptForm } from './PromptForm';
import { Separator } from '@/components/ui/separator';
import { NumberInput } from '../ui/number-input';
import { getModelLabel } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../ui/context-menu';
import { EmbeddingsEditor } from './EmbeddingsEditor';

interface PromptCardProps {
  prompt: PromptEditor;
  index: number;

  showTags: boolean;
  showModels: boolean;

  onRunPrompt: (prompt: PromptEditor) => void;
  onSkipExecution: () => void;
  onInterruptGeneration: () => void; // Add this new handler
  onDuplicatePrompt: () => void;
  onCopyRefresh: () => void;

  onDelete: () => void;
  onMove: (promptId: string, direction: 'up' | 'down') => Promise<boolean>;
  onPromptUpdate: (prompt: PromptEditor) => void;

  isCancelling: boolean;
  isSkipping: boolean;

  isExecuted: boolean;
  isExecuting: boolean;
  isCurrentlyExecuting: boolean;
  executingModel: string | null;

  isApiConnected: boolean;
  availableSamplers: string[];
  availableModels: LabelItem[];
  availableLoras: LabelItem[];
  availableEmbeddings: LabelItem[];
}

export function PromptCard({
  prompt,
  index,
  showTags,
  showModels,
  executingModel,
  onDelete,
  onMove,
  onPromptUpdate,
  onRunPrompt,
  onSkipExecution,
  onDuplicatePrompt,
  onInterruptGeneration,
  onCopyRefresh,
  isExecuted = false,
  isExecuting = false,
  isCancelling = false,
  isSkipping = false,
  isCurrentlyExecuting = false,
  isApiConnected = false,
  availableSamplers = [],
  availableModels = [],
  availableLoras = [],
  availableEmbeddings = [],
}: PromptCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(prompt.name);

  useEffect(() => {
    setNameValue(prompt.name);
  }, [prompt]);


  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(e.target.value);
  };

  const handlePromptPartUpdate = (name: string, value: any) => {
    let newValue = value as any;
    if (name == "RunCount") { newValue = parseInt(newValue); }
    handlePromptUpdate({ ...prompt, [name]: newValue });
  }

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

  const handlePromptUpdate = (updatedPrompt: PromptEditor) => {
    onPromptUpdate(updatedPrompt);
  };

  const handleAccordionChange = () => {
    handlePromptUpdate({ ...prompt, isOpen: !prompt.isOpen })
  }

  const currentProgress = (prompt.currentRun / prompt.runCount) * 100;

  return (
    <Card className="rounded-none p-0 gap-0 w-full">
      <Accordion type="single" collapsible value='true' className="w-full">
        <AccordionItem value={prompt.isOpen.toString()} className="border-none">
          <ContextMenu>
            <ContextMenuTrigger>

              <div className={`px-4 py-2 flex items-center justify-between`}>
                <div className="flex-1 truncate flex items-center">

                  <AccordionTrigger className="hover:no-underline py-0 mr-2 flex" onClick={handleAccordionChange}></AccordionTrigger>
                  <span className="text-xs font-medium bg-input/30 h-6 w-6 p-3.5 flex items-center justify-center mr-2">{index}</span>
                  {isExecuting && (<h3 className="text-sm font-medium truncate">{prompt.name}</h3>)}

                  {!isExecuting && (
                    isEditingName ? (
                      <div className="flex items-center flex-1">
                        <Input value={nameValue} onChange={handleNameChange} onKeyDown={handleKeyDown} autoFocus className="h-7 text-sm" />
                        <Button size="icon" variant="outline" onClick={saveNameChange} className="h-6 w-6 mx-1 p-3.5 border-0"><Check /></Button>
                        <Button size="icon" variant="outline" onClick={cancelNameEdit} className="h-6 w-6 p-3.5 border-0"> <X /></Button>
                      </div>
                    ) : (
                      <h3 className="text-sm font-medium truncate hover:underline cursor-pointer" onClick={() => { setIsEditingName(true); }}>
                        {prompt.name}
                      </h3>
                    ))}
                </div>
                <div className="flex items-center space-x-2 ml-2">

                  {isCurrentlyExecuting && (
                    <Button
                      onClick={onInterruptGeneration} variant="destructive" size="sm" className="h-6 p-3.5 text-xs border-0 aspect-square"
                      disabled={isCancelling || isSkipping}
                    >
                      <StopCircle className="h-3 w-3" />
                    </Button>
                  )}

                  {!isExecuting && (

                    <Button
                      variant="outline" size="sm" onClick={() => { onRunPrompt(prompt); }} className="h-6 p-3.5 text-xs border-0" disabled={isExecuting || !isApiConnected}>
                      <Play className="mr-1 h-3 w-3" />Run</Button>
                  )}

                  {isCurrentlyExecuting && (
                    <Button variant="destructive" size="sm" onClick={onSkipExecution} disabled={isCancelling || isSkipping} className="h-6 p-3.5 text-xs border-0">
                      <SkipForward className="mr-1 h-3 w-3" />{isSkipping ? "Skipping..." : "Skip"}</Button>
                  )}


                  <div className="text-xs font-medium bg-input/30 h-7 px-2 flex items-center justify-center">

                    <NumberInput
                      value={prompt.runCount} min={0} max={99}
                      onChange={(value: number) => handlePromptPartUpdate("runCount", value)}
                      className="h-full !bg-transparent border-0 max-w-6 text-right flex items-center justify-center px-0 mx-0 pr-2" disabled={isExecuting}
                    />
                    <div>×</div>
                  </div>

                  <Button variant="ghost" size="icon" onClick={() => { onMove(prompt.id, 'up'); }}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/10" disabled={isExecuting}>
                    <ChevronUp />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => { onMove(prompt.id, 'down'); }}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/10" disabled={isExecuting}>
                    <ChevronDown />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => { onDelete(); }}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" disabled={isExecuting}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>


              {(isExecuted || isCurrentlyExecuting) && (
                <div className="px-4 py-3 space-y-2">
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <Progress value={currentProgress} className="h-1 flex-1" />
                      <span className="text-xs">{prompt.currentRun}/{prompt.runCount}</span>
                    </div>
                  </div>
                </div>
              )}

            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={onDuplicatePrompt}>Duplicate prompt</ContextMenuItem>
              <ContextMenuItem variant='destructive' onClick={onDelete}>Delete prompt</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          <AccordionContent className="pt-0">
            <div className="px-0">
              <PromptForm
                key={`${prompt.id}-form`}
                prompt={prompt}
                onPromptUpdate={handlePromptUpdate}
                onCopyRefresh={onCopyRefresh}
                availableSamplers={availableSamplers}
                availableModels={availableModels}
                availableLoras={availableLoras}
                availableEmbeddings={availableEmbeddings}
                readOnly={isExecuting || isCurrentlyExecuting}
              />
            </div>
          </AccordionContent>

        </AccordionItem>
      </Accordion>

      {
        !prompt.isOpen && (showModels || showTags) && (
          <div className={`p-2 pt-0`}>
            <Separator className='mb-2'></Separator>
            <div className="flex flex-wrap gap-1.5">
              {/*Model Badge - Primary*/}
              {showModels && prompt.models && prompt.models.map(model => (
                <div key={`${prompt.id}-${model}`} className={`flex items-center px-2 py-0.5 h-5 bg-primary/30 ${isCurrentlyExecuting && model === executingModel ? 'animate-pulse' : ''}`}>
                  <div className="text-xs max-w-[100px] truncate">
                    {getModelLabel(availableModels, model)}
                  </div>
                </div>
              ))}
              {/*LoRA Badges*/}
              {showModels && prompt.lorasRandom && (
                <div key='random-lora' className="flex items-center px-2 py-0.5 h-5 border-primary border-1">
                  <div className="text-xs max-w-[100px] truncate text-primary">Random</div>
                </div>
              )}

              {showModels && !prompt.lorasRandom && prompt.loras && showModels && prompt.loras.map(lora => (
                <div key={`${prompt.id}-${lora.name}`} className="flex items-center px-2 py-0.5 h-5 border-primary border-1" title={lora.name}>
                  <div className="text-xs max-w-[100px] truncate text-primary">
                    {getModelLabel(availableLoras, lora.name)}
                  </div>
                </div>
              ))}

              {/*Regular Tag Badges*/}
              {showTags && prompt.tags && prompt.tags.map(tag => (
                <div key={`${prompt.id}-${tag}`} className="flex items-center px-2 py-0.5 h-5 bg-input/30">
                  <div className="text-xs">
                    {tag}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }
    </Card >
  );
}