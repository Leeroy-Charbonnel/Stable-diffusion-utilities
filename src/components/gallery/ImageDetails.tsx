// src/components/gallery/ImageDetail.tsx
import React, { useState } from 'react';
import { ImageWithBlob } from '../../types/image';
import { useImages } from '../../context/ImageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { TagInput } from '../tag/TagInput';
import { Download, Copy } from 'lucide-react';

interface ImageDetailProps {
  image: ImageWithBlob | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageDetail: React.FC<ImageDetailProps> = ({
  image,
  isOpen,
  onClose,
}) => {
  const { addTagToImage, removeTagFromImage } = useImages();
  const [activeTab, setActiveTab] = useState('details');
  
  if (!image) return null;
  
  const handleAddTag = (tag: string) => {
    addTagToImage(image.id, tag);
  };
  
  const handleRemoveTag = (tag: string) => {
    removeTagFromImage(image.id, tag);
  };
  
  const handleDownload = () => {
    if (image.blob) {
      const url = URL.createObjectURL(image.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (image.url) {
      window.open(image.url, '_blank');
    }
  };
  
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(image.prompt);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Image Details</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(90vh-10rem)] overflow-auto">
          <div className="flex items-center justify-center bg-muted rounded-md overflow-hidden">
            {(image.url || image.blob) ? (
              <img
                src={image.url || (image.blob ? URL.createObjectURL(image.blob) : '')}
                alt={image.prompt.substring(0, 30)}
                className="max-w-full max-h-[60vh] object-contain"
              />
            ) : (
              <div className="w-full h-60 flex items-center justify-center">
                Loading image...
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                <TabsTrigger value="prompt" className="flex-1">Prompt</TabsTrigger>
                <TabsTrigger value="tags" className="flex-1">Tags</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-3 pt-2">
                <div>
                  <p className="text-sm font-medium">Dimensions</p>
                  <p className="text-sm">{image.width} × {image.height}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Seed</p>
                  <p className="text-sm">{image.seed}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Generation Settings</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline">Steps: {image.steps}</Badge>
                    <Badge variant="outline">CFG: {image.cfgScale}</Badge>
                    <Badge variant="outline">Sampler: {image.sampler}</Badge>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm">{new Date(image.createdAt).toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Filename</p>
                  <p className="text-sm font-mono break-all">{image.filename}</p>
                </div>
              </TabsContent>
              
              <TabsContent value="prompt" className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium">Prompt</p>
                    <Button size="sm" variant="ghost" onClick={handleCopyPrompt}>
                      <Copy size={14} className="mr-1" /> Copy
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap border rounded-md p-2 bg-muted/50">
                    {image.prompt}
                  </p>
                </div>
                
                {image.negativePrompt && (
                  <div>
                    <p className="text-sm font-medium">Negative Prompt</p>
                    <p className="text-sm whitespace-pre-wrap border rounded-md p-2 bg-muted/50">
                      {image.negativePrompt}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="tags" className="pt-2">
                <TagInput
                  tags={image.tags}
                  onAddTag={handleAddTag}
                  onRemoveTag={handleRemoveTag}
                  placeholder="Add tags to this image..."
                />
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end">
              <Button onClick={handleDownload} className="gap-1">
                <Download size={16} /> Download
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
