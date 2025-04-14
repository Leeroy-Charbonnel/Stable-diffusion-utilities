// src/App.tsx
import React, { useState } from 'react';
import { PromptsManager } from './components/PromptsManager';
import { BatchExecutor } from './components/BatchExecutor';
import { ImageViewer } from './components/ImageViewer';
import { ApiProvider } from './contexts/ApiContext';
import { PromptContextProvider } from './contexts/PromptContextProvider';
import { Button } from '@/components/ui/button';
import { Image, ListChecks, Play } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'prompts' | 'execute' | 'images'>('prompts');

  // Map tabs to their content components
  const tabComponents = {
    prompts: <PromptsManager />,
    execute: <BatchExecutor />,
    images: <ImageViewer />
  };

  return (
    <ApiProvider>
      <PromptContextProvider>
        <div className="min-h-screen bg-background text-foreground dark flex">
          {/* Sidebar */}
          <div className="w-64 border-r border-border h-screen flex flex-col">
            <div className="p-4 border-b border-border">
              <h1 className="text-xl font-bold">SD Utilities</h1>
              <p className="text-xs text-muted-foreground">
                Stable Diffusion Tools
              </p>
            </div>
            
            <nav className="flex flex-col p-2 gap-1">
              <Button
                variant={activeTab === 'prompts' ? 'default' : 'ghost'}
                className="justify-start"
                onClick={() => setActiveTab('prompts')}
              >
                <ListChecks className="mr-2 h-4 w-4" />
                Prompts
              </Button>
              
              <Button
                variant={activeTab === 'execute' ? 'default' : 'ghost'} 
                className="justify-start"
                onClick={() => setActiveTab('execute')}
              >
                <Play className="mr-2 h-4 w-4" />
                Execute
              </Button>
              
              <Button
                variant={activeTab === 'images' ? 'default' : 'ghost'}
                className="justify-start"
                onClick={() => setActiveTab('images')}
              >
                <Image className="mr-2 h-4 w-4" />
                Images
              </Button>
            </nav>
          </div>
          
          {/* Main content */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto p-6">
              {tabComponents[activeTab]}
            </div>
          </div>
        </div>
      </PromptContextProvider>
    </ApiProvider>
  );
}

export default App;