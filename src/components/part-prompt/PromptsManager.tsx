import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { ExecutionStatus, Prompt } from '@/types';
import { PromptCard } from './PromptCard';
import { useApi } from '@/contexts/contextSD';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateUUID } from '@/lib/utils';
import { usePrompt } from '@/contexts/contextPrompts';
import { toast } from 'sonner';
import { ExecutionPanel } from './ExecutionPanel';

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
    <div className="flex gap-4">
      {/* Main Content - Left Side */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Prompt List</h2>
          <Button
            onClick={handleAddPrompt}
            disabled={isPromptLoading || status === 'single-execution' || status === 'global-execution'}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Prompt
          </Button>
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

      {/* Execution Panel - Right Side */}
      <div className="w-80 h-full">
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
    </div>
  );
}