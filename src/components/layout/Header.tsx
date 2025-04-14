// src/components/layout/Header.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Images, ListChecks, Settings } from 'lucide-react';
import { Button } from '../ui/button';

export const Header: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="border-b sticky top-0 z-10 bg-background">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">SD Prompt Manager</h1>
        </div>
        
        <nav className="flex gap-1">
          <Button
            asChild
            variant={isActive('/') ? 'default' : 'ghost'}
            size="sm"
          >
            <Link to="/">
              <ListChecks className="h-4 w-4 mr-2" />
              Prompts
            </Link>
          </Button>
          
          <Button
            asChild
            variant={isActive('/gallery') ? 'default' : 'ghost'}
            size="sm"
          >
            <Link to="/gallery">
              <Images className="h-4 w-4 mr-2" />
              Gallery
            </Link>
          </Button>
          
          <Button
            asChild
            variant={isActive('/settings') ? 'default' : 'ghost'}
            size="sm"
          >
            <Link to="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};

// src/components/layout/Layout.tsx
import React, { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} SD Prompt Manager
        </div>
      </footer>
    </div>
  );
};

// src/pages/HomePage.tsx
import React from 'react';
import { PromptList } from '../components/prompt/PromptList';
import { BatchExecutionControl } from '../components/batch/BatchExecutionControl';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <PromptList />
        </div>
        <div className="md:w-80">
          <BatchExecutionControl />
        </div>
      </div>
    </div>
  );
};

// src/pages/GalleryPage.tsx
import React from 'react';
import { ImageGallery } from '../components/gallery/ImageGallery';

export const GalleryPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Image Gallery</h1>
      <ImageGallery />
    </div>
  );
};

// src/pages/SettingsPage.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { readFileAsText, exportData, importData, loadSettings, saveSettings, ApiSettings } from '../lib/storage';
import { apiClient } from '../lib/api';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { CheckCircle, AlertTriangle, Download, Upload, RefreshCw } from 'lucide-react';
import { Textarea } from '../components/ui/textarea';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('api');
  const [apiSettings, setApiSettings] = useState<ApiSettings>(loadSettings());
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [importExportData, setImportExportData] = useState('');
  
  const handleApiSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApiSettings(prev => ({ ...prev, [name]: value }));
  };
  
  const saveApiSettings = () => {
    saveSettings(apiSettings);
    apiClient.updateSettings(
      apiSettings.baseUrl,
      apiSettings.username,
      apiSettings.password
    );
    setConnectionStatus('idle');
  };
  
  const checkConnection = async () => {
    setConnectionStatus('checking');
    setConnectionMessage('');
    
    try {
      //Temporarily update API client with current settings
      apiClient.updateSettings(
        apiSettings.baseUrl,
        apiSettings.username,
        apiSettings.password
      );
      
      //Try to get samplers as a connection test
      const samplers = await apiClient.getSamplers();
      
      setConnectionStatus('success');
      setConnectionMessage(`Connected successfully! Found ${samplers.length} samplers.`);
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'Failed to connect to the API.');
    }
  };
  
  const handleExportData = () => {
    const data = exportData();
    setImportExportData(data);
    
    //Create download link
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sd-prompt-manager-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleImportData = () => {
    if (!importExportData) return;
    
    try {
      const success = importData(importExportData);
      
      if (success) {
        alert('Data imported successfully. The page will now reload.');
        window.location.reload();
      } else {
        alert('Failed to import data. Please check the JSON format.');
      }
    } catch (error) {
      alert(`Error importing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const content = await readFileAsText(file);
      setImportExportData(content);
    } catch (error) {
      alert(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="api" className="flex-1">API Configuration</TabsTrigger>
          <TabsTrigger value="data" className="flex-1">Import / Export</TabsTrigger>
        </TabsList>
        
        <TabsContent value="api" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>API Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">API URL</Label>
                <Input
                  id="baseUrl"
                  name="baseUrl"
                  placeholder="http://127.0.0.1:7860"
                  value={apiSettings.baseUrl}
                  onChange={handleApiSettingsChange}
                />
                <p className="text-xs text-muted-foreground">
                  The URL of your Stable Diffusion WebUI API. Usually http://127.0.0.1:7860 for local installations.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username (Optional)</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Username for authentication"
                  value={apiSettings.username || ''}
                  onChange={handleApiSettingsChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password (Optional)</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password for authentication"
                  value={apiSettings.password || ''}
                  onChange={handleApiSettingsChange}
                />
                <p className="text-xs text-muted-foreground">
                  Credentials are stored locally and only sent to your API.
                </p>
              </div>
              
              {connectionStatus === 'success' && (
                <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/30">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle>Connection Successful</AlertTitle>
                  <AlertDescription>{connectionMessage}</AlertDescription>
                </Alert>
              )}
              
              {connectionStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Connection Failed</AlertTitle>
                  <AlertDescription>{connectionMessage}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={checkConnection}
                disabled={connectionStatus === 'checking'}
              >
                {connectionStatus === 'checking' ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button onClick={saveApiSettings}>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="data" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                Export all your prompts, images metadata, and settings as a JSON file for backup or to transfer to another device.
              </p>
              <Button onClick={handleExportData} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Import Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Import previously exported data. This will replace all existing prompts, images metadata, and settings.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="importFile">Upload JSON File</Label>
                <Input
                  id="importFile"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="importData">Or Paste JSON Data</Label>
                <Textarea
                  id="importData"
                  placeholder="Paste JSON data here..."
                  className="min-h-32"
                  value={importExportData}
                  onChange={(e) => setImportExportData(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleImportData}
                className="w-full"
                disabled={!importExportData}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { GalleryPage } from './pages/GalleryPage';
import { SettingsPage } from './pages/SettingsPage';
import { PromptProvider } from './context/PromptContext';
import { ImageProvider } from './context/ImageContext';
import { BatchExecutionProvider } from './components/batch/BatchExecutionContext';

const App: React.FC = () => {
  return (
    <Router>
      <PromptProvider>
        <ImageProvider>
          <BatchExecutionProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </BatchExecutionProvider>
        </ImageProvider>
      </PromptProvider>
    </Router>
  );
};

export default App;

// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
