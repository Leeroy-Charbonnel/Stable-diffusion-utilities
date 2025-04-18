// src/App.tsx
import { useState, useEffect } from 'react';
import { PromptsManager } from '@/components/PromptsManager';
import { ImageViewer } from '@/components/ImageViewer';
import { ApiProvider } from '@/contexts/ApiContext';
import { Sidebar } from '@/components/SideBar';

function App() {
  const [activeTab, setActiveTab] = useState<'prompts' | 'images'>(
    () => {
      const savedTab = localStorage.getItem('sd-utilities-activeTab');
      return (savedTab === 'images' ? 'images' : 'prompts');
    }
  );

  useEffect(() => {
    localStorage.setItem('sd-utilities-activeTab', activeTab);
  }, [activeTab]);

  const tabComponents = {
    prompts: <PromptsManager />,
    images: <ImageViewer />
  };

  return (
    <ApiProvider>
      <div className="min-h-screen bg-background text-foreground dark flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {tabComponents[activeTab]}
          </div>
        </div>
      </div>
    </ApiProvider>
  );
}

export default App;