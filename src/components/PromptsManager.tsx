import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { Prompt } from '@/types';
import { PromptCard } from './PromptCard';
import { useApi } from '@/contexts/ApiContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateUUID } from '@/lib/utils';
import { getAllPrompts, saveAllPrompts } from '@/lib/promptsApi';

type ExecutionStatus = 'idle' | 'executing' | 'completed' | 'failed';

export function PromptsManager() {
  const api = useApi();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [savingPrompts, setSavingPrompts] = useState(false);

  // Execution state
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [executingPromptId, setExecutingPromptId] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentRun, setCurrentRun] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);

  // State for API data
  const [samplers, setSamplers] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loras, setLoras] = useState<any[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  //Save prompts to the server
  const savePromptsToServer = async (promptsToSave: Prompt[]) => {
    try {
      setSavingPrompts(true);
      const success = await saveAllPrompts(promptsToSave);
      if (!success) {
        console.error('Failed to save prompts to server');
        setError('Failed to save prompts to server');
      }
    } catch (error) {
      console.error('Error saving prompts:', error);
      setError(`Error saving prompts: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSavingPrompts(false);
    }
  };

  // Fetch API data only once on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Test API connection first
        const connected = await api.checkConnection();

        if (connected) {
          // Fetch all required data in parallel
          const [samplersData, modelsData, currentModelData, lorasData] = await Promise.all([
            api.api.getSamplers(),
            api.api.getModels(),
            api.api.getCurrentModel(),
            api.api.getLoras()
          ]);

          setSamplers(samplersData);
          setModels(modelsData);
          if (currentModelData) setCurrentModel(currentModelData);
          setLoras(lorasData);
        }
      } catch (error) {
        console.error("Error fetching API data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch once when component mounts
    fetchData();
  }, []); // Empty dependency array to prevent infinite loop

  // Load prompts from server on initial render
  useEffect(() => {
    const loadPromptsFromServer = async () => {
      setIsLoadingPrompts(true);
      try {
        const loadedPrompts = await getAllPrompts();
        setPrompts(loadedPrompts);
      } catch (error) {
        console.error('Failed to load prompts from server:', error);
        setError(`Failed to load prompts: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoadingPrompts(false);
      }
    };

    loadPromptsFromServer();
  }, []);

  const handleAddPrompt = async () => {
    // Create a new prompt with default values
    const newPrompt: Prompt = {
      id: generateUUID(),
      name: 'New Prompt',
      text: '',
      negativePrompt: '',
      seed: undefined,
      steps: 20,
      sampler: 'Euler a',
      model: currentModel,
      width: 512,
      height: 512,
      runCount: 1,
      tags: [],
      loras: []
    };

    // Add it to the prompts array
    const updatedPrompts = [...prompts, newPrompt];
    setPrompts(updatedPrompts);

    // Save to server
    await savePromptsToServer(updatedPrompts);

    // Set it as the currently editing prompt
    setEditingPromptId(newPrompt.id);
  };

  const handleUpdatePrompt = async (updatedPrompt: Prompt) => {
    const updatedPrompts = prompts.map((p) =>
      (p.id === updatedPrompt.id ? updatedPrompt : p)
    );
    setPrompts(updatedPrompts);
    
    // Save to server
    await savePromptsToServer(updatedPrompts);
  };

  const handleDeletePrompt = async (id: string) => {
    const updatedPrompts = prompts.filter((p) => p.id !== id);
    setPrompts(updatedPrompts);
    
    // Save to server
    await savePromptsToServer(updatedPrompts);
  };

  const handleMovePrompt = async (id: string, direction: 'up' | 'down') => {
    const promptIndex = prompts.findIndex((p) => p.id === id);
    if (
      (direction === 'up' && promptIndex === 0) ||
      (direction === 'down' && promptIndex === prompts.length - 1)
    ) {
      return;
    }

    const newPrompts = [...prompts];
    const newIndex = direction === 'up' ? promptIndex - 1 : promptIndex + 1;
    const promptToMove = newPrompts[promptIndex];
    newPrompts.splice(promptIndex, 1);
    newPrompts.splice(newIndex, 0, promptToMove);

    setPrompts(newPrompts);
    
    // Save to server
    await savePromptsToServer(newPrompts);
  };

  const toggleEditPrompt = (id: string) => {
    setEditingPromptId(currentId => currentId === id ? null : id);
  };

  // Execution related functions
  //Execute a single prompt with the specified count
  const executePrompt = async (prompt: Prompt): Promise<number> => {
    let successfulRuns = 0;

    setExecutingPromptId(prompt.id);
    setCurrentRun(0);
    setTotalRuns(prompt.runCount);

    for (let i = 0; i < prompt.runCount; i++) {
      // Removed the cancellation check

      setCurrentRun(i + 1);
      setCurrentProgress(0);

      try {
        // Simulate progress updates during generation
        const progressUpdateInterval = setInterval(() => {
          setCurrentProgress(prev => {
            const newProgress = prev + 5; // Increment by 5%
            return newProgress >= 95 ? 95 : newProgress; // Cap at 95% until completion
          });
        }, 500);

        const result = await api.generateImage(prompt);

        clearInterval(progressUpdateInterval);
        setCurrentProgress(100);

        if (result) {
          successfulRuns++;
          setSuccessCount(prev => prev + 1);
        } else {
          setFailureCount(prev => prev + 1);
        }

        // Short delay to show 100% before moving to next image
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error running prompt ${prompt.id} (${i + 1}/${prompt.runCount}):`, err);
        setFailureCount(prev => prev + 1);
        setCurrentProgress(0);
      }
    }

    return successfulRuns;
  };

  //Handle execution of all prompts
  const handleExecuteAll = async () => {
    if (!api.isConnected) {
      setError("Not connected to API. Please check connection.");
      return;
    }

    if (prompts.length === 0) {
      setError("No prompts to execute. Please add prompts first.");
      return;
    }

    // Start execution
    setStatus('executing');
    setCurrentProgress(0);
    setCurrentRun(0);
    setSuccessCount(0);
    setFailureCount(0);
    setError(null);

    try {
      for (const prompt of prompts) {
        // Removed the cancellation check
        await executePrompt(prompt);
      }

      setStatus('completed');
      setExecutingPromptId(null);
    } catch (err) {
      console.error('Error during batch execution:', err);
      setError(`Error during execution: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('failed');
      setExecutingPromptId(null);
    }
  };

  // Handle execution of a single prompt
  const handleExecutePrompt = async (promptToExecute: Prompt) => {
    if (!api.isConnected) {
      setError("Not connected to API. Please check connection.");
      return;
    }

    // Set up execution for just this prompt
    setStatus('executing');
    setCurrentProgress(0);
    setCurrentRun(0);
    setSuccessCount(0);
    setFailureCount(0);
    setError(null);

    try {
      await executePrompt(promptToExecute);
      setStatus('completed');
      setExecutingPromptId(null);
    } catch (err) {
      console.error('Error during prompt execution:', err);
      setError(`Error during execution: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('failed');
      setExecutingPromptId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Prompt List</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleExecuteAll}
            disabled={!api.isConnected || prompts.length === 0 || status === 'executing' || isLoadingPrompts || savingPrompts}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Execution
          </Button>
          <Button onClick={handleAddPrompt} disabled={isLoadingPrompts || savingPrompts}>
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

      {savingPrompts && (
        <Card className="p-4 mb-4">
          <div className="text-center text-muted-foreground">Saving prompts...</div>
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

      {status === 'failed' && error && (
        <Alert className="mb-4 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Execution Failed</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {error && status !== 'failed' && (
        <Alert className="mb-4 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {prompts.map((prompt) => (
          <PromptCard
            key={prompt.id}
            prompt={prompt}
            onEditToggle={() => toggleEditPrompt(prompt.id)}
            onDelete={() => handleDeletePrompt(prompt.id)}
            onMove={handleMovePrompt}
            onRunPrompt={handleExecutePrompt}
            isOpen={editingPromptId === prompt.id}
            onPromptUpdate={handleUpdatePrompt}
            isExecuting={status === 'executing' && executingPromptId === prompt.id}
            executionProgress={{
              currentRun: currentRun,
              totalRuns: totalRuns,
              currentProgress: currentProgress
            }}
            availableSamplers={samplers}
            availableModels={models}
            availableLoras={loras}
            currentModel={currentModel}
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