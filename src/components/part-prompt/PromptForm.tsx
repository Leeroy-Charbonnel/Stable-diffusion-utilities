import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { XIcon, Trash, Dice6 } from 'lucide-react';
import { PromptEditor } from '@/types';
import { Slider } from "@/components/ui/slider"
import { NumberInput } from '@/components/ui/number-input';
import { getPromptModel } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu-multi';

type PromptFormProps = {
  prompt: PromptEditor;
  onPromptUpdate: (prompt: PromptEditor) => void;
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

  const [formData, setFormData] = useState<PromptEditor>(prompt!);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (prompt) { setFormData(prompt); }
  }, [prompt]);

  const handleFormChange = (updatedData: Partial<PromptEditor>) => {
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

  const handleModelChange = (model: string) => {
    if (readOnly) return;
    handleFormChange({ models: prompt.models.includes(model) ? prompt.models.filter((m) => m !== model) : [...prompt.models, model] });
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
      handleFormChange({ loras: [...(formData.loras || []), { name: loraName, weight: 1.0, random: false }] });
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

  const toggleLoraRandom = (loraName: string) => {
    if (readOnly) return;
    handleFormChange({ loras: formData.loras?.map(l => l.name === loraName ? { ...l, random: !l.random } : l) || [] });
  }

  return (
    <div className={"space-y-3 rounded-lg p-4 relative overflow-hidden"}>

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
          <Label htmlFor="seed" className="pb-2">Seed</Label>
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
          <Label htmlFor="steps" className="pb-2">Steps</Label>
          <NumberInput
            id="steps"
            value={formData.steps}
            onChange={(e) => handleChange('steps', e)}
            min={1} max={150} className={"h-8"}
            disabled={readOnly}
          />
        </div>
        <div>
          <Label htmlFor="width" className="pb-2">Width</Label>
          <NumberInput
            id="width"
            value={formData.width}
            onChange={(e) => handleChange('width', e)}
            min={8} max={2048} className={"h-8"}
            disabled={readOnly}
          />
        </div>
        <div>
          <Label htmlFor="height" className="pb-2">Height</Label>
          <NumberInput
            id="height"
            value={formData.height}
            onChange={(e) => handleChange('height', e)}
            min={8} max={2048} className={"h-8"}
            disabled={readOnly}
          />
        </div>
      </div>


      {/* CFG Scale */}
      <div>
        <div className="flex flex-row items-center gap-2 mb-1">
          <Label htmlFor="cfgScale" className="text-nowrap mr-5">CFG Scale</Label>
          <NumberInput
            id="cfgScaleInput"
            value={formData.cfgScale || 7}
            onChange={(value) => handleChange('cfgScale', value)}
            min={1} max={30} step={0.1} className={"h-7 w-16 text-sm border-0 !bg-transparent"}
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
          <Label htmlFor="sampler" className="pb-2">Sampler</Label>
          <Select value={formData.sampler} onValueChange={(value) => handleChange('sampler', value)} disabled={readOnly}>
            <SelectTrigger id="sampler" className={"h-16 w-full"} >
              <SelectValue placeholder="Select a sampler" className='h-16' />
            </SelectTrigger>
            <SelectContent>
              {availableSamplers.map((sampler) => (
                <SelectItem key={sampler} value={sampler} title={sampler}>{sampler}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='w-[50%]'>
          <Label htmlFor="model" className="pb-2">
            <div className='w-fit relative'>
              Model
              {prompt.models.length > 1 && (<div className='absolute left-full ml-2 top-0 bg-secondary m-0 text-[10px] rounded-sm w-4 h-4 flex items-center justify-center'>{prompt.models.length}</div>)}
            </div>
          </Label>

          <DropdownMenu forceValue>
            <DropdownMenuTrigger asChild disabled={readOnly} className="h-16 w-full">
              <Button variant="outline">
                <div className='w-full text-left'>{getPromptModel(prompt)}</div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {availableModels.map((model) => (
                <DropdownMenuCheckboxItem
                  checked={prompt?.models.includes(model)}
                  onCheckedChange={() => handleModelChange(model)}
                >
                  {model}
                </DropdownMenuCheckboxItem>

              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className='w-[25%]'>
          <Label htmlFor="runCount" className="pb-2">Run Count</Label>
          <NumberInput
            id="runCount"
            value={formData.runCount}
            onChange={(e) => handleChange('runCount', e)}
            min={1}
            max={999}
            className={"h-16 w-full"}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </div>
      </div>

      <Separator className='my-2' />

      {/* LoRAs */}
      <div>
        <div className="flex items-center gap-2 "><Label className="pb-2">LoRAs</Label>

          <Select onValueChange={handleLoraSelect} value="" disabled={readOnly || formData.lorasRandom}><SelectTrigger className={"h-8"}>
            <SelectValue placeholder="Add a LoRA..." />
          </SelectTrigger>
            <SelectContent>
              {availableLoras.filter((lora) => !formData.loras?.some(existingLora => existingLora.name === lora.name)).map((lora) => (
                <SelectItem key={lora.name} value={lora.name} title={lora.name}>{lora.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => handleFormChange({ lorasRandom: !formData.lorasRandom })} >
            <Dice6
              className={`w-6 h-6 ${formData.lorasRandom ? 'text-primary' : 'text-muted-foreground'}`}
            />
          </Button>

        </div>


        {formData.loras && formData.loras.length > 0 && (
          <div className="space-y-1">
            {formData.loras.map((lora) => (
              <div key={lora.name} className="grid grid-cols-2 gap-2 m-2 items-center">
                <div className={`font-medium truncate ${formData.lorasRandom ? 'text-muted-foreground' : ''}`} title={lora.name}>{lora.name}</div>
                <div className="flex items-center gap-1">

                  <Button
                    disabled={readOnly || formData.lorasRandom} variant="ghost"
                    onClick={() => toggleLoraRandom(lora.name)}
                  >
                    <Dice6
                      className={`w-6 h-6 ${lora.random ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                  </Button>


                  <NumberInput
                    value={lora.weight}
                    onChange={(value) => updateLoraWeight(lora.name, value)}
                    min={0} max={2} step={0.1} className={"h-7 w-12 text-sm border-0 !bg-transparent text-right"}
                    disabled={readOnly || lora.random || formData.lorasRandom}
                  />

                  <Slider
                    value={[lora.weight]}
                    max={2}
                    step={0.1}
                    onValueChange={(value: number[]) => updateLoraWeight(lora.name, value[0])}
                    disabled={readOnly || lora.random || formData.lorasRandom}
                    className='w-3/4'
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLora(lora.name)}
                    className="h-6 w-6"
                    disabled={readOnly || formData.lorasRandom}
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
        <Label htmlFor="tags" className="pb-2">Tags</Label>
        <div className="flex justify-between gap-2 mb-3">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tags (press Enter to add)"
            className={"h-8 flex-1"}
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