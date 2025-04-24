import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { ExecutionStatus, Prompt, PromptEditor } from '@/types';
import { PromptCard } from './PromptCard';
import { useApi } from '@/contexts/contextSD';
import { generateUUID, randomBetween, randomIntBetween } from '@/lib/utils';
import { usePrompt } from '@/contexts/contextPrompts';
import { toast } from 'sonner';
import { ExecutionPanel } from './ExecutionPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { DEBOUNCE_DELAY, DEFAULT_PROMPT_CFG_SCALE, DEFAULT_PROMPT_HEIGHT, DEFAULT_PROMPT_NAME, DEFAULT_PROMPT_STEP, DEFAULT_PROMPT_WIDTH, RANDOM_LORAS_MAX_COUNT } from '@/lib/constants';

export function PromptsManager() {
  const { isConnected, generateImage, availableSamplers, availableModels, availableLoras } = useApi();
  const { prompts, loadPrompts, addPrompt, updatePrompt, deletePrompt, reorderPrompt, isLoading: isPromptLoading } = usePrompt();

  const [status, setStatus] = useState<ExecutionStatus>('idle');

  const [executingPromptId, setExecutingPromptId] = useState<string | null>(null);
  const [executedPromptIds, setExecutedPromptIds] = useState<Set<string>>(new Set());

  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [promptsToRunCount, setPromptsToRunCount] = useState(0);

  const cancelExecutionRef = useRef(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const [showTags, setShowTags] = useState(false);
  const [showModels, setShowModels] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  //Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  //Handle prompt update with debounce
  const handlePromptUpdate = (updatedPrompt: PromptEditor) => {
    //Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    //Set timeout for debounced update
    updateTimeoutRef.current = setTimeout(() => {
      updatePrompt(updatedPrompt);
    }, DEBOUNCE_DELAY);
  };

  //Handle interruption of execution
  const handleInterruptExecution = () => {
    setIsCancelling(true);
    cancelExecutionRef.current = true;
  };

  //Handle execution of a single prompt
  const handleExecutePrompt = async (promptToExecute: PromptEditor) => {
    setStatus('execution');
    setSuccessCount(0);
    setFailureCount(0);
    setCurrentPromptIndex(0);
    setPromptsToRunCount(promptToExecute.runCount);

    //Reset cancellation flag
    cancelExecutionRef.current = false;
    setIsCancelling(false);

    try {
      await executePrompt(promptToExecute);
      setStatus('completed');
    } catch (err) {
      console.error('Error during prompt execution:', err);
      toast("Execution failed ", {
        description: err instanceof Error ? err.message : String(err)
      });
    }

    //Use await to ensure we wait for resetExecution to complete
    await resetExecution();
  };

  //Handle execution of all prompts
  const handleExecuteAll = async () => {
    setStatus('execution');
    setSuccessCount(0);
    setFailureCount(0);
    setCurrentPromptIndex(0);
    setExecutedPromptIds(new Set());

    //Calculate total runs across all prompts
    const totalModels = prompts.map(p => p.models.length).reduce((a, b) => a + b, 0);
    const totalRuns = prompts.map(p => p.runCount).reduce((a, b) => a + b, 0) * totalModels;
    setPromptsToRunCount(totalRuns);

    //Reset cancellation flag
    cancelExecutionRef.current = false;
    setIsCancelling(false);

    try {
      for (let i = 0; i < prompts.length; i++) {
        if (cancelExecutionRef.current) {
          break;
        }

        const prompt = prompts[i];
        setExecutedPromptIds(prev => new Set([...prev, prompt.id]));
        await executePrompt(prompt);
      }
    } catch (err) {
      console.error('Error during batch execution:', err);
      toast("Execution failed ", {
        description: err instanceof Error ? err.message : String(err)
      });
    }

    setStatus('completed');

    await resetExecution();
  };

  const resetExecution = async () => {
    //Reset all prompts to idle state in a sequential manner
    const promptsToReset = prompts.filter(p => p.currentRun > 0);
    for (const p of promptsToReset) {
      await updatePrompt({ ...p, currentRun: 0, status: 'idle' });
    }

    //Clear execution state
    setExecutingPromptId(null);
    setExecutedPromptIds(new Set());
    setIsCancelling(false);
    cancelExecutionRef.current = false;

    //Reset counters
    setCurrentPromptIndex(0);
    setPromptsToRunCount(0);
  }

  const executePrompt = async (prompt: PromptEditor): Promise<void> => {
    setExecutingPromptId(prompt.id);

    for (let k = 0; k < prompt.models.length; k++) {
      const model = prompt.models[k];

      const promptData: Prompt = {
        name: prompt.name,
        text: prompt.text,
        negativePrompt: prompt.negativePrompt,
        cfgScale: prompt.cfgScale,
        seed: prompt.seed,
        steps: prompt.steps,
        sampler: prompt.sampler,
        model: model,
        loras: (() => {
          if (prompt.lorasRandom) {
            const lorasNumber = randomIntBetween(1, RANDOM_LORAS_MAX_COUNT);
            const shuffled = [...availableLoras].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, lorasNumber).map(lora => { return { name: lora.name, weight: randomBetween(-2, 2) } });
          } else {
            return prompt.loras.map(lora => {
              return {
                name: lora.name,
                weight: lora.random ? randomBetween(-2, 2) : lora.weight
              }
            })
          }
        })(),
        width: prompt.width,
        height: prompt.height,
        tags: prompt.tags
      }

      for (let i = 0; i < prompt.runCount; i++) {
        //Check if execution has been cancelled
        if (cancelExecutionRef.current) {
          console.log(`Execution cancelled for prompt ${prompt.id}`);
          break;
        }

        try {
          const result = await generateImage(promptData);

          if (result) { setSuccessCount(prev => prev + 1); }
          else { setFailureCount(prev => prev + 1); }
          setCurrentPromptIndex(prev => prev + 1);
        } catch (err) {
          console.error(`Error running prompt ${prompt.id} (${prompt.currentRun}/${prompt.runCount}):`, err);
          setFailureCount(prev => prev + 1);
        }

        prompt.currentRun = i + 1;
        await updatePrompt({
          ...prompt
        });
      }

    }




    setExecutingPromptId(null);
    return;
  };

  const handleAddPrompt = async () => {
    const newPrompt: PromptEditor = {
      id: generateUUID(),
      isOpen: true,
      name: DEFAULT_PROMPT_NAME,
      text: '',
      negativePrompt: '',
      cfgScale: DEFAULT_PROMPT_CFG_SCALE,
      seed: -1,
      steps: DEFAULT_PROMPT_STEP,
      sampler: availableSamplers.length > 0 ? availableSamplers[0] : '',
      models: availableModels.length > 0 ? [availableModels[0]] : [],
      width: DEFAULT_PROMPT_HEIGHT,
      height: DEFAULT_PROMPT_WIDTH,
      lorasRandom: false,
      runCount: 1,
      tags: [],
      loras: [],
      currentRun: 0,
      status: 'idle',
    };

    await addPrompt(newPrompt);
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-8rem)]">
      {/* Main Content - Left Side */}
      <ResizablePanel defaultSize={75} minSize={30}>
        <div className="h-full flex flex-col p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 z-1">
            <h2 className="text-xl font-semibold">Prompt List</h2>

            <div className="flex gap-2">
              <Button variant={'outline'} onClick={() => setShowTags(!showTags)} ><span className={`${showTags ? 'text-white' : 'text-gray-500'}`}>Tags</span></Button>
              <Button variant={'outline'} onClick={() => setShowModels(!showModels)}><span className={`${showModels ? 'text-white' : 'text-gray-500'}`}>Models</span></Button>
              <Button
                onClick={handleAddPrompt}
                disabled={isPromptLoading || status === 'execution'}>
                <PlusCircle />Add Prompt</Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto space-y-3 z-1">
            {prompts.map((prompt, idx) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                index={idx + 1}
                showTags={showTags}
                showModels={showModels}
                onDelete={() => deletePrompt(prompt.id)}
                onMove={reorderPrompt}
                onRunPrompt={handleExecutePrompt}
                onCancelExecution={handleInterruptExecution}
                onPromptUpdate={handlePromptUpdate}
                isExecuted={executedPromptIds.has(prompt.id)}
                isExecuting={status === 'execution'}
                isCurrentlyExecuting={executingPromptId === prompt.id}
                isApiConnected={isConnected}
                availableSamplers={availableSamplers}
                availableModels={availableModels}
                availableLoras={availableLoras}
              />
            ))}

            {prompts.length === 0 && !isPromptLoading && (
              <Card className="p-6 text-center text-muted-foreground">
                <p>No prompts added yet. Click "Add Prompt" to get started.</p>
              </Card>
            )}
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      {/* Execution Panel - Right Side */}
      <ResizablePanel defaultSize={25} minSize={15}>
        <div className="h-full p-1">
          <ExecutionPanel
            prompts={prompts}
            status={status}
            successCount={successCount}
            failureCount={failureCount}
            currentPromptIndex={currentPromptIndex}
            promptsToRunCount={promptsToRunCount}
            isApiConnected={isConnected}
            isCancelling={isCancelling}
            onStartExecution={handleExecuteAll}
            onCancelExecution={handleInterruptExecution}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}