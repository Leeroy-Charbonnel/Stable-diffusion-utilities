// src/components/PromptsManager.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { Prompt } from '@/types';
import { PromptForm } from './PromptForm';
import { PromptCard } from './PromptCard';
import { useApi } from '@/contexts/ApiContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion';

const STORAGE_KEY = 'sd-utilities-prompts';

type ExecutionStatus = 'idle' | 'executing' | 'completed' | 'failed';

//Helper function to save prompts to localStorage
const savePromptsToStorage = (prompts: Prompt[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
};

export function PromptsManager() {
  const api = useApi();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [newPromptName, setNewPromptName] = useState('New Prompt');
  const [newPromptData, setNewPromptData] = useState<Partial<Prompt>>({
    name: 'New Prompt',
    text: '',
    runCount: 1
  });

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

  // Load prompts from local storage on initial render
  useEffect(() => {
    const savedPrompts = localStorage.getItem(STORAGE_KEY);
    if (savedPrompts) {
      try {
        setPrompts(JSON.parse(savedPrompts));
      } catch (error) {
        console.error('Failed to parse saved prompts:', error);
      }
    }
  }, []);

  const handleAddPrompt = (prompt: Prompt) => {
    const updatedPrompts = [...prompts, prompt];
    setPrompts(updatedPrompts);
    // Immediately save to localStorage
    savePromptsToStorage(updatedPrompts);
    setIsAddingPrompt(false);
    // Reset the new prompt name for next time
    setNewPromptName('New Prompt');
    setNewPromptData({
      name: 'New Prompt',
      text: '',
      runCount: 1
    });
  };

  const handleUpdatePrompt = (updatedPrompt: Prompt) => {
    const updatedPrompts = prompts.map((p) =>
      (p.id === updatedPrompt.id ? updatedPrompt : p)
    );
    setPrompts(updatedPrompts);
    // Immediately save to localStorage
    savePromptsToStorage(updatedPrompts);
  };

  const handleDeletePrompt = (id: string) => {
    const updatedPrompts = prompts.filter((p) => p.id !== id);
    setPrompts(updatedPrompts);
    // Immediately save to localStorage
    savePromptsToStorage(updatedPrompts);
  };

  const handleMovePrompt = (id: string, direction: 'up' | 'down') => {
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
    // Immediately save to localStorage
    savePromptsToStorage(newPrompts);
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

  // Removed the handleCancelExecution function

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Prompt List</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleExecuteAll}
            disabled={!api.isConnected || prompts.length === 0 || status === 'executing'}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Execution
          </Button>
          <Button onClick={() => setIsAddingPrompt(!isAddingPrompt)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {isAddingPrompt ? 'Cancel' : 'Add Prompt'}
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

      {isLoading && (
        <Card className="p-4 mb-4">
          <div className="text-center text-muted-foreground">Loading data from API...</div>
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

      {isAddingPrompt && (
        <Card className="mb-4 overflow-hidden">
          <Accordion type="single" collapsible defaultValue="new-prompt">
            <AccordionItem value="new-prompt" className="border-none">
              <div className="px-3 py-2 flex items-center justify-between border-b">
                <input
                  type="text"
                  value={newPromptName}
                  onChange={(e) => {
                    setNewPromptName(e.target.value);
                    setNewPromptData(prev => ({ ...prev, name: e.target.value }));
                  }}
                  className="flex-1 text-sm font-medium bg-transparent border-none focus:outline-none"
                  placeholder="Enter prompt name"
                />
              </div>
              <AccordionContent>
                <div className="p-4">
                  <PromptForm
                    onSubmit={handleAddPrompt}
                    onCancel={() => setIsAddingPrompt(false)}
                    availableSamplers={samplers}
                    availableModels={models}
                    availableLoras={loras}
                    currentModel={currentModel}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
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
            isEditing={editingPromptId === prompt.id}
            onPromptUpdate={handleUpdatePrompt}
            isExecuting={status === 'executing' && executingPromptId === prompt.id}
            executionProgress={{
              currentRun: currentRun,
              totalRuns: totalRuns,
              currentProgress: currentProgress
            }}
            // Removed onCancelExecution prop
            availableSamplers={samplers}
            availableModels={models}
            availableLoras={loras}
            currentModel={currentModel}
          />
        ))}
      </div>

      {prompts.length === 0 && !isAddingPrompt && !isLoading && (
        <Card className="p-6 text-center text-muted-foreground">
          <p>No prompts added yet. Click "Add Prompt" to get started.</p>
        </Card>
      )}
    </div>
  );
}