import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, StopCircle, CheckCircle, XCircle } from 'lucide-react';
import { ExecutionStatus, Prompt } from '@/types';

interface ExecutionPanelProps {
  prompts: Prompt[];
  status: ExecutionStatus;
  successCount: number;
  failureCount: number;
  currentPromptIndex: number;
  promptsToRunCount: number;
  isApiConnected: boolean;
  isCancelling: boolean;
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
  onStartExecution,
  onCancelExecution
}: ExecutionPanelProps) {
  const isExecuting = status === 'global-execution' || status === 'single-execution';
  const hasCompleted = status === 'completed' || status === 'failed';
  const progressPercentage = promptsToRunCount > 0 ? Math.round((currentPromptIndex / promptsToRunCount) * 100) : 0;

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-lg font-semibold mb-4">Execution Status</h3>

      {/* Progress Section */}
      <div className="mb-4">
        <div className="flex justify-between text-sm font-medium mb-1">
          <span>Progress</span>
          <span>{currentPromptIndex} of {promptsToRunCount} ({progressPercentage}%)</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Counters Section */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
          <div className="flex items-center text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4 mr-2" />
            <span className="font-medium">Success</span>
          </div>
          <p className="text-2xl font-bold mt-1">{successCount}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
          <div className="flex items-center text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4 mr-2" />
            <span className="font-medium">Failed</span>
          </div>
          <p className="text-2xl font-bold mt-1">{failureCount}</p>
        </div>
      </div>

      {/* Total Stats Section - Now above action button */}
      {!isExecuting && (hasCompleted || (successCount > 0 || failureCount > 0)) && (
        <div className="mb-4 p-3 bg-secondary/20 rounded-md">
          <h4 className="text-sm font-medium mb-2">Last Execution Stats</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Total Images:</span>
              <span className="ml-2 font-medium">{successCount + failureCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Success Rate:</span>
              <span className="ml-2 font-medium">
                {(successCount + failureCount) > 0
                  ? Math.round((successCount / (successCount + failureCount)) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {status === 'completed' && (
        <div className="mb-4 p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-sm">
          Execution completed successfully!
        </div>
      )}

      {status === 'failed' && (
        <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
          Execution failed. Check console for errors.
        </div>
      )}

      {/* Action Buttons - Now at the end, using mt-auto to push it to bottom */}
      <div className="mt-auto">
        {isExecuting ? (
          <Button
            onClick={onCancelExecution}
            variant="destructive"
            className="w-full"
            disabled={isCancelling}
          >
            <StopCircle className="mr-2 h-4 w-4" />
            {isCancelling ? 'Stopping...' : 'Stop Execution'}
          </Button>
        ) : (
          <Button
            onClick={onStartExecution}
            className="w-full"
            disabled={!isApiConnected || prompts.length === 0}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Execution
          </Button>
        )}
      </div>
    </div>
  );
}