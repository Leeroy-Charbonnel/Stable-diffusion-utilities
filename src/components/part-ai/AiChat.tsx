import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, BrainCog, Send, RefreshCw, Trash2, PlusCircle, CheckCircle, AlertCircle, Image } from 'lucide-react';
import { useAi } from '@/contexts/contextAI';
import { usePrompt } from '@/contexts/contextPrompts';
import { ChatMessage, Prompt } from '@/types';
import { useApi } from '@/contexts/contextSD';
import { generateUUID } from '@/lib/utils';
import { PromptForm } from '../part-prompt/PromptForm';
import { CHAT_SYSTEM_PROMPT, EXTRACTION_PROMPT } from '@/lib/constantsAI';
import { toast } from 'sonner';
import { AiSettingsModal } from './AiSettingsModal';

export function AiChat() {
  const { messages, isProcessing, error, settings, sendMessage, clearMessages, updateMessageContent } = useAi();
  const { addPrompt } = usePrompt();
  const { availableSamplers, availableModels, availableLoras } = useApi();

  const [inputMessage, setInputMessage] = useState('');
  const [mode, setMode] = useState<'generation' | 'extraction'>('generation');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  //Prompt creation state
  const [generatedPrompt, setGeneratedPrompt] = useState<Prompt | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  //Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    //Check the last assistant message for JSON data
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      const lastMessage = messages[messages.length - 1];
      extractPromptFromMessage(lastMessage.content, lastMessage.id);
    }
  }, [messages]);

  //Focus input when not processing
  useEffect(() => {
    if (inputRef.current && !isProcessing) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  //Function to prepare system prompt with available models, samplers, and loras
  const prepareSystemPrompt = (basePrompt: string) => {
    const modelsSection = `[${availableModels.map(m => `- ${m}`).join('\n')}]`;
    const samplersSection = `[${availableSamplers.map(s => `- ${s}`).join('\n')}]`;
    const lorasSection = `[${availableLoras.map(l => `- ${l.name}`).join('\n')}]`;

    let preparedPrompt = basePrompt
      .replace('%AVAILABLE_MODELS_PLACEHOLDER%', modelsSection)
      .replace('%AVAILABLE_SAMPLERS_PLACEHOLDER%', samplersSection)
      .replace('%AVAILABLE_LORAS_PLACEHOLDER%', lorasSection);

    return preparedPrompt;
  };

  //Reset chat with appropriate system message when mode changes
  useEffect(() => {
    clearMessages();
    if (mode === 'extraction') {
      const systemPrompt = prepareSystemPrompt(EXTRACTION_PROMPT);
      sendMessage(systemPrompt, 'system');
    } else {
      const systemPrompt = prepareSystemPrompt(CHAT_SYSTEM_PROMPT);
      sendMessage(systemPrompt, 'system');
    }
  }, [mode, availableModels, availableSamplers, availableLoras]);

  //Initialize chat with system message if empty
  useEffect(() => {
    if (messages.length === 0) {
      const systemPrompt = prepareSystemPrompt(CHAT_SYSTEM_PROMPT);
      sendMessage(systemPrompt, 'system');
    }
  }, [availableModels, availableSamplers, availableLoras]);

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

  //Extract prompt data from AI message
  const extractPromptFromMessage = async (message: string, messageId: string) => {
    try {
      //Try to parse the entire message as JSON
      const parsedResponse = JSON.parse(message);

      //Check if it has our expected structure
      if (parsedResponse && parsedResponse.message && parsedResponse.data) {
        //Update the displayed message to only show the message part
        updateMessageContent(messageId, parsedResponse.message);

        //Create prompt from the data
        createPromptFromData(parsedResponse.data);
        return;
      }
    } catch (error) {
    }
  };

  //Create a prompt from extracted data
  const createPromptFromData = (data: any) => {
    if (!data || !data.prompt) return;

    //Create the prompt object with data provided by AI
    //Since AI already knows available models, samplers, and loras, it should provide valid ones
    const newPrompt: Prompt = {
      id: generateUUID(),
      isOpen: true,
      name: data.name || createNameFromPrompt(data.prompt),
      text: data.prompt,
      negativePrompt: data.negativePrompt || '',
      seed: typeof data.seed === 'number' ? data.seed : -1,
      steps: typeof data.steps === 'number' ? data.steps : 20,
      sampler: data.sampler || (availableSamplers.length > 0 ? availableSamplers[0] : 'Euler a'),
      model: data.model || (availableModels.length > 0 ? availableModels[0] : ''),
      width: typeof data.width === 'number' ? data.width : 512,
      height: typeof data.height === 'number' ? data.height : 512,
      runCount: 1,
      tags: Array.isArray(data.tags) ? data.tags : [],
      loras: Array.isArray(data.loras) ? data.loras : [],
      currentRun: 0,
      status: 'idle',
    };

    //Set the generated prompt and show the form
    setGeneratedPrompt(newPrompt);
  };

  //Create a name from the prompt text
  const createNameFromPrompt = (promptText: string): string => {
    if (!promptText) return 'Generated Prompt';

    const wordsToUse = promptText.split(/\s+/).slice(0, 4).join(' ');
    return wordsToUse + (promptText.split(/\s+/).length > 4 ? '...' : '');
  };

  //Save prompt to the prompt list
  const savePromptToList = async () => {
    if (!generatedPrompt) return;

    try {
      await addPrompt(generatedPrompt);
    } catch (error) {
      toast.error("Error saving prompt", {
        description: error instanceof Error ? error.message : String(error)
      });
    }
  };

  //Render individual message
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    if (isSystem) return null;

    return (
      <div
        key={message.id}
        className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
          <div className={`rounded-lg p-3 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`} >
            <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="text-xl font-semibold">AI Assistant</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode(mode === 'generation' ? 'extraction' : 'generation')}
          >
            Mode: {mode === 'generation' ? 'Generation' : 'Extraction'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 divide-x h-[calc(100vh-8rem)]">
        {/* Left side - Chat */}
        <div className="flex flex-col w-1/2 h-full">
          <div className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center">
              <BrainCog className="h-4 w-4 mr-2" />
              <span className="font-medium">Chat with {settings.model}</span>
            </div>
            {messages.filter(m => m.role !== 'system').length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to clear the chat?')) {
                    clearMessages();
                    //Reinitialize with system message
                    const systemPrompt = prepareSystemPrompt(
                      mode === 'extraction' ? EXTRACTION_PROMPT : CHAT_SYSTEM_PROMPT
                    );
                    sendMessage(systemPrompt, 'system');
                  }
                }}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Message Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {messages.filter(m => m.role !== 'system').length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BrainCog className="mx-auto h-12 w-12 opacity-50 mb-2" />
                  <p>No messages yet. Start the conversation!</p>
                  <p className="text-sm mt-2 max-w-sm">
                    Ask for a Stable Diffusion prompt or for tips on crafting effective prompts.
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 px-4 py-2">
                <div className="space-y-1">
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Input Area */}
          <div className="p-2 border-t">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask for prompt ideas or help with Stable Diffusion..."
                className="min-h-[50px] resize-none"
                disabled={isProcessing}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                className="h-10 w-10 p-0"
              >
                {isProcessing ?
                  <RefreshCw className="h-4 w-4 animate-spin" /> :
                  <Send className="h-4 w-4" />
                }
              </Button>
            </div>

            {/* Input Helpers */}
            {mode === 'generation' && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInputMessage("Create a detailed Stable Diffusion prompt for ");
                    inputRef.current?.focus();
                  }}
                  className="text-xs"
                >
                  <Image className="h-3 w-3 mr-1" />
                  New Prompt Template
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Prompt Form */}
        <div className="flex flex-col w-1/2 h-full">
          <div className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center">
              <PlusCircle className="h-4 w-4 mr-2" />
              <span className="font-medium">Generated Prompt</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {generatedPrompt ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    Prompt generated! Review and customize it before saving.
                  </AlertDescription>
                </Alert>

                {extractionError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <AlertDescription>{extractionError}</AlertDescription>
                  </Alert>
                )}

                <div className="border-b pb-2">
                  <PromptForm
                    prompt={generatedPrompt}
                    onPromptUpdate={setGeneratedPrompt}
                    availableSamplers={availableSamplers}
                    availableModels={availableModels}
                    availableLoras={availableLoras}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <PlusCircle className="h-12 w-12 mb-4 opacity-30" />
                <p className="mb-2">No prompt generated yet</p>
                <p className="text-sm max-w-xs text-center">
                  Ask the AI to create a prompt for you, and it will appear here for review.
                </p>
              </div>
            )}
          </div>

          {generatedPrompt && (
            <div className="p-2 border-t">
              <Button
                onClick={savePromptToList}
                disabled={isLoadingApiData}
                className="w-full"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Save to Prompt List
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Settings Modal */}
      <AiSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}