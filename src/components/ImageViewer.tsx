// src/components/ImageViewer.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Plus,
  Copy,
  TerminalSquare,
  FileDown,
  RefreshCw,
  Repeat,
  Folder,
  ChevronDown,
  FolderOpen,
  CheckSquare,
  MoreVertical
} from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';
import { GeneratedImage, Prompt } from '@/types';
import { exportAllData } from '@/lib/fileSystemApi';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { STORAGE_KEY } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getAllPrompts, saveAllPrompts } from '@/services/promptsApi';

export function ImageViewer() {
  const { generatedImages, getImageData, deleteImage, updateImageTags, refreshImages } = useApi();
  const [filteredImages, setFilteredImages] = useState<GeneratedImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [promptCopied, setPromptCopied] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [createPromptDialogOpen, setCreatePromptDialogOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [imageDataCache, setImageDataCache] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<string[]>(['default']);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('default');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);

  // Ref for the context menu click handler
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Load image data for a specific image
  const loadImageData = useCallback(async (imageId: string) => {
    if (imageDataCache[imageId]) {
      return imageDataCache[imageId];
    }

    try {
      const data = await getImageData(imageId);
      if (data) {
        setImageDataCache(prev => ({ ...prev, [imageId]: data }));
        return data;
      }
    } catch (error) {
      console.error(`Error loading image ${imageId}:`, error);
    }

    return null;
  }, [imageDataCache, getImageData]);

  // Refresh images
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshImages();
      // Clear image data cache
      setImageDataCache({});
      // Also, scan for folders
      scanForFolders();
    } catch (error) {
      console.error('Error refreshing images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Scan for available folders
  const scanForFolders = useCallback(() => {
    // Extract folders from image paths
    const folders = new Set<string>(['default']);
    generatedImages.forEach(img => {
      const folder = img.path.includes('/') ? img.path.split('/')[0] : 'default';
      folders.add(folder);
    });
    setAvailableFolders(Array.from(folders).sort());
  }, [generatedImages]);

  // Open output folder
  const openOutputFolder = () => {
    // Using Electron-like approach, but this would need a proper backend implementation
    try {
      // This is a placeholder - would need actual implementation
      // In a real app, you'd make a request to the server to open the folder
      fetch('/api/open-folder', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
          if (!data.success) {
            console.error('Failed to open folder');
          }
        })
        .catch(error => {
          console.error('Error opening folder:', error);
        });
    } catch (error) {
      console.error('Error opening folder:', error);
    }
  };

  // Handle moving images to a folder
  const moveImagesToFolder = async (imageIds: string[], folder: string) => {
    setIsLoading(true);
    try {
      // In a real app, you'd make a request to move the files
      // For now, we'll just update the metadata path

      // Process each image
      for (const imageId of imageIds) {
        const image = generatedImages.find(img => img.id === imageId);
        if (image) {
          const currentPath = image.path;
          const filename = currentPath.includes('/') ? currentPath.split('/').pop()! : currentPath;
          const newPath = folder === 'default' ? filename : `${folder}/${filename}`;

          // Update image metadata with new path
          await updateImageMetadata(imageId, { path: newPath });
        }
      }

      // Refresh after moving
      await refreshImages();
      setSelectedImages([]);
    } catch (error) {
      console.error('Error moving images:', error);
    } finally {
      setIsLoading(false);
      setFolderDialogOpen(false);
    }
  };

  // Update image metadata
  const updateImageMetadata = async (imageId: string, updates: Partial<GeneratedImage>) => {
    try {
      // This would need to be implemented in your API
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update image metadata: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating image metadata:', error);
      return false;
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) return;

    setIsLoading(true);
    try {
      // Delete each selected image
      for (const imageId of selectedImages) {
        await deleteImage(imageId);
      }

      // Clear selection
      setSelectedImages([]);
    } catch (error) {
      console.error('Error deleting images:', error);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  // Select all images
  const selectAllImages = () => {
    if (selectedImages.length === filteredImages.length) {
      // If all are selected, deselect all
      setSelectedImages([]);
    } else {
      // Otherwise, select all filtered images
      setSelectedImages(filteredImages.map(img => img.id));
    }
  };

  // Check if an image is in a specific folder
  const isImageInFolder = (image: GeneratedImage, folder: string) => {
    if (folder === 'default') {
      return !image.path.includes('/');
    }
    return image.path.startsWith(`${folder}/`);
  };

  // Get image folder
  const getImageFolder = (image: GeneratedImage) => {
    return image.path.includes('/')
      ? image.path.split('/')[0]
      : 'default';
  };

  //Extract all unique tags from images
  useEffect(() => {
    const tags = new Set<string>();
    generatedImages.forEach(img => {
      img.tags?.forEach(tag => tags.add(tag));
    });
    setAvailableTags(Array.from(tags).sort());

    // Also scan for folders
    scanForFolders();
  }, [generatedImages, scanForFolders]);

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

  // Handle clicks outside context menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Preload images when filtered images change
  useEffect(() => {
    // Preload the first few images
    const preloadCount = Math.min(9, filteredImages.length);
    const preloadImages = async () => {
      for (let i = 0; i < preloadCount; i++) {
        await loadImageData(filteredImages[i].id);
      }
    };

    preloadImages();
  }, [filteredImages, loadImageData]);

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
    if (!selectedImage) return;

    try {
      setIsLoading(true);
      const success = await deleteImage(selectedImage.id);

      if (success) {
        // Remove from cache
        const newCache = { ...imageDataCache };
        delete newCache[selectedImage.id];
        setImageDataCache(newCache);
      } else {
        console.error(`Failed to delete image ${selectedImage.id}`);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedImage(null);
      setIsLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!tagInput.trim() || !selectedImage) return;

    try {
      const newTags = [...selectedImage.tags];
      if (!newTags.includes(tagInput.trim())) {
        newTags.push(tagInput.trim());
        const success = await updateImageTags(selectedImage.id, newTags);

        if (success) {
          setTagInput('');
        }
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedImage) return;

    try {
      const newTags = selectedImage.tags.filter(t => t !== tag);
      await updateImageTags(selectedImage.id, newTags);
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  const handleDownload = () => {
    if (!selectedImage) return;

    const imageData = imageDataCache[selectedImage.id];
    if (imageData) {
      //Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = imageData;
      link.download = selectedImage.filename;
      link.click();
    }
  };

  const handleCopyPrompt = () => {
    if (!selectedImage) return;

    navigator.clipboard.writeText(selectedImage.prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      if (await exportAllData()) {
        setShowExportSuccess(true);
        setTimeout(() => setShowExportSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePrompt = async () => {
    if (!selectedImage || !newPromptName.trim()) return;

    try {
      setIsLoading(true);

      // Get existing prompts
      const existingPrompts = await getAllPrompts();

      // Create a new prompt based on the selected image
      const newPrompt: Prompt = {
        id: crypto.randomUUID(),
        name: newPromptName.trim(),
        text: selectedImage.prompt,
        negativePrompt: selectedImage.negativePrompt,
        seed: selectedImage.seed,
        steps: selectedImage.steps,
        sampler: selectedImage.sampler,
        width: selectedImage.width,
        height: selectedImage.height,
        runCount: 1,
        tags: [...selectedImage.tags],
      };

      // Add new prompt
      existingPrompts.push(newPrompt);

      // Save to server
      const success = await saveAllPrompts(existingPrompts);

      if (!success) {
        console.error('Failed to save prompt');
        return;
      }

      // Close dialogs
      setCreatePromptDialogOpen(false);
      setDetailDialogOpen(false);
      setSelectedImage(null);
      setNewPromptName('');
    } catch (error) {
      console.error('Error creating prompt:', error);
    } finally {
      setIsLoading(false);
    }
  };


  // Updated handleReRunImage function to use the file-based API
  const handleReRunImage = async (image: GeneratedImage) => {
    try {
      setIsLoading(true);

      // Get existing prompts
      const existingPrompts = await getAllPrompts();

      // Create a new prompt based on the image
      const newPrompt: Prompt = {
        id: crypto.randomUUID(),
        name: `Rerun: ${image.prompt.substring(0, 20)}...`,
        text: image.prompt,
        negativePrompt: image.negativePrompt,
        seed: image.seed,
        steps: image.steps,
        sampler: image.sampler,
        width: image.width,
        height: image.height,
        runCount: 1,
        tags: [...image.tags],
      };

      // Add new prompt
      existingPrompts.push(newPrompt);

      // Save to server
      const success = await saveAllPrompts(existingPrompts);

      if (!success) {
        console.error('Failed to save prompt');
        return;
      }

      // Navigate to prompts tab
      const promptsButton = document.querySelector('button[data-tab="prompts"]');
      if (promptsButton) {
        (promptsButton as HTMLButtonElement).click();
      }
    } catch (error) {
      console.error('Error re-running image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageClick = async (image: GeneratedImage) => {
    // Load image data if not already loaded
    if (!imageDataCache[image.id]) {
      await loadImageData(image.id);
    }

    setSelectedImage(image);
    setDetailDialogOpen(true);
  };

  const handleContextMenu = (e: React.MouseEvent, imageId: string) => {
    e.preventDefault();
    // Add to selection if not already selected
    if (!selectedImages.includes(imageId)) {
      setSelectedImages(prev => [...prev, imageId]);
    }

    // Set context menu position
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  //If there are no images
  if (generatedImages.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Image Gallery</h2>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={openOutputFolder} variant="outline">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open Folder
            </Button>
            <Button onClick={handleExportData} variant="outline" disabled={isLoading}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Images Found</h3>
            <p className="text-muted-foreground">
              Generate some images using the Prompts tab to see them here.
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
          <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={openOutputFolder} variant="outline">
            <FolderOpen className="mr-2 h-4 w-4" />
            Open Folder
          </Button>
          <Button onClick={handleExportData} variant="outline" disabled={isLoading}>
            <FileDown className="mr-2 h-4 w-4" />
            Export Data
          </Button>
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

      {showExportSuccess && (
        <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Export Successful</AlertTitle>
          <AlertDescription>
            All image data has been exported successfully.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1">
          {availableTags.length > 0 && (
            <div>
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
        </div>

        <div className="ml-4 flex items-center">
          <Checkbox
            id="select-all"
            checked={selectedImages.length > 0 && selectedImages.length === filteredImages.length}
            className="mr-2"
            onClick={selectAllImages}
          />
          <label htmlFor="select-all" className="text-sm cursor-pointer">
            {selectedImages.length === 0
              ? "Select All"
              : selectedImages.length === filteredImages.length
                ? "Deselect All"
                : `Selected ${selectedImages.length}`}
          </label>

          {selectedImages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFolderDialogOpen(true)}
              className="ml-2"
            >
              <Folder className="h-4 w-4 mr-1" />
              Move to Folder
            </Button>
          )}

          {selectedImages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="ml-2 text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete ({selectedImages.length})
            </Button>
          )}
        </div>
      </div>

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
            const imageFolder = getImageFolder(image);

            return (
              <Card
                key={image.id}
                className={`overflow-hidden group relative ${selectedImages.includes(image.id) ? 'ring-2 ring-primary' : ''
                  }`}
                onContextMenu={(e) => handleContextMenu(e, image.id)}
              >
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedImages.includes(image.id)}
                    className="h-5 w-5 bg-background/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleImageSelection(image.id);
                    }}
                  />
                </div>

                <div className="absolute top-2 right-2 z-10">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-background/80 rounded-full">
                        <Folder className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48" align="end">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Move to folder</h4>
                        <div className="space-y-1">
                          {availableFolders.map(folder => (
                            <div
                              key={folder}
                              className={`text-sm px-2 py-1.5 rounded cursor-pointer flex items-center ${imageFolder === folder
                                  ? 'bg-accent text-accent-foreground'
                                  : 'hover:bg-accent hover:text-accent-foreground'
                                }`}
                              onClick={() => {
                                if (imageFolder !== folder) {
                                  moveImagesToFolder([image.id], folder);
                                }
                              }}
                            >
                              {imageFolder === folder && <CheckSquare className="mr-2 h-4 w-4" />}
                              {folder}
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="relative aspect-square">
                  {imageDataCache[image.id] ? (
                    <img
                      src={imageDataCache[image.id]}
                      alt={image.prompt}
                      className="object-cover w-full h-full cursor-pointer"
                      onClick={() => handleImageClick(image)}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center w-full h-full bg-muted cursor-pointer"
                      onClick={() => handleImageClick(image)}
                    >
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleImageClick(image)}
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-accent"
                      onClick={() => handleReRunImage(image)}
                    >
                      <Repeat className="h-4 w-4 mr-1" />
                      Re-run
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
                  <div className="flex justify-between w-full items-start mb-2">
                    <p className="text-sm line-clamp-2 font-medium">
                      {image.prompt.substring(0, 100)}
                      {image.prompt.length > 100 ? "..." : ""}
                    </p>
                  </div>

                  <div className="flex justify-between w-full">
                    {imageFolder !== 'default' && (
                      <Badge variant="outline" className="mr-1">
                        <Folder className="h-3 w-3 mr-1" />
                        {imageFolder}
                      </Badge>
                    )}

                    <div className="flex-1" />

                    {image.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 justify-end">
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
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Context Menu */}
      {contextMenuPosition && (
        <div
          ref={contextMenuRef}
          className="fixed bg-background border rounded-md shadow-md py-1 z-50"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`
          }}
        >
          <div className="hover:bg-accent px-3 py-1.5 cursor-pointer" onClick={() => {
            setFolderDialogOpen(true);
          }}>
            <Folder className="h-4 w-4 inline-block mr-2" />
            Move to folder ({selectedImages.length})
          </div>
          <div className="hover:bg-accent px-3 py-1.5 cursor-pointer text-destructive" onClick={() => {
            setDeleteDialogOpen(true);
          }}>
            <Trash2 className="h-4 w-4 inline-block mr-2" />
            Delete ({selectedImages.length})
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>
            {selectedImages.length > 1
              ? `Are you sure you want to delete ${selectedImages.length} images?`
              : 'Are you sure you want to delete this image?'
            } This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={selectedImages.length > 1 ? handleBulkDelete : handleDeleteImage}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="folder-select" className="text-sm font-medium">
                Select Destination Folder
              </label>
              <Select
                value={selectedFolder}
                onValueChange={setSelectedFolder}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  {availableFolders.map(folder => (
                    <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center">
              <Input
                id="new-folder"
                placeholder="Or create new folder"
                className="flex-1"
                onChange={(e) => {
                  if (e.target.value && !availableFolders.includes(e.target.value)) {
                    setSelectedFolder(e.target.value);
                  }
                }}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Moving {selectedImages.length} {selectedImages.length === 1 ? 'image' : 'images'} to folder.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => moveImagesToFolder(selectedImages, selectedFolder)}
              disabled={isLoading || !selectedFolder}
            >
              {isLoading ? 'Moving...' : 'Move'}
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
                {imageDataCache[selectedImage.id] ? (
                  <img
                    src={imageDataCache[selectedImage.id]}
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
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium mb-1">Prompt</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPrompt}
                      className="h-6 px-2"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      {promptCopied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <p className="text-sm">{selectedImage.prompt}</p>

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
                    <div>
                      <h3 className="text-xs font-medium">Folder</h3>
                      <p className="text-sm">
                        {getImageFolder(selectedImage)}
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
            <Button
              variant="outline"
              onClick={() => {
                setNewPromptName(selectedImage?.prompt.substring(0, 30) + '...' || 'New Prompt');
                setCreatePromptDialogOpen(true);
              }}
            >
              <TerminalSquare className="h-4 w-4 mr-2" />
              Create Prompt
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedImage) {
                  handleReRunImage(selectedImage);
                  setDetailDialogOpen(false);
                }
              }}
            >
              <Repeat className="h-4 w-4 mr-2" />
              Re-run Image
            </Button>
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

      {/* Create Prompt Dialog */}
      <Dialog open={createPromptDialogOpen} onOpenChange={setCreatePromptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="prompt-name" className="text-sm font-medium">
                Prompt Name
              </label>
              <Input
                id="prompt-name"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                placeholder="Enter prompt name"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This will create a new prompt using the settings from this image.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePromptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePrompt} disabled={!newPromptName.trim()}>
              Create Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}