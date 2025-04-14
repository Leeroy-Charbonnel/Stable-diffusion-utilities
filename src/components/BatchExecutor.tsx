import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, XCircle } from 'lucide-react';

export function BatchExecutor() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExecute = () => {
    setIsExecuting(true);
    setProgress(0);
    
    //Simulated progress update
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        const newProgress = prevProgress + 5;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsExecuting(false), 500);
          return 100;
        }
        return newProgress;
      });
    }, 300);
  };

  const handleCancel = () => {
    setIsExecuting(false);
    setProgress(0);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Batch Execution</h2>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Execute All Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            This will execute all prompts in your list with their configured settings.
          </p>
          
          {isExecuting ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
              <Button variant="destructive" onClick={handleCancel}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Execution
              </Button>
            </div>
          ) : (
            <Button onClick={handleExecute}>
              <Play className="mr-2 h-4 w-4" />
              Start Execution
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            API configuration will be added in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}