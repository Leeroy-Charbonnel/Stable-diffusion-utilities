
// src/pages/HomePage.tsx
import React from 'react';
import { DraggablePromptList } from '../components/prompt/DraggablePromptList';
import { BatchExecutionControl } from '../components/batch/BatchExecutionControl';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <DraggablePromptList />
        </div>
        <div className="md:w-80">
          <BatchExecutionControl />
        </div>
      </div>
    </div>
  );
};