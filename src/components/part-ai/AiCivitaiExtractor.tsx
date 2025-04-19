import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Link, PlusCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { useAi } from '@/contexts/AiContext';
import { Prompt } from '@/types';

export function AiCivitaiExtractor() {
  const {
    isProcessing,
    extractFromCivitai
  } = useAi();

  const [civitaiUrl, setCivitaiUrl] = useState('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [extractedPrompt, setExtractedPrompt] = useState<Prompt | null>(null);

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
          id: crypto.randomUUID(),
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

  return (
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
  );
}