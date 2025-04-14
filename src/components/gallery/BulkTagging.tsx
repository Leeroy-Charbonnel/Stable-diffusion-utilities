// src/components/gallery/BulkTagging.tsx
import React, { useState } from 'react';
import { useImages } from '../../context/ImageContext';
import { ImageWithBlob } from '../../types/image';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { TagInput } from '../tag/TagInput';
import { ScrollArea } from '../ui/scroll-area';
import { Tag, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '../ui/badge';

interface BulkTaggingProps {
  images: ImageWithBlob[];
  onClose: () => void;
  isOpen: boolean;
}

export const BulkTagging: React.FC<BulkTaggingProps> = ({ 
  images, 
  onClose, 
  isOpen 
}) => {
  const { addTagToImage, removeTagFromImage } = useImages();
  const [selectedImages, setSelectedImages] = useState<ImageWithBlob[]>(images);
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
  const [tagsToRemove, setTagsToRemove] = useState<string[]>([]);
  
  // Get all distinct tags from selected images
  const getCommonTags = () => {
    const tagCounts = new Map<string, number>();
    
    selectedImages.forEach(image => {
      image.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count); // Sort by popularity
  };
  
  const commonTags = getCommonTags();
  
  const handleSelectImage = (image: ImageWithBlob, checked: boolean) => {
    if (checked) {
      setSelectedImages(prev => [...prev, image]);
    } else {
      setSelectedImages(prev => prev.filter(img => img.id !== image.id));
    }
  };
  
  const handleSelectAll = () => {
    if (selectedImages.length === images.length) {
      // Deselect all
      setSelectedImages([]);
    } else {
      // Select all
      setSelectedImages([...images]);
    }
  };
  
  const handleAddTag = (tag: string) => {
    if (!tagsToAdd.includes(tag)) {
      setTagsToAdd(prev => [...prev, tag]);
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    setTagsToAdd(prev => prev.filter(t => t !== tag));
  };
  
  const handleAddTagToRemove = (tag: string) => {
    if (!tagsToRemove.includes(tag)) {
      setTagsToRemove(prev => [...prev, tag]);
    }
  };
  
  const handleRemoveTagToRemove = (tag: string) => {
    setTagsToRemove(prev => prev.filter(t => t !== tag));
  };
  
  const applyChanges = () => {
    // Add new tags
    selectedImages.forEach(image => {
      tagsToAdd.forEach(tag => {
        if (!image.tags.includes(tag)) {
          addTagToImage(image.id, tag);
        }
      });
    });
    
    // Remove tags
    selectedImages.forEach(image => {
      tagsToRemove.forEach(tag => {
        if (image.tags.includes(tag)) {
          removeTagFromImage(image.id, tag);
        }
      });
    });
    
    // Close the dialog
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag size={18} /> Bulk Tag Editor
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-[calc(90vh-8rem)] gap-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSelectAll}
              className="gap-1"
            >
              <Checkbox 
                checked={selectedImages.length === images.length} 
                className="mr-1"
              />
              {selectedImages.length === images.length ? 'Deselect All' : 'Select All'}
            </Button>
            
            <div className="text-sm">
              Selected <span className="font-medium">{selectedImages.length}</span> of <span className="font-medium">{images.length}</span> images
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-hidden">
            {/* Image selection */}
            <div className="border rounded-md overflow-hidden flex flex-col">
              <div className="p-2 border-b bg-muted/50">
                <h3 className="font-medium">Select Images</h3>
              </div>
              <ScrollArea className="flex-grow">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                  {images.map(image => (
                    <div 
                      key={image.id} 
                      className={`relative border rounded-md overflow-hidden cursor-pointer transition-all ${
                        selectedImages.some(img => img.id === image.id) 
                          ? 'ring-2 ring-primary' 
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      onClick={() => handleSelectImage(
                        image, 
                        !selectedImages.some(img => img.id === image.id)
                      )}
                    >
                      <div className="absolute top-1 left-1 z-10">
                        <Checkbox 
                          checked={selectedImages.some(img => img.id === image.id)} 
                          className="bg-background/80"
                        />
                      </div>
                      <div className="aspect-square w-full">
                        {(image.url || image.blob) ? (
                          <img
                            src={image.url || (image.blob ? URL.createObjectURL(image.blob) : '')}
                            alt={image.prompt.substring(0, 30)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            Loading...
                          </div>
                        )}
                      </div>
                      
                      {image.tags.length > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-background/80 p-1 text-xs truncate">
                          {image.tags.slice(0, 3).join(', ')}
                          {image.tags.length > 3 && '...'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Tag management */}
            <div className="flex flex-col gap-4">
              {/* Add tags section */}
              <div className="border rounded-md overflow-hidden flex flex-col">
                <div className="p-2 border-b bg-muted/50 flex justify-between items-center">
                  <h3 className="font-medium">Add Tags</h3>
                  {tagsToAdd.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setTagsToAdd([])}
                      className="h-auto py-1 px-2"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="p-3">
                  <TagInput
                    tags={tagsToAdd}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                    placeholder="Add tags to selected images..."
                  />
                </div>
              </div>
              
              {/* Remove tags section */}
              <div className="border rounded-md overflow-hidden flex flex-col">
                <div className="p-2 border-b bg-muted/50 flex justify-between items-center">
                  <h3 className="font-medium">Remove Tags</h3>
                  {tagsToRemove.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setTagsToRemove([])}
                      className="h-auto py-1 px-2"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="p-3">
                  <TagInput
                    tags={tagsToRemove}
                    onAddTag={handleAddTagToRemove}
                    onRemoveTag={handleRemoveTagToRemove}
                    placeholder="Remove tags from selected images..."
                  />
                </div>
              </div>
              
              {/* Common tags */}
              <div className="border rounded-md overflow-hidden flex flex-col">
                <div className="p-2 border-b bg-muted/50">
                  <h3 className="font-medium">Common Tags</h3>
                  <p className="text-xs text-muted-foreground">Click to add or remove</p>
                </div>
                <ScrollArea className="p-3 max-h-36">
                  <div className="flex flex-wrap gap-1">
                    {commonTags.length > 0 ? (
                      commonTags.map(({ tag, count }) => (
                        <Badge 
                          key={tag} 
                          variant="outline" 
                          className="cursor-pointer flex gap-1 items-center"
                          onClick={() => {
                            // If already in tagsToRemove, remove it from there
                            if (tagsToRemove.includes(tag)) {
                              handleRemoveTagToRemove(tag);
                            }
                            // If already in tagsToAdd, remove it
                            else if (tagsToAdd.includes(tag)) {
                              handleRemoveTag(tag);
                              // Also add to tagsToRemove
                              handleAddTagToRemove(tag);
                            } 
                            // Otherwise add to tagsToAdd
                            else {
                              handleAddTag(tag);
                            }
                          }}
                        >
                          {tag}
                          <span className="bg-muted text-muted-foreground rounded-full text-xs px-1">
                            {count}/{selectedImages.length}
                          </span>
                          {tagsToAdd.includes(tag) && (
                            <Plus size={12} className="text-green-500" />
                          )}
                          {tagsToRemove.includes(tag) && (
                            <Trash2 size={12} className="text-red-500" />
                          )}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No common tags found</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-auto">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={applyChanges}
              disabled={selectedImages.length === 0 || (tagsToAdd.length === 0 && tagsToRemove.length === 0)}
            >
              Apply Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
