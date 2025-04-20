import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle, Play, CheckCircle, AlertCircle, StopCircle } from 'lucide-react';
import { ExecutionStatus, Prompt } from '@/types';
import { PromptCard } from './PromptCard';
import { useApi } from '@/contexts/SdContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateUUID } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { usePrompt } from '@/contexts/PromptContext';
import { toast } from 'sonner';


export function PromptsManager() {
  const { isConnected, generateImage, availableSamplers, availableModels, availableLoras, isLoadingApiData } = useApi();
  const { prompts, loadPrompts, addPrompt, updatePrompt, deletePrompt, reorderPrompt, isLoading: isPromptLoading } = usePrompt();

  const [status, setStatus] = useState<ExecutionStatus>('idle');

  const [executingPromptId, setExecutingPromptId] = useState<string | null>(null);
  const [executedPromptIds, setExecutedPromptIds] = useState<Set<string>>(new Set());
  const [executionError, setExecutionError] = useState<string | null>(null);

  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [promptsToRunCount, setPromptsToRunCount] = useState(0);

  const cancelExecutionRef = useRef(false);
  const [isCancelling, setIsCancelling] = useState(false);

  //Load prompts again if they might have been updated elsewhere
  useEffect(() => {
    loadPrompts();
  }, []);

  //Handle interruption of execution
  const handleInterruptExecution = () => {
    setIsCancelling(true);
    cancelExecutionRef.current = true;
  };

  //Handle execution of a single prompt
  const handleExecutePrompt = async (promptToExecute: Prompt) => {
    setStatus('single-execution');
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
      setExecutionError(`Error during execution: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('failed');
      toast("Execution failed ", {
        description: err instanceof Error ? err.message : String(err)
      });
    }

    resetExecution();
  };

  //Handle execution of all prompts
  const handleExecuteAll = async () => {
    setStatus('global-execution');
    setSuccessCount(0);
    setFailureCount(0);
    setCurrentPromptIndex(0);
    setExecutedPromptIds(new Set());

    //Calculate total runs across all prompts
    const totalRuns = prompts.map(p => p.runCount).reduce((a, b) => a + b, 0);
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
      setExecutionError(`Error during execution: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('failed');
      toast("Execution failed ", {
        description: err instanceof Error ? err.message : String(err)
      });
    }

    if (status !== 'failed') {
      setStatus('completed');
    }

    resetExecution();
  };

  const resetExecution = () => {
    //Reset all prompts to idle state
    prompts.forEach(async (p) => {
      if (p.currentRun > 0) {
        await updatePrompt({
          ...p,
          currentRun: 0,
          status: 'idle'
        });
      }
    });

    //Clear execution state
    setExecutingPromptId(null);
    setExecutedPromptIds(new Set());
    setIsCancelling(false);
    cancelExecutionRef.current = false;
  }

  const executePrompt = async (prompt: Prompt): Promise<void> => {
    setExecutingPromptId(prompt.id);

    let currentPromptObj = { ...prompt, currentRun: 0 };
    for (let i = 0; i < prompt.runCount; i++) {
      //Check if execution has been cancelled
      if (cancelExecutionRef.current) {
        console.log(`Execution cancelled for prompt ${prompt.id}`);
        break;
      }

      try {
        const result = await generateImage(prompt);

        if (result) { setSuccessCount(prev => prev + 1); }
        else { setFailureCount(prev => prev + 1); }
        setCurrentPromptIndex(prev => prev + 1);
      } catch (err) {
        console.error(`Error running prompt ${prompt.id} (${currentPromptObj.currentRun}/${prompt.runCount}):`, err);
        setFailureCount(prev => prev + 1);
      }

      //Update prompt current run count
      currentPromptObj.currentRun = i + 1;
      await updatePrompt({
        ...currentPromptObj
      });
    }

    setExecutingPromptId(null);
    return;
  };

  const handleAddPrompt = async () => {
    const newPrompt: Prompt = {
      id: generateUUID(),
      isOpen: true,
      name: 'New Prompt',
      text: '',
      negativePrompt: '',
      seed: -1,
      steps: 20,
      sampler: availableSamplers.length > 0 ? availableSamplers[0] : 'Euler a',
      model: availableModels.length > 0 ? availableModels[0] : '',
      width: 512,
      height: 512,
      runCount: 1,
      tags: [],
      loras: [],
      currentRun: 0,
      status: 'idle',
    };

    await addPrompt(newPrompt);
  };

  return (
    <div>
      {(status === 'single-execution' || status === 'global-execution') && promptsToRunCount > 0 && (
        <div className="flex mb-4 align-center">
          <div className='text-nowrap'>Execution progress :</div>
          <Progress className='h-1 m-auto mx-5' value={(currentPromptIndex / promptsToRunCount) * 100}></Progress>
          <div className="flex justify-between text-sm font-medium mb-1 text-nowrap">
            <span>{currentPromptIndex} of {promptsToRunCount} ({Math.round((currentPromptIndex / promptsToRunCount) * 100)}%)</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Prompt List</h2>
        <div className="flex gap-2">
          {status === 'global-execution' ? (
            <Button
              onClick={handleInterruptExecution}
              variant="destructive"
              disabled={isCancelling}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              {isCancelling ? 'Stopping...' : 'Stop Execution'}
            </Button>
          ) : (
            <Button
              onClick={handleExecuteAll}
              disabled={status === 'single-execution' || !isConnected || prompts.length === 0 || isPromptLoading}>
              <Play className="mr-2 h-4 w-4" />
              Start Execution
            </Button>
          )}
          <Button
            onClick={handleAddPrompt}
            disabled={isPromptLoading || status === 'single-execution' || status === 'global-execution'}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Prompt
          </Button>
        </div>
      </div>

      {(isLoadingApiData || isPromptLoading) && (
        <Card className="p-4 mb-4">
          <div className="text-center text-muted-foreground">
            {isLoadingApiData ? 'Loading data from API...' : 'Loading prompts...'}
          </div>
        </Card>
      )}

      {executionError && status !== 'failed' && (
        <Alert className="mb-4 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {executionError}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {prompts.map((prompt) => (
          <PromptCard
            key={prompt.id}
            prompt={prompt}
            onDelete={() => deletePrompt(prompt.id)}
            onMove={reorderPrompt}
            onRunPrompt={handleExecutePrompt}
            onCancelExecution={handleInterruptExecution}
            onPromptUpdate={updatePrompt}
            isExecuted={executedPromptIds.has(prompt.id)}
            isExecuting={status === 'global-execution' || status === 'single-execution'}
            isCurrentlyExecuting={executingPromptId === prompt.id}
            isApiConnected={isConnected}
            availableSamplers={availableSamplers}
            availableModels={availableModels}
            availableLoras={availableLoras}
          />
        ))}
      </div>

      {prompts.length === 0 && !isLoadingApiData && !isPromptLoading && (
        <Card className="p-6 text-center text-muted-foreground">
          <p>No prompts added yet. Click "Add Prompt" to get started.</p>
        </Card>
      )}
    </div>
  );
}