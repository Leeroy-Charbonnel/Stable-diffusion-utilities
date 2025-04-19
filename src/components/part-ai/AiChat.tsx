// src/components/part-ai/AiChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, BrainCog, Send, Link, PlusCircle, Settings, Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import { useAi } from '@/contexts/AiContext';
import { AiModel, ChatMessage, Prompt } from '@/types';
import { generateUUID } from '@/lib/utils';

export function AiChat() {
  const {
    messages,
    isProcessing,
    error,
    settings,
    setApiKey,
    setModel,
    setTemperature,
    setMaxTokens,
    sendMessage,
    clearMessages,
    extractFromCivitai
  } = useAi();

  const [inputMessage, setInputMessage] = useState('');
  const [civitaiUrl, setCivitaiUrl] = useState('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [extractedPrompt, setExtractedPrompt] = useState<Prompt | null>(null);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  //Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  //Focus input when messages change
  useEffect(() => {
    if (inputRef.current && !isProcessing) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() && !isProcessing) {
      await sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleExtractFromCivitai = async () => {
    if (!civitaiUrl.trim() || isProcessing) return;

    //Validate URL format
    if (!civitaiUrl.includes('civitai.com')) {
      alert('Please enter a valid Civitai URL');
      return;
    }

    setExtractionStatus('processing');

    try {
      //Show notification that this might take a minute
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-background p-4 rounded-lg shadow-lg border z-50';
      notification.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="animate-spin rounded-full h-4 w-4 border-t-2 border-primary"></div>
          <p>Extracting data from Civitai. This might take up to a minute...</p>
        </div>
      `;
      document.body.appendChild(notification);

      //Extract the data
      const data = await extractFromCivitai(civitaiUrl);

      //Remove the notification
      document.body.removeChild(notification);

      if (data) {
        //Generate a name for the prompt based on the URL
        const urlParts = civitaiUrl.split('/');
        const imageId = urlParts[urlParts.length - 1];

        //Create a new prompt from the extracted data
        const newPrompt: Prompt = {
          id: generateUUID(),
          isOpen: true,
          name: `Civitai Image ${imageId}`,
          text: data.prompt || '',
          negativePrompt: data.negativePrompt || '',
          seed: data.seed || -1,
          steps: data.steps || 20,
          sampler: data.sampler || 'Euler a',
          model: data.model || '',
          width: data.width || 512,
          height: data.height || 512,
          runCount: 1,
          tags: [],
          loras: data.loras || [],
          currentRun: 0,
          status: 'idle',
        };

        setExtractedPrompt(newPrompt);
        setExtractionStatus('success');
      } else {
        setExtractionStatus('error');
      }
    } catch (err) {
      console.error('Error extracting from Civitai:', err);
      setExtractionStatus('error');
    }
  };

  const resetExtraction = () => {
    setCivitaiUrl('');
    setExtractedPrompt(null);
    setExtractionStatus('idle');
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-3/4 rounded-lg p-3 ${isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
            }`}
        >
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          <div className="text-xs mt-1 opacity-70">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Assistant</h2>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="extract">Extract from Civitai</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="h-[600px] flex flex-col">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-lg flex items-center">
                <BrainCog className="h-5 w-5 mr-2" />
                Chat with {settings.model}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BrainCog className="mx-auto h-12 w-12 opacity-50 mb-2" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map(renderMessage)}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              )}

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="min-h-[60px] resize-none"
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isProcessing}
                    className="h-auto"
                  >
                    {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                {messages.length > 0 && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearMessages}
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Chat
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extract from Civitai Tab */}
        <TabsContent value="extract" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Link className="h-5 w-5 mr-2" />
                Extract Prompt from Civitai
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="civitaiUrl">Civitai Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="civitaiUrl"
                    value={civitaiUrl}
                    onChange={(e) => setCivitaiUrl(e.target.value)}
                    placeholder="https://civitai.com/images/..."
                    disabled={isProcessing || extractionStatus === 'processing'}
                  />
                  <Button
                    onClick={handleExtractFromCivitai}
                    disabled={!civitaiUrl.trim() || isProcessing || extractionStatus === 'processing'}
                  >
                    {extractionStatus === 'processing' ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <PlusCircle className="h-4 w-4 mr-2" />
                    )}
                    Extract
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a link to a Civitai image to extract its generation parameters.
                </p>
              </div>

              {extractionStatus === 'processing' && (
                <div className="py-4 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p>Extracting data from Civitai...</p>
                </div>
              )}

              {extractionStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to extract data from the provided URL. Please check the URL and try again.
                  </AlertDescription>
                </Alert>
              )}

              {extractionStatus === 'success' && extractedPrompt && (
                <div className="space-y-4">
                  <Alert className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>
                      Successfully extracted prompt data from Civitai.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3 border p-4 rounded-md">
                    <div>
                      <Label className="text-xs">Prompt</Label>
                      <div className="bg-muted p-2 rounded text-sm">
                        {extractedPrompt.text}
                      </div>
                    </div>

                    {extractedPrompt.negativePrompt && (
                      <div>
                        <Label className="text-xs">Negative Prompt</Label>
                        <div className="bg-muted p-2 rounded text-sm">
                          {extractedPrompt.negativePrompt}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Model</Label>
                        <div className="bg-muted p-2 rounded text-sm truncate">
                          {extractedPrompt.model || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Sampler</Label>
                        <div className="bg-muted p-2 rounded text-sm">
                          {extractedPrompt.sampler}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Seed</Label>
                        <div className="bg-muted p-2 rounded text-sm">
                          {extractedPrompt.seed}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Steps</Label>
                        <div className="bg-muted p-2 rounded text-sm">
                          {extractedPrompt.steps}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Width</Label>
                        <div className="bg-muted p-2 rounded text-sm">
                          {extractedPrompt.width}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Height</Label>
                        <div className="bg-muted p-2 rounded text-sm">
                          {extractedPrompt.height}
                        </div>
                      </div>
                    </div>

                    {extractedPrompt.loras && extractedPrompt.loras.length > 0 && (
                      <div>
                        <Label className="text-xs">LoRAs</Label>
                        <div className="space-y-1 mt-1">
                          {extractedPrompt.loras.map((lora, index) => (
                            <div key={index} className="bg-muted p-2 rounded text-sm flex justify-between">
                              <span>{lora.name}</span>
                              <span className="font-mono">{lora.weight.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={resetExtraction}>
                        Reset
                      </Button>
                      <Button onClick={async () => {
                        try {
                          //Get existing prompts
                          const promptsApi = await import('@/services/promptsApi');
                          const existingPrompts = await promptsApi.getAllPrompts();

                          //Add the extracted prompt to the list
                          if (extractedPrompt) {
                            const updatedPrompts = [...existingPrompts, extractedPrompt];
                            const success = await promptsApi.saveAllPrompts(updatedPrompts);

                            if (success) {
                              setExtractionStatus('idle');
                              setExtractedPrompt(null);
                              setCivitaiUrl('');
                              alert("Prompt created successfully! You can find it in the Prompts tab.");
                            } else {
                              alert("Failed to create prompt. Please try again.");
                            }
                          }
                        } catch (error) {
                          console.error("Error creating prompt:", error);
                          alert("Failed to create prompt. Please try again.");
                        }
                      }}>
                        Create Prompt
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                AI Settings
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiKey">OpenAI API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    type={isApiKeyVisible ? 'text' : 'password'}
                    value={settings.apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                  <Button
                    variant="outline"
                    onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
                  >
                    {isApiKeyVisible ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key is stored locally and never sent to our servers.
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    value={settings.model}
                    onValueChange={(value) => setModel(value as AiModel)}
                  >
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="temperature">Temperature: {settings.temperature.toFixed(1)}</Label>
                  </div>
                  <Slider
                    id="temperature"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[settings.temperature]}
                    onValueChange={(values) => setTemperature(values[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower values make responses more deterministic, higher values make them more creative.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="maxTokens">Max Tokens: {settings.maxTokens}</Label>
                  </div>
                  <Slider
                    id="maxTokens"
                    min={100}
                    max={4000}
                    step={100}
                    value={[settings.maxTokens]}
                    onValueChange={(values) => setMaxTokens(values[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of tokens the AI can generate in a response.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}