import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, BrainCog, Send, RefreshCw, Trash2, Image, ListChecks, CheckCircle, PlusCircle } from 'lucide-react';
import { useAi } from '@/contexts/AiContext';
import { ChatMessage, Prompt } from '@/types';
import { useApi } from '@/contexts/ApiContext';
import { generateUUID } from '@/lib/utils';
import { PromptForm } from '../part-prompt/PromptForm';
import { CHAT_SYSTEM_PROMPT, EXTRACTION_PROMPT } from '@/lib/constantsAI';

export function AiChatConversation() {
  const { messages, isProcessing, error, settings, sendMessage, clearMessages, updateMessageContent } = useAi();

  const { promptsApi, availableSamplers, availableModels, availableLoras, isLoadingApiData } = useApi();

  const [inputMessage, setInputMessage] = useState('');
  const [mode, setMode] = useState<'generation' | 'extraction'>('generation');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  //Prompt creation state
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<Prompt | null>(null);
  const [isExtractingPrompt, setIsExtractingPrompt] = useState(false);
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
      //Fallback to previous JSON block extraction
      const jsonMatch = message.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const extractedData = JSON.parse(jsonMatch[1]);
          createPromptFromData(extractedData);
          return;
        } catch (extractError) {
          console.error('Error parsing JSON from message:', extractError);
        }
      }
      console.error('Response not in expected format:', error);
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
    setShowPromptForm(true);
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
      //Get existing prompts
      const existingPrompts = await promptsApi.getAllPrompts();

      //Add the prompt to the list
      const updatedPrompts = [...existingPrompts, generatedPrompt];
      const success = await promptsApi.saveAllPrompts(updatedPrompts);

      if (success) {
        alert("Prompt saved successfully!");
        setShowPromptForm(false);
        setGeneratedPrompt(null);
      } else {
        alert("Failed to save prompt.");
      }
    } catch (error) {
      console.error("Error saving prompt:", error);
      alert("Failed to save prompt: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  //Render individual message
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    if (isSystem) return null; //Don't show system messages

    return (
      <div
        key={message.id}
        className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
          <div
            className={`rounded-lg p-3 ${isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border'
              }`}
          >
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 mx-1">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Label htmlFor="mode-switch" className="mr-2">
            Mode: {mode === 'generation' ? 'Generation' : 'Extraction'}
          </Label>
          <Switch
            id="mode-switch"
            checked={mode === 'extraction'}
            onCheckedChange={(checked) => {
              setMode(checked ? 'extraction' : 'generation');
              setShowPromptForm(false);
              setGeneratedPrompt(null);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-lg flex items-center">
              <BrainCog className="h-5 w-5 mr-2" />
              {mode === 'generation'
                ? `Chat with ${settings.model}`
                : 'Extract from Stable Diffusion Parameters'
              }
            </CardTitle>
          </CardHeader>

          <div className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Message Area */}
            {messages.filter(m => m.role !== 'system').length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BrainCog className="mx-auto h-12 w-12 opacity-50 mb-2" />
                  <p>No messages yet. Start the conversation!</p>
                  <p className="text-sm mt-2 max-w-sm">
                    {mode === 'generation'
                      ? "Ask for a Stable Diffusion prompt or for tips on crafting effective prompts."
                      : "Paste Stable Diffusion parameters to extract them into a usable prompt."}
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

            {/* Input Area */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === 'generation'
                    ? "Ask for prompt ideas or help with Stable Diffusion..."
                    : "Paste Stable Diffusion parameters here..."
                  }
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

              {/* Action Buttons */}
              <div className="mt-2 flex justify-between items-center">
                <div className="flex items-center text-xs text-muted-foreground">
                  <BrainCog className="h-3 w-3 mr-1" />
                  {isProcessing ? 'Processing...' : `Model: ${settings.model}`}
                </div>

                <div className="flex gap-2">
                  {mode === 'generation' && (
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
                      New Prompt
                    </Button>
                  )}

                  {messages.filter(m => m.role !== 'system').length > 0 && (
                    <Button
                      variant="outline"
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
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Chat
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Prompt Form Card - Only shown when a prompt is generated */}
        {showPromptForm && generatedPrompt ? (
          <Card className="overflow-auto max-h-[600px]">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <ListChecks className="h-4 w-4 mr-2" />
                  Generated Prompt
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPromptForm(false)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 pt-0">
              <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Prompt Generated</AlertTitle>
                <AlertDescription>
                  Review and customize this prompt before saving.
                </AlertDescription>
              </Alert>

              {extractionError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{extractionError}</AlertDescription>
                </Alert>
              )}

              <div className="border p-4 rounded-md overflow-auto">
                <PromptForm
                  prompt={generatedPrompt}
                  onPromptUpdate={setGeneratedPrompt}
                  availableSamplers={availableSamplers}
                  availableModels={availableModels}
                  availableLoras={availableLoras}
                />
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={savePromptToList}
                  disabled={isLoadingApiData}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Save to Prompt List
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-h-[600px]">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-lg flex items-center">
                <ListChecks className="h-4 w-4 mr-2" />
                Prompt Creation
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Image className="h-12 w-12 mb-4 opacity-30" />
                <p className="mb-2">No prompt generated yet</p>
                <p className="text-sm max-w-xs">
                  {mode === 'generation'
                    ? "Ask the AI to create a prompt for you."
                    : "Paste Stable Diffusion parameters to create a prompt."}
                </p>

                {mode === 'generation' && (
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => {
                      setInputMessage("Create a detailed Stable Diffusion prompt for a fantasy landscape with dragons");
                      inputRef.current?.focus();
                    }}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Request Sample Prompt
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}