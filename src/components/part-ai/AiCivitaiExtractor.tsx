import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Link, PlusCircle, RefreshCw, CheckCircle, Wand2 } from 'lucide-react';
import { useAi } from '@/contexts/AiContext';
import { useApi } from '@/contexts/ApiContext';
import { Prompt, LoraConfig } from '@/types';
import { PromptForm } from '../part-prompt/PromptForm';
import { generateUUID } from '@/lib/utils';
import { generateChatCompletion } from '@/services/openAiApi';
import { CIVITAI_EXTRACTION_SYSTEM_PROMPT } from '@/lib/aiConstants';

export function AiCivitaiExtractor() {
  const { isProcessing: isAiProcessing, settings } = useAi();
  const { promptsApi, stableDiffusionApi } = useApi();

  const [inputText, setInputText] = useState('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [extractedPrompt, setExtractedPrompt] = useState<Prompt | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isAiExtracting, setIsAiExtracting] = useState(false);

  //API data for the prompt form
  const [availableSamplers, setAvailableSamplers] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableLoras, setAvailableLoras] = useState<any[]>([]);
  const [isLoadingApiData, setIsLoadingApiData] = useState(false);

  //Load API data for the prompt form
  useEffect(() => {
    const loadApiData = async () => {
      setIsLoadingApiData(true);
      try {
        const [samplers, models, loras] = await Promise.all([
          stableDiffusionApi.getSamplers(),
          stableDiffusionApi.getModels(),
          stableDiffusionApi.getLoras()
        ]);

        setAvailableSamplers(samplers);
        setAvailableModels(models);
        setAvailableLoras(loras);
      } catch (error) {
        console.error('Failed to load API data:', error);
      } finally {
        setIsLoadingApiData(false);
      }
    };

    loadApiData();
  }, []);

  //Find best match for model name in available models
  const findBestModelMatch = (modelName: string): string => {
    if (!modelName || availableModels.length === 0) return availableModels[0] || '';

    //Try exact match first
    if (availableModels.includes(modelName)) return modelName;

    //Try partial match (case insensitive)
    const lowerModelName = modelName.toLowerCase();
    for (const availableModel of availableModels) {
      if (availableModel.toLowerCase().includes(lowerModelName) ||
        lowerModelName.includes(availableModel.toLowerCase())) {
        return availableModel;
      }
    }

    //Default to first available model
    return availableModels[0] || '';
  };

  //Find best match for sampler name in available samplers
  const findBestSamplerMatch = (samplerName: string): string => {
    if (!samplerName || availableSamplers.length === 0) return 'Euler a';

    //Try exact match first
    if (availableSamplers.includes(samplerName)) return samplerName;

    //Try partial match (case insensitive)
    const lowerSamplerName = samplerName.toLowerCase();
    for (const availableSampler of availableSamplers) {
      if (availableSampler.toLowerCase().includes(lowerSamplerName) ||
        lowerSamplerName.includes(availableSampler.toLowerCase())) {
        return availableSampler;
      }
    }

    //Default to Euler a or first available sampler
    return availableSamplers.includes('Euler a') ? 'Euler a' : availableSamplers[0] || 'Euler a';
  };

  //Extract parameters using AI
  const extractParametersWithAI = async (inputText: string) => {
    if (!settings.apiKey) {
      throw new Error('OpenAI API key is required. Please set it in the AI Settings tab.');
    }

    //Create messages for AI
    const messages = [
      { id: '1', role: 'system', content: CIVITAI_EXTRACTION_SYSTEM_PROMPT, timestamp: new Date().toISOString() },
      { id: '2', role: 'user', content: inputText, timestamp: new Date().toISOString() }
    ];

    //Get response from AI
    const response = await generateChatCompletion(
      settings.apiKey,
      settings.model,
      messages,
      0.1, //Lower temperature for more deterministic results
      2000 //Higher token limit to ensure full response
    );

    if (!response) {
      throw new Error('Failed to get a response from the AI.');
    }

    try {
      //Parse JSON response
      let jsonResponse = response;

      //Sometimes the AI returns markdown code blocks, so we need to extract the JSON
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonResponse = jsonMatch[1];
      }

      const extractedData = JSON.parse(jsonResponse);

      //Ensure we have all required properties
      return {
        prompt: extractedData.prompt || '',
        negativePrompt: extractedData.negativePrompt || '',
        seed: typeof extractedData.seed === 'number' ? extractedData.seed : -1,
        steps: typeof extractedData.steps === 'number' ? extractedData.steps : 20,
        sampler: extractedData.sampler || 'Euler a',
        width: typeof extractedData.width === 'number' ? extractedData.width : 512,
        height: typeof extractedData.height === 'number' ? extractedData.height : 512,
        model: extractedData.model || '',
        loras: Array.isArray(extractedData.loras) ? extractedData.loras : [],
        tags: Array.isArray(extractedData.tags) ? extractedData.tags : []
      };
    } catch (error) {
      console.error('Error parsing AI response:', error, 'Response:', response);
      throw new Error('Failed to parse the AI response. Please try again.');
    }
  };

  const handleExtractFromText = async () => {
    if (!inputText.trim() || isAiExtracting) return;

    setExtractionStatus('processing');
    setExtractionError(null);
    setIsAiExtracting(true);

    try {
      //Extract parameters using AI
      const extractedData = await extractParametersWithAI(inputText);

      //Find best matches for sampler and model in available options
      const matchedSampler = findBestSamplerMatch(extractedData.sampler);
      const matchedModel = findBestModelMatch(extractedData.model);

      //Create a name from the prompt
      let name = 'Extracted Prompt';
      if (extractedData.prompt) {
        const wordsToUse = extractedData.prompt.split(/\s+/).slice(0, 4).join(' ');
        name = wordsToUse + (extractedData.prompt.split(/\s+/).length > 4 ? '...' : '');
      }

      //Create a new prompt from the extracted data
      const newPrompt: Prompt = {
        id: generateUUID(),
        isOpen: true,
        name: name,
        text: extractedData.prompt,
        negativePrompt: extractedData.negativePrompt,
        seed: extractedData.seed,
        steps: extractedData.steps,
        sampler: matchedSampler,
        model: matchedModel,
        width: extractedData.width,
        height: extractedData.height,
        runCount: 1,
        tags: extractedData.tags,
        loras: extractedData.loras,
        currentRun: 0,
        status: 'idle',
      };

      setExtractedPrompt(newPrompt);
      setExtractionStatus('success');
    } catch (err) {
      console.error('Error extracting from text:', err);
      setExtractionStatus('error');
      setExtractionError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!extractedPrompt) return;

    try {
      //Get existing prompts
      const existingPrompts = await promptsApi.getAllPrompts();

      //Add the extracted prompt to the list
      const updatedPrompts = [...existingPrompts, extractedPrompt];
      const success = await promptsApi.saveAllPrompts(updatedPrompts);

      if (success) {
        alert("Prompt created successfully! You can find it in the Prompts tab.");
        resetExtraction();
      } else {
        alert("Failed to create prompt. Please try again.");
      }
    } catch (error) {
      console.error("Error creating prompt:", error);
      alert("Failed to create prompt. Please try again.");
    }
  };

  const resetExtraction = () => {
    setInputText('');
    setExtractedPrompt(null);
    setExtractionStatus('idle');
    setExtractionError(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Wand2 className="h-5 w-5 mr-2" />
            AI-Powered Prompt Extraction
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="promptText">Stable Diffusion Parameters</Label>
            <Textarea
              id="promptText"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste generation parameters from Stable Diffusion or Civitai here..."
              className="h-48 font-mono text-sm"
              disabled={isAiExtracting || isAiProcessing}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleExtractFromText}
                disabled={!inputText.trim() || isAiExtracting || isAiProcessing || !settings.apiKey}
                className="ml-auto"
              >
                {isAiExtracting ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Extract with AI
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The AI will analyze the text and extract prompt parameters automatically. Make sure you've configured your OpenAI API key in the Settings tab.
            </p>
          </div>

          {isAiExtracting && (
            <div className="py-4 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p>AI is analyzing and extracting parameters...</p>
            </div>
          )}

          {(extractionStatus === 'error' || extractionError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {extractionError || 'Failed to extract parameters from the provided text. Please check the format and try again.'}
              </AlertDescription>
            </Alert>
          )}

          {!settings.apiKey && (
            <Alert variant="warning" className="bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>API Key Required</AlertTitle>
              <AlertDescription>
                You need to set an OpenAI API key in the AI Settings tab to use this feature.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {extractionStatus === 'success' && extractedPrompt && (
        <Card className="p-4 overflow-auto">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Extracted Prompt</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetExtraction}>
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSavePrompt}
                disabled={isLoadingApiData}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Save to Prompts
              </Button>
            </div>
          </div>

          <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              AI successfully extracted prompt parameters.
            </AlertDescription>
          </Alert>

          <div className="mt-4 border p-4 rounded-md overflow-auto">
            <PromptForm
              prompt={extractedPrompt}
              onPromptUpdate={setExtractedPrompt}
              availableSamplers={availableSamplers}
              availableModels={availableModels}
              availableLoras={availableLoras}
            />
          </div>
        </Card>
      )}
    </div>
  );
}