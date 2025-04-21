import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { XIcon, Trash } from 'lucide-react';
import { Prompt } from '@/types';
import { Slider } from "@/components/ui/slider"
import { NumberInput } from '@/components/ui/number-input';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type PromptFormProps = {
  prompt?: Prompt;
  onPromptUpdate: (prompt: Prompt) => void;
  availableSamplers?: string[];
  availableModels?: string[];
  availableLoras?: any[];
  readOnly?: boolean;
};

export function PromptForm({
  prompt,
  onPromptUpdate,
  availableSamplers = [],
  availableModels = [],
  availableLoras = [],
  readOnly = false,
}: PromptFormProps) {

  const [formData, setFormData] = useState<Prompt>(prompt!);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (prompt) { setFormData(prompt); }
  }, [prompt]);

  const handleFormChange = (updatedData: Partial<Prompt>) => {
    if (readOnly) return;

    const newFormData = { ...formData, ...updatedData };
    setFormData(newFormData);
    onPromptUpdate(newFormData); //Parent component should handle debouncing
  };

  const handleChange = (name: string, value: any) => {
    if (readOnly) return;

    if (['seed', 'steps', 'width', 'height', 'runCount'].includes(name)) {
      const numValue = value === '' ? undefined : parseInt(value, 10);
      handleFormChange({ [name]: numValue });
    } else if (name === 'cfgScale') {
      const numValue = value === '' ? undefined : parseFloat(value);
      handleFormChange({ [name]: numValue });
    } else {
      handleFormChange({ [name]: value });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (readOnly) return;
    handleFormChange({ [name]: value });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTags(tagInput.trim());
    }
  };

  const addTags = (tag: string) => {
    if (readOnly) return;
    const tags = tag.split(/\s+/);
    const updatedTags = [...formData.tags];
    tags.forEach(t => { if (!updatedTags.includes(t) && t !== "") updatedTags.push(t); });
    handleFormChange({ tags: updatedTags });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    if (readOnly) return;
    handleFormChange({ tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleLoraSelect = (loraName: string) => {
    if (readOnly) return;

    if (loraName && !formData.loras?.some(l => l.name === loraName)) {
      handleFormChange({ loras: [...(formData.loras || []), { name: loraName, weight: 1.0 }] });
    }
  };

  const removeLora = (loraName: string) => {
    if (readOnly) return;
    handleFormChange({ loras: formData.loras?.filter(l => l.name !== loraName) || [] });
  };

  const updateLoraWeight = (loraName: string, weight: number) => {
    if (readOnly) return;
    handleFormChange({ loras: formData.loras?.map(l => l.name === loraName ? { ...l, weight } : l) || [] });
  };

  const readOnlyCss = "bg-muted/30 border-dashed text-muted-foreground cursor-not-allowed opacity-75";

  return (
    <div className={"space-y-3 rounded-lg p-4 shadow-md border relative overflow-hidden bg-background/50 backdrop-blur-sm"}>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background/20 to-secondary/5 backdrop-blur-md"></div>

      {/* Read only overlay */}
      {/* {readOnly && (<div className={"absolute inset-0 z-10 bg-muted/50 border-dashed text-muted-foreground cursor-not-allowed opacity-100"}></div>)} */}

      {/* Prompt */}
      <div>
        <Textarea id="text" name="text" value={formData.text} onChange={(e) => handleChange('text', e.target.value)}
          placeholder="Enter prompt text..."
          className={"min-h-20"}
          disabled={readOnly}
        />
      </div>

      {/* Negative Prompt */}
      <div>
        <Textarea
          id="negativePrompt"
          name="negativePrompt"
          value={formData.negativePrompt}
          onChange={(e) => handleChange('negativePrompt', e.target.value)}
          placeholder="Enter negative prompt text..."
          className={"min-h-16"}
          disabled={readOnly}
        />
      </div>
      <Separator className='my-2' />

      {/* Number settings */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label htmlFor="seed" className="text-xs pb-1">Seed</Label>
          <Input
            id="seed"
            type="number"
            value={formData.seed !== undefined ? formData.seed : -1}
            onChange={(e) => handleChange('seed', e.target.value)}
            placeholder="Random"
            className={"h-8"}
            disabled={readOnly}
          />
        </div>
        <div>
          <Label htmlFor="steps" className="text-xs pb-1">Steps</Label>
          <NumberInput
            containerClassName="w-auto"
            id="steps"
            value={formData.steps}
            onChange={(e) => handleChange('steps', e)}
            min={1} max={150} className={"h-8"}
            disabled={readOnly}
          />
        </div>
        <div>
          <Label htmlFor="width" className="text-xs pb-1">Width</Label>
          <NumberInput
            id="width"
            value={formData.width}
            onChange={(e) => handleChange('width', e)}
            min={64} max={2048} className={"h-8"}
            disabled={readOnly}
          />
        </div>
        <div>
          <Label htmlFor="height" className="text-xs pb-1">Height</Label>
          <NumberInput
            id="height"
            value={formData.height}
            onChange={(e) => handleChange('height', e)}
            min={64} max={2048} className={"h-8"}
            disabled={readOnly}
          />
        </div>
      </div>


      {/* CFG Scale */}
      <div>
        <div className="flex flex-row items-center gap-2 mb-1">
          <Label htmlFor="cfgScale" className="text-xs text-nowrap mr-5">CFG Scale</Label>
          <NumberInput
            id="cfgScaleInput"
            value={formData.cfgScale || 7}
            onChange={(value) => handleChange('cfgScale', value)}
            min={1} max={30} step={0.1} className={"h-7 w-16 text-sm"}
            disabled={readOnly}
          />
          <Slider
            id="cfgScale"
            min={1} max={30} step={0.1} value={[formData.cfgScale || 7]}
            onValueChange={(values) => handleChange('cfgScale', values[0])}
            disabled={readOnly}
          />
        </div>
      </div>

      <Separator className='my-2' />

      {/* Sampler and Model */}
      <div className="flex gap-2">
        <div className='w-[25%]'>
          <Label htmlFor="sampler" className="text-xs pb-1">Sampler</Label>
          <Select value={formData.sampler} onValueChange={(value) => handleSelectChange('sampler', value)} disabled={readOnly}>
            <SelectTrigger id="sampler" className={"h-8 w-full"} >
              <SelectValue placeholder="Select a sampler" />
            </SelectTrigger>
            <SelectContent>
              {availableSamplers.map((sampler) => (
                <SelectItem key={sampler} value={sampler} title={sampler}>{sampler}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='w-[50%]'>
          <Label htmlFor="model" className="text-xs pb-1">Model</Label>
          <Select value={formData.model} onValueChange={(value) => handleSelectChange('model', value)} disabled={readOnly}>
            <SelectTrigger id="model" className="h-8 w-full" >
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model} value={model} title={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='w-[25%]'>
          <Label htmlFor="runCount" className="text-xs pb-1">Run Count</Label>
          <NumberInput
            id="runCount"
            value={formData.runCount}
            onChange={(e) => handleChange('runCount', e)}
            min={1}
            max={999}
            className={"h-8 w-full"}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </div>
      </div>

      <Separator className='my-2' />

      {/* LoRAs */}
      <div>
        <div className="flex items-center"><Label className="text-xs pb-1">LoRAs</Label></div>

        <div className="mb-2">
          <Select onValueChange={handleLoraSelect} value="" disabled={readOnly}><SelectTrigger className={"h-8"}>
            <SelectValue placeholder="Add a LoRA..." />
          </SelectTrigger>
            <SelectContent>
              {availableLoras.filter((lora) => !formData.loras?.some(existingLora => existingLora.name === lora.name)).map((lora) => (
                <SelectItem key={lora.name} value={lora.name} title={lora.name}>{lora.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.loras && formData.loras.length > 0 && (
          <div className="space-y-1">
            {formData.loras.map((lora) => (
              <div key={lora.name} className="grid grid-cols-2 gap-2 p-1 rounded-md">
                <div className="flex-1 font-medium truncate max-w-full" title={lora.name}>{lora.name}</div>
                <div className="flex items-center gap-1 w-full">
                  <NumberInput
                    value={lora.weight}
                    onChange={(value) => updateLoraWeight(lora.name, value)}
                    min={0} max={2} step={0.1} className={"h-7 w-16 text-sm"}
                    disabled={readOnly}
                  />

                  <Slider
                    value={[lora.weight]}
                    max={2}
                    step={0.1}
                    onValueChange={(value: number[]) => updateLoraWeight(lora.name, value[0])}
                    disabled={readOnly}
                    className={cn("flex-1", readOnly && "opacity-50")}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLora(lora.name)}
                    className="h-6 w-6"
                    disabled={readOnly}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator className='my-2' />

      {/* Tags */}
      <div>
        <Label htmlFor="tags" className="text-xs pb-1">Tags</Label>
        <div className="flex justify-between gap-2 mb-3">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tags (press Enter to add)"
            className={cn("h-8 flex-1", readOnly && readOnlyCss)}
            readOnly={readOnly}
            disabled={readOnly}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => addTags(tagInput)}
            disabled={tagInput === '' || readOnly}
          >
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {formData.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center justify-center gap-1 text-xs py-1">
              {tag}
              {!readOnly && (
                <div className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} >
                  <XIcon size={12} />
                </div>
              )}
            </Badge>
          ))}
        </div>
      </div>
    </div >
  );
}