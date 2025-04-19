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


type PromptFormProps = {
  prompt?: Prompt;
  onPromptUpdate: (prompt: Prompt) => void;
  availableSamplers?: string[];
  availableModels?: string[];
  availableLoras?: any[];
};

export function PromptForm({
  prompt,
  onPromptUpdate,
  availableSamplers = [],
  availableModels = [],
  availableLoras = [],
}: PromptFormProps) {

  const [formData, setFormData] = useState<Prompt>(prompt!);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (prompt) {
      setFormData(prompt);
    }
  }, [prompt]);

  const handleFormChange = (updatedData: Partial<Prompt>) => {
    const newFormData = { ...formData, ...updatedData };
    setFormData(newFormData);
    onPromptUpdate(newFormData);
  };

  const handleChange = (name: string, value: any) => {
    if (['seed', 'steps', 'width', 'height', 'runCount'].includes(name)) {
      const numValue = value === '' ? undefined : parseInt(value, 10);
      handleFormChange({ [name]: numValue });
    } else {
      handleFormChange({ [name]: value });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    handleFormChange({ [name]: value });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTags(tagInput.trim());
    }
  };

  const addTags = (tag: string) => {
    const tags = tag.split(/\s+/);
    const updatedTags = [...formData.tags];
    let hasNewTags = false;

    tags.forEach(t => {
      if (!updatedTags.includes(t) && t !== "") {
        updatedTags.push(t);
        hasNewTags = true;
      }
    });

    if (hasNewTags) {
      handleFormChange({ tags: updatedTags });
    }

    setTagInput('');
  };

  const removeTag = (tag: string) => {
    handleFormChange({ tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleLoraSelect = (loraName: string) => {
    if (loraName && !formData.loras?.some(l => l.name === loraName)) {
      handleFormChange({
        loras: [...(formData.loras || []), { name: loraName, weight: 1.0 }]
      });
    }
  };

  const removeLora = (loraName: string) => {
    handleFormChange({
      loras: formData.loras?.filter(l => l.name !== loraName) || []
    });
  };

  const updateLoraWeight = (loraName: string, weight: number) => {
    handleFormChange({
      loras: formData.loras?.map(l =>
        l.name === loraName ? { ...l, weight } : l
      ) || []
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="relative">
          <Textarea
            id="text"
            name="text"
            value={formData.text}
            onChange={(e) => handleChange('text', e.target.value)}
            placeholder="Enter prompt text..."
            className="min-h-20"
          />
        </div>
      </div>

      <div>
        <div className="relative">
          <Textarea
            id="negativePrompt"
            name="negativePrompt"
            value={formData.negativePrompt}
            onChange={(e) => handleChange('negativePrompt', e.target.value)}
            placeholder="Enter negative prompt text..."
            className="min-h-16"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label htmlFor="seed" className="text-xs pb-1">Seed</Label>
          <Input id="seed" type="number" value={formData.seed !== undefined ? formData.seed : -1} onChange={(e) => handleChange('seed', e.target.value)} placeholder="Random" className="h-8"></Input>
        </div>
        <div>
          <Label htmlFor="steps" className="text-xs pb-1">Steps</Label>
          <NumberInput containerClassName="w-auto" id="steps" value={formData.steps} onChange={(e) => handleChange('steps', e)} required min={1} max={150} className="h-8" />

        </div>
        <div>
          <Label htmlFor="width" className="text-xs pb-1">Width</Label>
          <NumberInput id="width" value={formData.width} onChange={(e) => handleChange('width', e)} required min={64} max={2048} className="h-8" />

        </div>
        <div>
          <Label htmlFor="height" className="text-xs pb-1">Height</Label>
          <NumberInput id="height" value={formData.height} onChange={(e) => handleChange('height', e)} required min={64} max={2048} className="h-8" />
        </div>
      </div>

      <div className="flex gap-2">
        <div className='flex-auto'>
          <Label htmlFor="sampler" className="text-xs pb-1">Sampler</Label>
          <Select value={formData.sampler} onValueChange={(value) => handleSelectChange('sampler', value)}>
            <SelectTrigger id="sampler" className="h-8 w-full">
              <SelectValue placeholder="Select a sampler" />
            </SelectTrigger>
            <SelectContent>
              {availableSamplers.map((sampler) => (<SelectItem key={sampler} value={sampler}>{sampler}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex-auto'>
          <Label htmlFor="model" className="text-xs pb-1">Model</Label>
          <Select value={formData.model || ''} onValueChange={(value) => handleSelectChange('model', value)}>
            <SelectTrigger id="model" className="h-8 w-full">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex-auto'>
          <Label htmlFor="runCount" className="text-xs pb-1">Run Count</Label>
          <NumberInput id="runCount" value={formData.runCount} onChange={(e) => handleChange('runCount', e)} required min={1} max={999} className="h-8" />
        </div>
      </div>

      <div>
        <div className="flex items-center">
          <Label className="text-xs pb-1">LoRAs</Label>
        </div>

        <div className="mb-2">
          <Select onValueChange={handleLoraSelect} value=""><SelectTrigger className="h-8"><SelectValue placeholder="Add a LoRA..." /></SelectTrigger>
            <SelectContent>
              {availableLoras.filter((lora) => !formData.loras?.some(existingLora => existingLora.name === lora.name)).map((lora) => (<SelectItem key={lora.name} value={lora.name}>{lora.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {formData.loras && formData.loras.length > 0 ? (
          <div className="space-y-1">
            {formData.loras.map((lora) => (
              <div key={lora.name} className="grid grid-cols-2 gap-2 p-1 border rounded-md">
                <div className="flex-1 font-medium">{lora.name}</div>
                <div className="flex items-center gap-1 w-full">
                  <span className="text-xs text-muted-foreground w-10">{lora.weight.toFixed(2)}</span>

                  <Slider defaultValue={[lora.weight]} max={2} step={0.1} onValueChange={(value: number[]) => updateLoraWeight(lora.name, value[0])} />


                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLora(lora.name)} className="h-6 w-6" >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No LoRAs added</div>
        )}
      </div>

      <div>
        <Label htmlFor="tags" className="text-xs pb-1">Tags</Label>
        <div className="flex justify-between gap-2 mb-3">
          <Input id="tags" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Add tags (press Enter to add)" className="h-8 flex-1" />
          <Button type="button" variant="default" size="sm" onClick={() => addTags(tagInput)} disabled={tagInput === ''}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {formData.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center justify-center gap-1 text-xs py-1">
              {tag}
              <div className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} >
                <XIcon size={12} />
              </div>

            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}