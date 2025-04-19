// src/App.tsx
import { useState, useEffect } from 'react';
import { PromptsManager } from '@/components/part-prompt/PromptsManager';
import { ImageViewer } from '@/components/part-images/ImageViewer';
import { AiChat } from '@/components/part-ai/AiChat';
import { ApiProvider } from '@/contexts/ApiContext';
import { AiProvider } from '@/contexts/AiContext';
import { Sidebar } from '@/components/Sidebar';

function App() {
  const [activeTab, setActiveTab] = useState<'prompts' | 'images' | 'ai'>(
    () => {
      const savedTab = localStorage.getItem('sd-utilities-activeTab');
      if (savedTab === 'images') return 'images';
      if (savedTab === 'ai') return 'ai';
      return 'prompts';
    }
  );

  useEffect(() => {
    localStorage.setItem('sd-utilities-activeTab', activeTab);
  }, [activeTab]);

  const tabComponents = {
    prompts: <PromptsManager />,
    images: <ImageViewer />,
    ai: <AiChat />
  };

  return (
    <ApiProvider>
      <AiProvider>
        <div className="min-h-screen bg-background text-foreground dark flex">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto p-6">
              {tabComponents[activeTab]}
            </div>
          </div>
        </div>
      </AiProvider>
    </ApiProvider>
  );
}

export default App;