import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, StopCircle, RefreshCw } from 'lucide-react';
import { ExecutionStatus, ProgressData, PromptEditor } from '@/types';
import { Separator } from '@/components/ui/separator';
import { PROMPTS_BEFORE_RESTART } from '@/lib/constants';
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ExecutionPanelProps {
  prompts: PromptEditor[];
  status: ExecutionStatus;
  successCount: number;
  failureCount: number;
  currentPromptIndex: number;
  promptsToRunCount: number;
  isApiConnected: boolean;
  isCancelling: boolean;
  elapsedTime: number;
  progressData: ProgressData | null;
  isRestarting?: boolean;
  totalExecutedPrompts: number;
  onStartExecution: () => void;
  onCancelExecution: () => void;
}

export function ExecutionPanel({
  prompts,
  status,
  successCount,
  failureCount,
  currentPromptIndex,
  promptsToRunCount,
  isApiConnected,
  isCancelling,
  elapsedTime,
  progressData,
  isRestarting = false,
  totalExecutedPrompts,
  onStartExecution,
  onCancelExecution
}: ExecutionPanelProps) {
  const isExecuting = status === 'execution';
  const hasCompleted = status === 'completed';
  const progressPercentage = promptsToRunCount > 0 ? Math.round((currentPromptIndex / promptsToRunCount) * 100) : 0;

  //Format elapsed time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sdProgressPercentage = progressData?.progress ? Math.round(progressData.progress * 100) : 0;
  const remainingPromptsBeforeRestart = PROMPTS_BEFORE_RESTART - totalExecutedPrompts;

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-lg font-semibold mb-4">Execution Status</h3>

      <Separator className='my-2' />
      
      {/* API Connection Status - Added Here */}
      {!isApiConnected && (
        <Alert className="flex p-2 bg-destructive/20 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Connected</AlertTitle>
        </Alert>
      )}

      {/* Restart Status */}
      {isRestarting && (
        <div className="mb-4 p-2 bg-yellow-500/20 rounded-md">
          <div className="flex items-center space-x-2">
            <RefreshCw className="animate-spin h-4 w-4" />
            <span className="font-medium">Restarting Stable Diffusion...</span>
          </div>
        </div>
      )}

      {/* Elapsed Time Section */}
      {isExecuting && (
        <div className="mb-4">
          <div className="flex justify-between text-sm font-medium mb-1">
            <span>Elapsed Time</span>
            <span>{formatTime(elapsedTime)}</span>
          </div>
        </div>
      )}

      {/* Progress Section */}
      <div className="flex mb-4 items-center gap-2">
        <span className='text-nowrap'>Overall Progress</span>
        <Progress value={progressPercentage} className="h-1" />
        <span className='text-nowrap'>{currentPromptIndex} of {promptsToRunCount}</span>
      </div>

      {/* Current Generation Progress */}
      {isExecuting && progressData && (
        <div className="flex mb-4 items-center gap-2">
          <span className='text-nowrap'>Current Generation</span>
          <Progress value={sdProgressPercentage} className="h-1" />
          <span className='text-nowrap'>Step {progressData.state.sampling_step} / {progressData.state.sampling_steps}</span>
        </div>
      )}
      <Separator className='my-2' />

      {/* Counters Section */}
      <div className="flex gap-2 mx-auto text-sm">
        <span>Success {successCount}</span>
        <span className="mx-2">|</span>
        <span>Failed {failureCount}</span>
        {isExecuting && (
          <>
            <span className="mx-2">|</span>
            <span>Restart after {remainingPromptsBeforeRestart} more</span>
          </>
        )}
      </div>

      <Separator className='my-2' />

      {/* Preview Image Section */}
      {isExecuting && progressData?.current_image && (
        <div className="flex flex-1 justify-center items-start w-5/6 mx-auto mb-4 overflow-hidden">
          <img
            src={`data:image/png;base64,${progressData.current_image}`}
            alt="Generation preview"
            className="w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* Total Stats Section - Now above action button */}
      {!isExecuting && (hasCompleted || (successCount > 0 || failureCount > 0)) && (
        <div className="mb-4 p-3 bg-secondary/20 text-sm">
          <h4 className="text-sm  mb-2">Last Execution Stats</h4>

          <span className="text-muted-foreground">Total Time:</span>
          <span className="ml-2">{formatTime(elapsedTime)}</span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Total Images:</span>
              <span className="ml-2">{successCount + failureCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Success Rate:</span>
              <span className="ml-2">
                {(successCount + failureCount) > 0
                  ? Math.round((successCount / (successCount + failureCount)) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto">
        {isExecuting ? (
          <Button
            onClick={onCancelExecution}
            variant="destructive"
            className="w-full"
            disabled={isCancelling || isRestarting}
          >
            <StopCircle className="mr-2 h-4 w-4" />
            {isCancelling ? 'Stopping...' : isRestarting ? 'Restarting...' : 'Stop Execution'}
          </Button>
        ) : (
          <Button
            onClick={onStartExecution}
            className="w-full"
            disabled={!isApiConnected || prompts.length === 0 || isRestarting}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Execution
          </Button>
        )}
      </div>
    </div>
  );
}