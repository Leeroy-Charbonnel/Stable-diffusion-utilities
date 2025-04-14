// src/components/ImageViewer.tsx
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Tag, 
  Trash2, 
  Image as ImageIcon, 
  XIcon, 
  InfoIcon,
  Download,
  Plus
} from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';
import { GeneratedImage } from '@/types';

export function ImageViewer() {
  const { generatedImages, getImageData, deleteImage, updateImageTags } = useApi();
  const [filteredImages, setFilteredImages] = useState<GeneratedImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  //Extract all unique tags from images
  useEffect(() => {
    const tags = new Set<string>();
    generatedImages.forEach(img => {
      img.tags?.forEach(tag => tags.add(tag));
    });
    setAvailableTags(Array.from(tags).sort());
  }, [generatedImages]);

  //Filter images based on search query and selected tags
  useEffect(() => {
    let filtered = [...generatedImages];
    
    //Search by prompt or tags
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.prompt.toLowerCase().includes(query) ||
          img.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    
    //Filter by selected tags (all selected tags must be present)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((img) =>
        selectedTags.every((tag) => img.tags.includes(tag))
      );
    }
    
    //Sort by creation date, newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setFilteredImages(filtered);
  }, [generatedImages, searchQuery, selectedTags]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const handleDeleteImage = async () => {
    if (selectedImage) {
      await deleteImage(selectedImage.id);
      setDeleteDialogOpen(false);
      setSelectedImage(null);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && selectedImage) {
      const newTags = [...selectedImage.tags];
      if (!newTags.includes(tagInput.trim())) {
        newTags.push(tagInput.trim());
        updateImageTags(selectedImage.id, newTags);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (selectedImage) {
      const newTags = selectedImage.tags.filter(t => t !== tag);
      updateImageTags(selectedImage.id, newTags);
    }
  };

  const handleDownload = () => {
    if (selectedImage) {
      const imageData = getImageData(selectedImage.id);
      if (imageData) {
        //Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = imageData;
        link.download = selectedImage.filename;
        link.click();
      }
    }
  };

  //If there are no images
  if (generatedImages.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Image Gallery</h2>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Images Found</h3>
            <p className="text-muted-foreground">
              Generate some images using the Execute tab to see them here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Image Gallery</h2>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search images..."
              className="pl-8 w-64"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </div>

      {availableTags.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4" />
            <span className="text-sm font-medium">Filter by tags:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTagFilter(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {filteredImages.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <InfoIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Matching Images</h3>
            <p className="text-muted-foreground">
              Try adjusting your search query or tag filters to find images.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredImages.map((image) => {
            const imageData = getImageData(image.id);
            
            return (
              <Card key={image.id} className="overflow-hidden group">
                <div className="relative aspect-square">
                  {imageData ? (
                    <img
                      src={imageData}
                      alt={image.prompt}
                      className="object-cover w-full h-full cursor-pointer"
                      onClick={() => {
                        setSelectedImage(image);
                        setDetailDialogOpen(true);
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-muted">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedImage(image);
                        setDetailDialogOpen(true);
                      }}
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedImage(image);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <CardFooter className="flex flex-col items-start pt-4">
                  <p className="text-sm line-clamp-2 font-medium mb-2">
                    {image.prompt.substring(0, 100)}
                    {image.prompt.length > 100 ? "..." : ""}
                  </p>
                  
                  {image.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {image.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {image.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{image.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this image? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteImage}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Image Details</DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="grid md:grid-cols-2 gap-4 flex-1 overflow-hidden">
              <div className="relative aspect-square mx-auto max-h-[50vh] overflow-hidden">
                {getImageData(selectedImage.id) ? (
                  <img
                    src={getImageData(selectedImage.id)!}
                    alt={selectedImage.prompt}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-muted">
                    <ImageIcon className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <ScrollArea className="h-[50vh]">
                <div className="space-y-4 p-1">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Prompt</h3>
                    <p className="text-sm">{selectedImage.prompt}</p>
                  </div>
                  
                  {selectedImage.negativePrompt && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Negative Prompt</h3>
                      <p className="text-sm">{selectedImage.negativePrompt}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <h3 className="text-xs font-medium">Seed</h3>
                      <p className="text-sm">{selectedImage.seed ?? 'Random'}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium">Steps</h3>
                      <p className="text-sm">{selectedImage.steps}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium">Sampler</h3>
                      <p className="text-sm">{selectedImage.sampler}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium">Size</h3>
                      <p className="text-sm">{selectedImage.width}×{selectedImage.height}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium">Created</h3>
                      <p className="text-sm">
                        {new Date(selectedImage.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedImage.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <XIcon
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                      {selectedImage.tags.length === 0 && (
                        <p className="text-sm text-muted-foreground">No tags</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add a tag"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddTag}
                        disabled={!tagInput.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}