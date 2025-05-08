import { useState } from 'react';
import { PromptsManager } from '@/components/part-prompt/PromptsManager';
import { AiChat } from '@/components/part-ai/AiChat';
import { AiProvider } from '@/contexts/contextAI';
import { AppSidebar } from '@/components/Sidebar';
import { Toaster } from 'sonner';
import { ReactFlowProvider } from '@/components/part-prompt/ReactFlowProvider';
import { Tab } from './types';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>(
    () => {
      const savedTab = localStorage.getItem('sd-utilities-activeTab');
      if (savedTab === 'ai') return 'ai';
      return 'prompts';
    }
  );


  return (
    <div className="min-h-screen bg-background text-foreground dark flex overflow-hidden">
      <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab}/>

      <div className="w-full h-screen">
        <div className="h-full">
          <div className="h-full" style={{ display: activeTab === 'prompts' ? 'block' : 'none' }}>
            <ReactFlowProvider>
              <PromptsManager />
            </ReactFlowProvider>
          </div>
          <div className="h-full" style={{ display: activeTab === 'ai' ? 'block' : 'none' }}><AiChat /></div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AiProvider>
      <AppContent />
    </AiProvider>
  );
}

export default App;