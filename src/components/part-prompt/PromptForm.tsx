import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { XIcon, Trash, Dice6 } from 'lucide-react';
import { ModelConfig, PromptEditor } from '@/types';
import { Slider } from "@/components/ui/slider"
import { NumberInput } from '@/components/ui/number-input';
import { Separator } from '@/components/ui/separator';
import { DropDownOption, SearchableMultiSelect } from '@/components/ui/dropdown-menu-multi';

type PromptFormProps = {
  prompt: PromptEditor;
  onPromptUpdate: (prompt: PromptEditor) => void;
  availableSamplers: string[];
  availableModels: string[];
  availableLoras: any[];
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
    onPromptUpdate(newFormData);
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

  const handleModelChange = (models: DropDownOption[]) => {
    if (readOnly) return;
    handleFormChange({ models: models as ModelConfig[] });
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
    <div className={"p-4 relative overflow-hidden"}>

      {/* Prompt */}
      <div>
        <Textarea id="text" name="text" value={formData.text} onChange={(e) => handleChange('text', e.target.value)}
          placeholder="Enter prompt text..."
          className={"min-h-20 mb-3"}
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

      <Separator className='mb-0 my-3' />

      {/* Number settings */}
      <div className="grid grid-cols-4 gap-2 m-0">
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


      <Separator className='mb-0 my-3' />

      <div className='flex gap-2 items-center m-0 h-8'>
        <Label htmlFor="sampler" className="w-20 h-8">Model</Label>

        <div className='border-b w-full h-8'>
          <SearchableMultiSelect
            options={availableModels.map(x => { return { value: x, label: x } })}
            placeholder="Select options..."
            searchPlaceholder="Type to search..."
            onChange={handleModelChange}
          />
        </div>

      </div>

      <Separator className='mb-0 my-3' />

      {/* CFG Scale */}
      <div className='flex gap-2 w-full h-8 m-0'>

        <Label htmlFor="sampler" className="text-nowrap h-8 min-w-20">Sampler</Label>

        <Select value={formData.sampler} onValueChange={(value) => handleChange('sampler', value)} disabled={readOnly}>
          <SelectTrigger id="sampler" className={"!h-8 min-w-48"} >
            <SelectValue placeholder="Select a sampler" className='h-16' />
          </SelectTrigger>
          <SelectContent>
            {availableSamplers.map((sampler) => (
              <SelectItem key={sampler} value={sampler} title={sampler}>{sampler}</SelectItem>
            ))}
          </SelectContent>
        </Select>


        <Label htmlFor="cfgScale" className="text-nowrap h-8 w-20">CFG Scale</Label>

        <Slider
          id="cfgScale"
          min={1} max={30} step={0.1} value={[formData.cfgScale || 7]}
          onValueChange={(values) => handleChange('cfgScale', values[0])}
          disabled={readOnly}
          className='h-8'
        />
        <NumberInput
          id="cfgScaleInput"
          value={formData.cfgScale || 7}
          onChange={(value) => handleChange('cfgScale', value)}
          min={1} max={30} step={0.1} className={"h-8 !w-18 text-sm border-0 !bg-transparent border-b"}
          disabled={readOnly}
        />
      </div>

      <Separator className='mb-0 my-3' />

      {/* LoRAs Selector*/}
      <div className='m-0 h-8 mb-2'>

        <div className="flex items-center gap-2"><Label className="pb-2 min-w-20 h-8">LoRAs</Label>

          <Select onValueChange={handleLoraSelect} value="" disabled={readOnly || formData.lorasRandom}>
            <SelectTrigger className={"!h-8 !w-38"}>
              <SelectValue placeholder="Add a LoRA" />
            </SelectTrigger>
            <SelectContent>
              {availableLoras.filter((lora) => !formData.loras?.some(existingLora => existingLora.name === lora.name)).map((lora) => (
                <SelectItem key={lora.name} value={lora.name} title={lora.name}>{lora.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => handleFormChange({ lorasRandom: !formData.lorasRandom })} className='h-8 w-8'>
            <Dice6
              className={`w-6 h-6 ${formData.lorasRandom ? 'text-primary' : 'text-muted-foreground'}`}
            />
          </Button>


        </div>
      </div>



      {formData.loras && formData.loras.length > 0 && (
        <div>
          {formData.loras.map((lora) => (
            <div key={lora.name} className="mb-2 h-8 grid grid-cols-2 gap-2 items-center">
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



                <Slider
                  value={[lora.weight]}
                  min={-2}
                  max={2}
                  step={0.1}
                  onValueChange={(value: number[]) => updateLoraWeight(lora.name, value[0])}
                  disabled={readOnly || lora.random || formData.lorasRandom}
                  className=''
                />
                <NumberInput
                  value={lora.weight}
                  onChange={(value) => updateLoraWeight(lora.name, value)}
                  min={-2} max={2} step={0.1} className={"h-7 w-16 text-sm border-0 !bg-transparent border-b"}
                  disabled={readOnly || lora.random || formData.lorasRandom}
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


      <Separator className='mb-0 my-3' />

      {/* Tags */}
      <div>
        <div className="flex justify-between gap-2 mb-2">
          <Label htmlFor="tags" className="pb-2">Tags</Label>

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