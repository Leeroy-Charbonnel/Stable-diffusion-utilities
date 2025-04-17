import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle, Play, CheckCircle, AlertCircle, StopCircle } from 'lucide-react';
import { ExecutionStatus, Prompt } from '@/types';
import { PromptCard } from './PromptCard';
import { useApi } from '@/contexts/ApiContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateUUID } from '@/lib/utils';
import { getAllPrompts, saveAllPrompts } from '@/lib/promptsApi';
import { Progress } from '@/components/ui/progress';


export function PromptsManager() {
  const api = useApi();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  const [status, setStatus] = useState<ExecutionStatus>('idle');

  const [executingPromptId, setExecutingPromptId] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executedPromptIds, setExecutedPromptIds] = useState<Set<string>>(new Set());

  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [promptsToRunCount, setPromptsToRunCount] = useState(0);

  const cancelExecutionRef = useRef(false);
  const [isCancelling, setIsCancelling] = useState(false);

  //Stable diffusion api data
  const [samplers, setSamplers] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loras, setLoras] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const savePromptsToServer = async (promptsToSave: Prompt[]) => {
    try {
      const success = await saveAllPrompts(promptsToSave);
      if (!success) {
        console.error('Failed to save prompts to server');
        setExecutionError('Failed to save prompts to server');
      }
    } catch (error) {
      console.error('Error saving prompts:', error);
      setExecutionError(`Error saving prompts: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  //Get stable diffusion api data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const connected = await api.checkConnection();

        if (connected) {
          const [samplersData, modelsData, lorasData] = await Promise.all([
            api.api.getSamplers(),
            api.api.getModels(),
            api.api.getLoras()
          ]);

          setSamplers(samplersData);
          setModels(modelsData);
          setLoras(lorasData);
        }
      } catch (error) {
        console.error("Error fetching API data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  //Load prompts from server
  useEffect(() => {
    const loadPromptsFromServer = async () => {
      setIsLoadingPrompts(true);
      try {
        const loadedPrompts = await getAllPrompts();
        setPrompts(loadedPrompts);
      } catch (error) {
        console.error('Failed to load prompts from server:', error);
        setExecutionError(`Failed to load prompts: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoadingPrompts(false);
      }
    };

    loadPromptsFromServer();
  }, []);

  const handleAddPrompt = async () => {
    const newPrompt: Prompt = {
      id: generateUUID(),
      isOpen: true,
      name: 'New Prompt',
      text: '',
      negativePrompt: '',
      seed: -1,
      steps: 20,
      sampler: 'Euler a',
      model: models[0],
      width: 512,
      height: 512,
      runCount: 1,
      tags: [],
      loras: [],
      currentRun: 0,
      stauts: 'idle',
    };

    const updatedPrompts = [...prompts, newPrompt];
    setPrompts(updatedPrompts);
    await savePromptsToServer(updatedPrompts);
  };

  const handleUpdatePrompt = async (updatedPrompt: Prompt) => {
    const updatedPrompts = prompts.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p));
    setPrompts(updatedPrompts);
    await savePromptsToServer(updatedPrompts);
  };

  const handleDeletePrompt = async (id: string) => {
    const updatedPrompts = prompts.filter((p) => p.id !== id);
    setPrompts(updatedPrompts);
    await savePromptsToServer(updatedPrompts);
  };

  const handleMovePrompt = async (id: string, direction: 'up' | 'down') => {
    const promptIndex = prompts.findIndex((p) => p.id === id);
    if (
      (direction === 'up' && promptIndex === 0) || (direction === 'down' && promptIndex === prompts.length - 1)
    ) { return; }

    const newPrompts = [...prompts];
    const newIndex = direction === 'up' ? promptIndex - 1 : promptIndex + 1;
    const promptToMove = newPrompts[promptIndex];
    newPrompts.splice(promptIndex, 1);
    newPrompts.splice(newIndex, 0, promptToMove);

    setPrompts(newPrompts);
    await savePromptsToServer(newPrompts);
  };

  //Handle interruption of execution
  const handleInterruptExecution = () => {
    setIsCancelling(true);
    cancelExecutionRef.current = true;
  };

  //Handle execution of a single prompt
  const handleExecutePrompt = async (promptToExecute: Prompt) => {
    setStatus('executing');
    setCurrentPromptIndex(0);
    setPromptsToRunCount(promptToExecute.runCount);

    // Reset cancellation flag
    cancelExecutionRef.current = false;
    setIsCancelling(false);

    try {
      await executePrompt(promptToExecute);

      if (cancelExecutionRef.current) {
        setStatus('idle');
      } else {
        setStatus('completed');
      }
    } catch (err) {
      console.error('Error during prompt execution:', err);
      setExecutionError(`Error during execution: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('failed');
    }

    resetExecution();
  };

  //Handle execution of all prompts
  const handleExecuteAll = async () => {
    setStatus('executing');
    setCurrentPromptIndex(0);
    setExecutedPromptIds(new Set());

    // Calculate total runs across all prompts
    const totalRuns = prompts.map(p => p.runCount).reduce((a, b) => a + b, 0);
    setPromptsToRunCount(totalRuns);

    // Reset cancellation flag
    cancelExecutionRef.current = false;
    setIsCancelling(false);

    try {
      for (let i = 0; i < prompts.length; i++) {
        if (cancelExecutionRef.current) {
          console.log("Execution cancelled");
          break;
        }

        const prompt = prompts[i];
        // Add prompt to executed set to show correct UI state
        setExecutedPromptIds(prev => new Set([...prev, prompt.id]));

        await executePrompt(prompt);
      }
    } catch (err) {
      console.error('Error during batch execution:', err);
      setExecutionError(`Error during execution: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('failed');
    }

    if (cancelExecutionRef.current) {
      setStatus('idle');
    } else if (status !== 'failed') {
      setStatus('completed');
    }

    resetExecution();
  };

  const resetExecution = () => {
    // Reset all prompts to idle state
    const resetPrompts = prompts.map(p => ({
      ...p,
      currentRun: 0,
      status: 'idle'
    }));
    setPrompts(resetPrompts);
    savePromptsToServer(resetPrompts);

    // Clear execution state
    setExecutingPromptId(null);
    setExecutedPromptIds(new Set());
    setIsCancelling(false);
    cancelExecutionRef.current = false;
  }

  const executePrompt = async (prompt: Prompt): Promise<void> => {
    setExecutingPromptId(prompt.id);

    prompt.currentRun = 0;
    for (let i = 0; i < prompt.runCount; i++) {
      // Check if execution has been cancelled
      if (cancelExecutionRef.current) {
        console.log(`Execution cancelled for prompt ${prompt.id}`);
        break;
      }

      try {
        const result = await api.generateImage(prompt);

        if (result) { setSuccessCount(prev => prev + 1); }
        else { setFailureCount(prev => prev + 1); }
        setCurrentPromptIndex(prev => prev + 1);
      } catch (err) {
        console.error(`Error running prompt ${prompt.id} (${prompt.currentRun}/${prompt.runCount}):`, err);
        setFailureCount(prev => prev + 1);
      }

      prompt.currentRun = i + 1;

      // Update prompt state in the list
      setPrompts(currentPrompts =>
        currentPrompts.map(p =>
          p.id === prompt.id ? { ...p, currentRun: i + 1 } : p
        )
      );
    }

    prompt.currentRun = prompt.runCount;

    setExecutingPromptId(null);
    return;
  };

  return (
    <div>
      {status === 'executing' && promptsToRunCount > 0 && (
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
          {status === 'executing' ? (
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
              disabled={!api.isConnected || prompts.length === 0 || status === 'executing' || isLoadingPrompts}
            >
              <Play className="mr-2 h-4 w-4" />
              Start Execution
            </Button>
          )}
          <Button onClick={handleAddPrompt} disabled={isLoadingPrompts}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Prompt
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      {api.isConnected ? (
        <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Connected</AlertTitle>
          <AlertDescription>
            Successfully connected to Stable Diffusion API.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-4 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>
            {api.error || "Not connected to the Stable Diffusion API. Check your connection settings."}
          </AlertDescription>
        </Alert>
      )}

      {(isLoading || isLoadingPrompts) && (
        <Card className="p-4 mb-4">
          <div className="text-center text-muted-foreground">
            {isLoading ? 'Loading data from API...' : 'Loading prompts...'}
          </div>
        </Card>
      )}


      {status === 'completed' && (
        <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Execution Completed</AlertTitle>
          <AlertDescription>
            Generated {successCount} images successfully. {failureCount} failed.
          </AlertDescription>
        </Alert>
      )}

      {status === 'failed' && executionError && (
        <Alert className="mb-4 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Execution Failed</AlertTitle>
          <AlertDescription>
            {executionError}
          </AlertDescription>
        </Alert>
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
            onDelete={() => handleDeletePrompt(prompt.id)}
            onMove={handleMovePrompt}
            onRunPrompt={handleExecutePrompt}
            onPromptUpdate={handleUpdatePrompt}
            isExecuting={
              (status === 'executing' && executingPromptId === prompt.id) ||
              (status === 'executing' && executedPromptIds.has(prompt.id))
            }
            isCurrentlyExecuting={status === 'executing' && executingPromptId === prompt.id}
            onCancelExecution={
              executingPromptId === prompt.id ? handleInterruptExecution : undefined
            }
            isApiConnected={api.isConnected}
            availableSamplers={samplers}
            availableModels={models}
            availableLoras={loras}
          />
        ))}
      </div>

      {prompts.length === 0 && !isLoading && !isLoadingPrompts && (
        <Card className="p-6 text-center text-muted-foreground">
          <p>No prompts added yet. Click "Add Prompt" to get started.</p>
        </Card>
      )}
    </div>
  );
}