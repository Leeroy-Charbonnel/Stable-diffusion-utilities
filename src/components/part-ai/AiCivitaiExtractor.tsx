import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Link, PlusCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { useAi } from '@/contexts/AiContext';
import { Prompt, LoraConfig } from '@/types';

export function AiCivitaiExtractor() {
  const {
    isProcessing,
    error
  } = useAi();

  const [inputText, setInputText] = useState('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [extractedPrompt, setExtractedPrompt] = useState<Prompt | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const parseStableDiffusionParams = (text: string) => {
    //Extract prompt and negative prompt
    const promptMatch = text.match(/(.*?)(?=Negative prompt:|Resources used|$)/s);
    const negativePromptMatch = text.match(/Negative prompt:(.*?)(?=Steps:|Resources used|$)/s);

    //Extract parameters
    const seedMatch = text.match(/Seed: (\d+)/);
    const stepsMatch = text.match(/Steps: (\d+)/);
    const samplerMatch = text.match(/Sampler: ([^,]+)/);
    const sizeMatch = text.match(/Size: (\d+)x(\d+)/);
    const cfgMatch = text.match(/CFG scale: ([0-9.]+)/);

    //Extract model/checkpoint and loras
    let model = '';
    const loras: LoraConfig[] = [];

    //Parse Civitai format resources (newer format)
    if (text.includes('Resources used') || text.includes('Checkpoint')) {
      //First try to find the main model/checkpoint
      const checkpointSection = text.match(/([^\n]+)\s+Checkpoint\s+([^\n]+)/);
      if (checkpointSection) {
        model = checkpointSection[1].trim();
      }

      //Extract all LoRAs using regex pattern
      const loraPattern = /\* ([^*\n]+?)\s+LoRA\s+([0-9.]+)\s+([^\n]+)/g;
      const loraMatches = Array.from(text.matchAll(loraPattern));

      loraMatches.forEach(match => {
        loras.push({
          name: match[1].trim(),
          weight: parseFloat(match[2])
        });
      });
    } else {
      //Try standard format
      const modelMatch = text.match(/Model: ([^,\n]+)/);
      if (modelMatch) {
        model = modelMatch[1].trim();
      }

      //Extract loras from standard format
      const loraMatches = Array.from(text.matchAll(/<lora:([^:]+):([0-9.]+)>/g));
      loraMatches.forEach(match => {
        loras.push({
          name: match[1],
          weight: parseFloat(match[2])
        });
      });
    }

    return {
      prompt: promptMatch ? promptMatch[1].trim() : '',
      negativePrompt: negativePromptMatch ? negativePromptMatch[1].trim() : '',
      seed: seedMatch ? parseInt(seedMatch[1]) : -1,
      steps: stepsMatch ? parseInt(stepsMatch[1]) : 20,
      sampler: samplerMatch ? samplerMatch[1].trim() : 'Euler a',
      width: sizeMatch ? parseInt(sizeMatch[1]) : 512,
      height: sizeMatch ? parseInt(sizeMatch[2]) : 512,
      cfg: cfgMatch ? parseFloat(cfgMatch[1]) : 7,
      model: model,
      loras
    };
  };

  const handleExtractFromText = async () => {
    if (!inputText.trim() || isProcessing) return;

    setExtractionStatus('processing');
    setExtractionError(null);

    try {
      //Parse the input text
      const params = parseStableDiffusionParams(inputText);

      //Create a new prompt from the extracted data
      const newPrompt: Prompt = {
        id: crypto.randomUUID(),
        isOpen: true,
        name: `Extracted Prompt ${new Date().toLocaleTimeString()}`,
        text: params.prompt,
        negativePrompt: params.negativePrompt,
        seed: params.seed,
        steps: params.steps,
        sampler: params.sampler,
        model: params.model,
        width: params.width,
        height: params.height,
        runCount: 1,
        tags: [],
        loras: params.loras,
        currentRun: 0,
        status: 'idle',
      };

      setExtractedPrompt(newPrompt);
      setExtractionStatus('success');
    } catch (err) {
      console.error('Error extracting from text:', err);
      setExtractionStatus('error');
      setExtractionError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const resetExtraction = () => {
    setInputText('');
    setExtractedPrompt(null);
    setExtractionStatus('idle');
    setExtractionError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Link className="h-5 w-5 mr-2" />
          Extract Prompt from Generation Info
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="promptText">Generation Parameters</Label>
          <Textarea
            id="promptText"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste generation parameters here..."
            className="h-48 font-mono text-sm"
            disabled={isProcessing || extractionStatus === 'processing'}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleExtractFromText}
              disabled={!inputText.trim() || isProcessing || extractionStatus === 'processing'}
              className="ml-auto"
            >
              {extractionStatus === 'processing' ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-2" />
              )}
              Extract Parameters
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste the complete generation info from Stable Diffusion to extract parameters automatically.
          </p>
        </div>

        {extractionStatus === 'processing' && (
          <div className="py-4 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p>Extracting parameters...</p>
          </div>
        )}

        {(extractionStatus === 'error' || error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {extractionError || error || 'Failed to extract parameters from the provided text. Please check the format and try again.'}
            </AlertDescription>
          </Alert>
        )}

        {extractionStatus === 'success' && extractedPrompt && (
          <div className="space-y-4">
            <Alert className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Successfully extracted prompt parameters.
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
                        setInputText('');
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
  );
}