import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { ExecutionStatus, ProgressData, Prompt, PromptEditor } from '@/types';
import { PromptCard } from './PromptCard';
import { useApi } from '@/contexts/contextSD';
import { generateUUID, randomBetween, randomIntBetween } from '@/lib/utils';
import { usePrompt } from '@/contexts/contextPrompts';
import { toast } from 'sonner';
import { ExecutionPanel } from './ExecutionPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { DEBOUNCE_DELAY, DEFAULT_PROMPT_CFG_SCALE, DEFAULT_PROMPT_HEIGHT, DEFAULT_PROMPT_NAME, DEFAULT_PROMPT_STEP, DEFAULT_PROMPT_WIDTH, RANDDOM_LORAS_MAX_COUNT, RANDOM_LORAS_MAX_WEIGHT, RANDOM_LORAS_MIN_WEIGHT, RESTART_TIMEOUT_MS, PROMPTS_BEFORE_RESTART } from '@/lib/constants';
import { SD_API_BASE_URL } from '@/lib/constants';
import { interruptGeneration, restartStableDiffusion } from '@/services/apiSD';

export function PromptsManager() {
  const { isConnected, checkConnection, generateImage, availableSamplers, availableModels, availableLoras, availableEmbeddings } = useApi();
  const { prompts, loadPrompts, addPrompt, updatePrompt, deletePrompt, reorderPrompt, isLoading: isPromptLoading } = usePrompt();
  const [refreshContextMenu, setRefreshContextMenu] = useState(false);

  const [status, setStatus] = useState<ExecutionStatus>('idle');

  const [executingPromptId, setExecutingPromptId] = useState<string | null>(null);
  const [executedPromptIds, setExecutedPromptIds] = useState<Set<string>>(new Set());
  const [executingPromptRunIndex, setExecutingPromptRunIndex] = useState(0);
  const [executingModelIndex, setExecutingModelIndex] = useState(0);

  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [promptsToRunCount, setPromptsToRunCount] = useState(0);
  const totalExecutedPromptsRef = useRef(0);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);

  const skipExecutionRef = useRef(false);
  const cancelExecutionRef = useRef(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [executingModel, setExecutingModel] = useState<string | null>(null);

  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const executionStartTimeRef = useRef<number>(0);

  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showTags, setShowTags] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const continueExecutionRef = useRef(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      if (elapsedTimeIntervalRef.current) clearInterval(elapsedTimeIntervalRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (connectionCheckIntervalRef.current) clearInterval(connectionCheckIntervalRef.current);
    };
  }, []);

  const startTimeTracking = () => {
    setElapsedTime(0);
    executionStartTimeRef.current = Date.now();

    elapsedTimeIntervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      const seconds = (currentTime - executionStartTimeRef.current) / 1000;
      setElapsedTime(seconds);
    }, 1000);
  };

  const stopTimeTracking = () => {
    if (elapsedTimeIntervalRef.current) {
      clearInterval(elapsedTimeIntervalRef.current);
      elapsedTimeIntervalRef.current = null;
    }
  };

  const handleUpdateCopyRefresh = () => {
    setRefreshContextMenu(!refreshContextMenu);
  };

  const fetchProgressData = async () => {
    // Don't fetch progress data during restart
    if (isRestarting) return;

    try {
      const response = await fetch(`${SD_API_BASE_URL}/sdapi/v1/progress`);
      if (response.ok) {
        const data = await response.json() as ProgressData;
        setProgressData(data);
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
    }
  };

  const startProgressPolling = () => {
    setProgressData(null);

    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(fetchProgressData, 500);
  };

  const stopProgressPolling = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgressData(null);
  };

  const handlePromptUpdate = (updatedPrompt: PromptEditor) => {
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    // Set timeout for debounced update
    updateTimeoutRef.current = setTimeout(() => {
      updatePrompt(updatedPrompt);
    }, DEBOUNCE_DELAY);
  };

  const handleInterruptExecution = () => {
    setIsCancelling(true);
    cancelExecutionRef.current = true;
    stopProgressPolling();

    // Call the SD API to interrupt the generation
    interruptGeneration().then(success => {
      if (success) {
        toast.success("Generation interrupted");
      } else {
        toast.error("Failed to interrupt generation");
      }
    });
  };

  const handleInterruptCurrentGeneration = async () => {
    try {
      const success = await interruptGeneration();
      if (success) {
        toast.success("Current generation interrupted");
      } else {
        toast.error("Failed to interrupt generation");
      }
    } catch (error) {
      console.error("Error interrupting generation:", error);
      toast.error("Error interrupting generation");
    }
  };

  const handleSkipCurrentPrompt = () => {
    setIsSkipping(true);
    skipExecutionRef.current = true;

    // Also interrupt the current generation
    interruptGeneration().then(success => {
      if (success) {
        toast.success("Skipping to next prompt");
      }
    });
  };

  const handleExecutePrompt = async (promptToExecute: PromptEditor) => {
    setStatus('execution');
    setSuccessCount(0);
    setFailureCount(0);
    setCurrentPromptIndex(0);
    setPromptsToRunCount(promptToExecute.runCount * promptToExecute.models.length);
    totalExecutedPromptsRef.current = 0;
    // Reset flags
    cancelExecutionRef.current = false;
    skipExecutionRef.current = false;
    setIsSkipping(false);
    setIsCancelling(false);

    startTimeTracking();
    startProgressPolling();

    try {
      await executePrompt(promptToExecute);
      setStatus('completed');
    } catch (err) {
      console.error('Error during prompt execution:', err);
      toast("Execution failed ", {
        description: err instanceof Error ? err.message : String(err)
      });
    }

    stopTimeTracking();
    stopProgressPolling();

    await resetExecution();
  };

  // Handle execution of all prompts
  const handleExecuteAll = async () => {
    setStatus('execution');
    setSuccessCount(0);
    setFailureCount(0);
    setCurrentPromptIndex(0);
    setExecutedPromptIds(new Set());
    totalExecutedPromptsRef.current = 0;

    // Calculate total runs across all prompts
    const totalRuns = prompts.map(p => p.runCount * p.models.length).reduce((a, b) => a + b, 0)
    setPromptsToRunCount(totalRuns);

    // Reset flags
    cancelExecutionRef.current = false;
    skipExecutionRef.current = false;
    continueExecutionRef.current = false;
    setIsCancelling(false);
    setIsSkipping(false);

    // Start time tracking and progress polling
    startTimeTracking();
    startProgressPolling();

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

    // Stop time tracking and progress polling
    stopTimeTracking();
    stopProgressPolling();

    await resetExecution();
  };

  const resetExecution = async () => {
    // Reset all prompts to idle state in a sequential manner
    const promptsToReset = prompts.filter(p => p.currentRun > 0);
    for (const p of promptsToReset) {
      await updatePrompt({ ...p, currentRun: 0, status: 'idle' });
    }

    // Clear execution state
    setExecutingPromptId(null);
    setExecutedPromptIds(new Set());
    setIsCancelling(false);
    setIsSkipping(false);

    skipExecutionRef.current = false;
    cancelExecutionRef.current = false;
    continueExecutionRef.current = false;

    // Reset counters
    setCurrentPromptIndex(0);
    setPromptsToRunCount(0);
    setExecutingPromptRunIndex(0);
    setExecutingModelIndex(0);
  }

  const executePrompt = async (prompt: PromptEditor): Promise<void> => {
    setExecutingPromptId(prompt.id);

    for (let k = 0; k < prompt.models.length; k++) {
      if (cancelExecutionRef.current) break;

      setExecutingModelIndex(k);
      const model = prompt.models[k];
      prompt.currentRun = 0;
      setExecutingModel(model);

      const promptData: Prompt = {
        name: prompt.name,
        text: prompt.text,
        negativePrompt: prompt.negativePrompt || "",
        cfgScale: prompt.cfgScale,
        seed: prompt.seed,
        steps: prompt.steps,
        sampler: prompt.sampler,
        model: model,
        loras: (() => {
          if (!prompt.lorasRandom) {
            return prompt.loras.map(lora => {
              return {
                name: lora.name,
                weight: lora.random ? randomBetween(RANDOM_LORAS_MIN_WEIGHT, RANDOM_LORAS_MAX_WEIGHT) : lora.weight
              }
            })
          } else {
            return prompt.loras;
          }
        })(),
        embeddings: prompt.embeddings.map(embedding => ({
          name: embedding.name,
          weight: embedding.weight
        })),
        width: prompt.width,
        height: prompt.height,
        tags: prompt.tags
      }
      for (let i = 0; i < prompt.runCount; i++) {
        setExecutingPromptRunIndex(i);

        if (cancelExecutionRef.current) {
          console.log(`Execution cancelled for prompt ${prompt.id}`);
          break;
        }

        if (skipExecutionRef.current) {
          console.log(`Execution skipped for prompt ${prompt.id} for model ${model}`);
          skipExecutionRef.current = false;
          setIsSkipping(false);
          break;
        }

        if (prompt.lorasRandom) {
          const lorasNumber = randomIntBetween(1, RANDDOM_LORAS_MAX_COUNT);
          const shuffled = [...promptData.loras].sort(() => 0.5 - Math.random());
          promptData.loras = shuffled.slice(0, lorasNumber).map(lora => {
            return { name: lora.name, weight: randomBetween(RANDOM_LORAS_MIN_WEIGHT, RANDOM_LORAS_MAX_WEIGHT) }
          });
        }

        try {
          // Check if we need to restart
          if (totalExecutedPromptsRef.current >= PROMPTS_BEFORE_RESTART) {
            console.log(`Executed ${totalExecutedPromptsRef.current} prompts, restarting Stable Diffusion WebUI`);

            // Clear prompt counter
            totalExecutedPromptsRef.current = 0;

            // Set restarting state
            setIsRestarting(true);
            toast.info("Restarting Stable Diffusion...");

            // Call restart API
            await restartStableDiffusion();

            // Add a delay after restart to ensure server is ready
            console.log("Waiting 30 seconds for server to fully restart...");
            toast.info("Waiting 30 seconds for server to fully restart...");
            await new Promise(resolve => setTimeout(resolve, 30000));
            toast.info("Restart wait complete, resuming execution...");
            console.log("Restart wait complete, resuming execution...");
            setIsRestarting(false);
          }

          console.log("Await for image generation...");
          const result = await generateImage(promptData);

          if (result) {
            setSuccessCount(prev => prev + 1);
            totalExecutedPromptsRef.current = totalExecutedPromptsRef.current + 1;
          } else {
            setFailureCount(prev => prev + 1);
          }
          setCurrentPromptIndex(prev => prev + 1);
        } catch (err) {
          console.error(`Error running prompt ${prompt.id} (${i + 1}/${prompt.runCount}):`, err);
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
  }
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
      models: availableModels.length > 0 ? [availableModels[0].name] : [],
      width: DEFAULT_PROMPT_HEIGHT,
      height: DEFAULT_PROMPT_WIDTH,
      lorasRandom: false,
      runCount: 1,
      embeddings: [],
      tags: [],
      loras: [],
      currentRun: 0,
      status: 'idle',
    };

    await addPrompt(newPrompt);
  };

  const handleDuplicatePrompt = async (prompt: PromptEditor) => {
    const newPrompt: PromptEditor = {
      ...prompt,
      id: generateUUID(),
      currentRun: 0,
      status: 'idle',
    }

    await addPrompt(newPrompt);
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-8rem)]">
      <ResizablePanel defaultSize={75} minSize={30}>
        <div className="h-full flex flex-col p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 z-1">
            <h2 className="text-xl font-semibold">Prompt List</h2>

            <div className="flex gap-2">
              <Button variant={'outline'} onClick={() => setShowTags(!showTags)} ><span className={`${showTags ? 'text-white' : 'text-gray-500'}`}>Tags</span></Button>
              <Button variant={'outline'} onClick={() => setShowModels(!showModels)}><span className={`${showModels ? 'text-white' : 'text-gray-500'}`}>Models</span></Button>
              <Button onClick={handleAddPrompt} disabled={isPromptLoading || status === 'execution'}>
                <PlusCircle />Add Prompt</Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto space-y-3 z-1 m-auto w-11/12">
            {prompts.map((prompt, idx) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                index={idx + 1}

                showTags={showTags}
                showModels={showModels}

                onRunPrompt={handleExecutePrompt}
                onSkipExecution={handleSkipCurrentPrompt}
                onInterruptGeneration={handleInterruptCurrentGeneration}
                onDuplicatePrompt={() => handleDuplicatePrompt(prompt)}
                onCopyRefresh={() => handleUpdateCopyRefresh()}

                onDelete={() => deletePrompt(prompt.id)}
                onMove={reorderPrompt}
                onPromptUpdate={handlePromptUpdate}

                isCancelling={isCancelling}
                isSkipping={isSkipping}
                isRestarting={isRestarting}

                isExecuted={executedPromptIds.has(prompt.id)}
                isExecuting={status === 'execution'}
                isCurrentlyExecuting={executingPromptId === prompt.id}
                executingModel={executingModel}

                isApiConnected={isConnected}
                availableSamplers={availableSamplers}
                availableModels={availableModels}
                availableLoras={availableLoras}
                availableEmbeddings={availableEmbeddings}
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
            isRestarting={isRestarting}
            elapsedTime={elapsedTime}
            progressData={progressData}
            totalExecutedPrompts={totalExecutedPromptsRef.current}
            onStartExecution={handleExecuteAll}
            onCancelExecution={handleInterruptExecution}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}