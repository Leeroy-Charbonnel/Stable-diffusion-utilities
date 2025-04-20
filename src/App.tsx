// src/App.tsx
import { useState, useEffect } from 'react';
import { PromptsManager } from '@/components/part-prompt/PromptsManager';
import { ImageViewer } from '@/components/part-images/ImageViewer';
import { AiChat } from '@/components/part-ai/AiChat';
import { SdProvider } from '@/contexts/contextSD';
import { AiProvider } from '@/contexts/contextAI';
import { PromptProvider } from '@/contexts/contextPrompts';
import { Sidebar } from '@/components/Sidebar';
import { Toaster } from 'sonner';

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

  return (
    <SdProvider>
      <PromptProvider>
        <AiProvider>

          <div className="min-h-screen bg-background text-foreground dark flex overflow-hidden">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="w-full h-screen">
              <div className="p-6 h-full">
                <div style={{ display: activeTab === 'prompts' ? 'block' : 'none' }}><PromptsManager /></div>
                <div style={{ display: activeTab === 'images' ? 'block' : 'none' }}><ImageViewer /></div>
                <div style={{ display: activeTab === 'ai' ? 'block' : 'none' }}><AiChat /></div>
              </div>
            </div>
          </div>
          <Toaster />
        </AiProvider>
      </PromptProvider>
    </SdProvider>
  );
}

export default App;