// src/components/part-images/ImageViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Image as ImageIcon, RefreshCw, FolderOpen, Trash2, CheckSquare, FolderClosed, X } from 'lucide-react';
import { useApi } from '@/contexts/contextSD';
import { ImageMetadata, LabelsData, PromptEditor } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { toast } from 'sonner';

//Import our component files
import { FilterPanel } from './FilterPanel';
import { ImageCard } from './ImageCard';
import { ImageDetailsDialog } from './ImageDetailsDialog';
import { usePrompt } from '@/contexts/contextPrompts';
import { generateUUID, getModelLabel } from '@/lib/utils';
import { getImageFromPath, getLabelsData } from '@/services/apiFS';
import { DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER } from '@/lib/constants';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface ImageViewerProps {
  isActiveTab: boolean
}

export function ImageViewer({ isActiveTab }: ImageViewerProps) {
  const { apiFS, isLoading: isApiLoading } = useApi();
  const { addPrompt } = usePrompt();

  const [labelsData, setLabelsData] = useState<LabelsData>({ modelLabels: [], lorasLabels: [] , embeddingsLabels: []});

  //Images arrays
  const [generatedImages, setGeneratedImages] = useState<ImageMetadata[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageMetadata[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  //Filter arrays
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);
  const [availableFolders, setAvailableFolders] = useState<string[]>([DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER]);
  //Filter
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedLoras, setSelectedLoras] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);


  //Query
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');


  const [isLoading, setIsLoading] = useState(false);
  const isCtrlPressedRef = useRef(false);
  const isShiftPressedRef = useRef(false);
  const lastSelectedImageIndexRef = useRef(-1);
  const previousActiveTabRef = useRef(isActiveTab);

  //Image details dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [focusedImageIndex, setFocusedImageIndex] = useState<number>(-1);
  const [focusedImage, setFocusedImage] = useState<ImageMetadata | null>(null);
  const [focusedImageUrl, setFocusedImageUrl] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveFolderDialogOpen, setMoveFolderDialogOpen] = useState(false);
  const [targetFolder, setTargetFolder] = useState<string>(DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER);

  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  //Function to load images from server
  async function loadImagesFromServer() {
    try {
      const labelsData = await getLabelsData();
      setLabelsData(labelsData);

      const loadedImages = await apiFS.getAllImageMetadata();
      // loadedImages.forEach(img => img.promptData.model = getModelLabel(labelsData.modelLabels, img.promptData.model));
      setGeneratedImages(loadedImages);
      console.log(`ImageViewer - Loaded ${loadedImages.length} images`);
    } catch (error) {
      console.error('Failed to load images from server:', error);
    }
  }

  //Load available folders from server
  const loadFolders = async () => {
    try {
      const folders = await apiFS.getFolders();
      setAvailableFolders(folders.sort());
      console.log(`ImageViewer - Loaded ${folders.length} folders`);
    } catch (error) {
      console.error('Failed to load folders:', error);
      setAvailableFolders([DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER]);
    }
  };

  useEffect(() => {
    loadImagesFromServer();
    loadFolders();


    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) isCtrlPressedRef.current = true;
      if (e.shiftKey) isShiftPressedRef.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey) isCtrlPressedRef.current = false;
      if (!e.shiftKey) isShiftPressedRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Auto-refresh when tab becomes active
  useEffect(() => {
    // Check if tab went from inactive to active
    if (isActiveTab && !previousActiveTabRef.current) {
      handleRefresh();
    }

    // Update ref for next check
    previousActiveTabRef.current = isActiveTab;
  }, [isActiveTab]);


  //Refresh images and folders
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadImagesFromServer(),
        loadFolders()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  //Open output folder
  const openOutputFolder = async () => {
    try {
      await apiFS.openOutputFolder();
    } catch (error) {
      console.error('Error opening folder:', error);
    }
  };

  //Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    const toUnselect = selectedImages.includes(imageId);
    const index = getImageIndex(imageId);

    if (isShiftPressedRef.current && lastSelectedImageIndexRef.current !== -1) {
      const startIndex = Math.min(lastSelectedImageIndexRef.current, index);
      const endIndex = Math.max(lastSelectedImageIndexRef.current, index);
      setSelectedImages(prev => [...prev, ...filteredImages.slice(startIndex, endIndex + 1).map(x => x.id)]);
      setSelectedImages(prev => [...new Set(prev)]);
    } else {
      setSelectedImages(prev => toUnselect ? prev.filter(id => id !== imageId) : [...prev, imageId]);
    }
    lastSelectedImageIndexRef.current = !toUnselect ? index : -1;
  };

  //Select all images
  const selectAllImages = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages.map(img => img.id));
    }
    lastSelectedImageIndexRef.current = -1;
  };

  //Navigate between images
  const handleImageNavigation = async (direction: 'prev' | 'next') => {
    if (focusedImageIndex === -1 || filteredImages.length <= 1) return;

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = focusedImageIndex > 0 ? focusedImageIndex - 1 : filteredImages.length - 1;
    } else {
      newIndex = focusedImageIndex < filteredImages.length - 1 ? focusedImageIndex + 1 : 0;
    }

    const image = filteredImages[newIndex];
    setFocusedImageIndex(newIndex);
    setFocusedImage(image);

    if (image.path) {
      const pathUrl = await getImageFromPath(image.path);
      if (pathUrl) {
        setFocusedImageUrl(pathUrl);
        setIsLoading(false);
        return;
      }
    }
  };

  //Extract all unique tags, models, and loras from images
  useEffect(() => {
    const tags = new Set<string>();
    const models = new Set<string>();
    const loras = new Set<string>();

    generatedImages.forEach(img => {
      img.promptData.tags?.forEach(tag => tags.add(tag));
      if (img.promptData.model) { models.add(img.promptData.model); }
      if (img.promptData.loras && img.promptData.loras.length > 0) { img.promptData.loras.forEach(lora => loras.add(lora.name)); }
    });

    setAvailableTags(Array.from(tags).sort());
    setAvailableModels(Array.from(models).sort());
    setAvailableLoras(Array.from(loras).sort());
  }, [generatedImages]);

  //Filter images
  useEffect(() => {
    let filtered = [...generatedImages];
    //Search by prompt, tags, or name
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.promptData.text.toLowerCase().includes(query) ||
          (img.promptData.name && img.promptData.name.toLowerCase().includes(query)) ||
          img.promptData.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    //Filter by selected tags (all selected tags must be present)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((img) => selectedTags.every((tag) => img.promptData.tags.includes(tag)));
    }
    //Filter by selected models
    if (selectedModels.length > 0) {
      filtered = filtered.filter((img) => img.promptData.model && selectedModels.includes(img.promptData.model));
    }
    //Filter by selected loras
    if (selectedLoras.length > 0) {
      filtered = filtered.filter((img) => img.promptData.loras && img.promptData.loras.some((lora) => selectedLoras.includes(lora.name)));
    }
    //Filter by selected folders
    if (selectedFolders.length > 0) {
      filtered = filtered.filter((img) => selectedFolders.includes(img.folder || DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER));
    }
    //Sort by creation date, newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredImages(filtered);
  }, [generatedImages, activeSearchQuery, selectedTags, selectedModels, selectedLoras, selectedFolders]);


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setActiveSearchQuery(searchQuery);
    }
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const toggleModelFilter = (model: string) => {
    setSelectedModels((prev) => prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]);
  };

  const toggleLoraFilter = (lora: string) => {
    setSelectedLoras((prev) => prev.includes(lora) ? prev.filter((l) => l !== lora) : [...prev, lora]);
  };

  const toggleFolderFilter = (folder: string) => {
    setSelectedFolders((prev) => prev.includes(folder) ? prev.filter((f) => f !== folder) : [...prev, folder]);
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedModels([]);
    setSelectedLoras([]);
    setSelectedFolders([]);
    setSearchQuery('');
    setActiveSearchQuery('');
  };

  const handleImageClick = async (image: ImageMetadata) => {

    if (isCtrlPressedRef.current) {
      toggleImageSelection(image.id);
      return;
    }

    const index = getImageIndex(image.id);

    setFocusedImageIndex(index);
    setFocusedImage(image);

    if (image.path) {
      const pathUrl = await getImageFromPath(image.path);
      if (pathUrl) {
        setFocusedImageUrl(pathUrl);
      }
    }
    setDetailsDialogOpen(true);
  };

  const getImageIndex = (imageId: string): number => {
    return filteredImages.findIndex(img => img.id === imageId);
  }


  //Updated to use batch move API
  const handleMoveToFolder = async (imageId: string, folder: string) => {
    handleMovesImagesToFolder([imageId], folder);
  };

  //Updated to use batch move API
  const handleMoveSelectedToFolder = async () => {
    handleMovesImagesToFolder(selectedImages, targetFolder);
  };


  const updateImage = (imageid: string, image: ImageMetadata) => {
    setGeneratedImages(prev => prev.map(img => img.id === imageid ? image : img));
  }

  const handleMovesImagesToFolder = async (imagesId: string[], folder: string) => {

    if (imagesId.length === 0 || !targetFolder) return;
    const moves = filteredImages.filter(img => imagesId.includes(img.id)).map(x => ({
      imageId: x.id,
      oldPath: `${x.folder}/${x.id}.png`,
      newPath: `${folder}/${x.id}.png`
    }));

    setIsLoading(true);
    try {
      const data = await apiFS.moveImages(moves);
      imagesId.forEach(imageId => {
        const succeed = data.data.moved.includes(imageId);
        if (succeed) {
          const image = generatedImages.find(img => img.id === imageId);
          if (image) updateImage(imageId, { ...image, path: image.path.replace(image.folder, folder), folder: folder });
        }
      })

      setSelectedImages([]);
      setMoveFolderDialogOpen(false);

      if (data.success) {
        toast.success(`Moved ${moves.length == data.data.moved.length ? moves.length : `${data.data.moved.length}/${moves.length}`} images to ${targetFolder}`);
      } else {
        toast.error("Failed to move images");
      }
    } catch (error) {
      console.error('Error moving images to folder:', error);
      toast.error("Failed to move images");
    } finally {
      setIsLoading(false);
    }
  }







  const handleDeleteClick = (image: ImageMetadata) => {
    setImagesToDelete([image.path]);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSelected = () => {
    setImagesToDelete(generatedImages.filter(img => selectedImages.includes(img.id)).map(img => img.path));
    setDeleteDialogOpen(true);
  };

  // src/components/part-images/ImageViewer.tsx
  // Around line 429, modify the function:

  const confirmDelete = async () => {
    setIsLoading(true);
    const isCurrentImageBeingDeleted = focusedImage && imagesToDelete.includes(focusedImage.path);

    try {
      const success = await apiFS.deleteImagesByPaths(imagesToDelete);
      if (success) {
        toast.success(`Deleted ${imagesToDelete.length} images`);

        // Store the current index before updating the state
        const currentIndex = focusedImageIndex;

        // Update the images list
        setGeneratedImages(prev => prev.filter(img => !imagesToDelete.includes(img.path)));

        // If we deleted the current image and there are other images
        if (isCurrentImageBeingDeleted) {
          if (filteredImages.length > 1) {
            // Navigate to the next image (will happen after this function completes)
            handleImageNavigation('next');
          } else {
            // If no more images, close the dialog
            setDetailsDialogOpen(false);
          }
        }
      } else {
        toast.error("Failed to delete image(s)");
      }
    } catch (error) {
      console.error('Error deleting image(s):', error);
      toast.error("Failed to delete image(s)");
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setImagesToDelete([]);
      setSelectedImages([]);
    }
  };

  const handleCreatePrompt = async (image: ImageMetadata) => {
    try {
      //Create a new prompt from the image
      const newPrompt: PromptEditor = {

        id: generateUUID(),
        isOpen: false,
        runCount: 1,
        currentRun: 0,
        status: "idle",

        name: image.promptData.name,
        text: image.promptData.text,
        negativePrompt: image.promptData.negativePrompt,
        cfgScale: image.promptData.cfgScale,
        embeddingsRandom: false,
        embeddings: [],
        seed: image.promptData.seed,
        steps: image.promptData.steps,
        sampler: image.promptData.sampler,
        width: image.promptData.width,
        height: image.promptData.height,
        tags: [...image.promptData.tags],

        models: [image.promptData.model],
        lorasRandom: false,
        loras: image.promptData.loras.map(l => { return { ...l, random: false } }) || [],
      };

      await addPrompt(newPrompt);
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error("Error creating prompt", {
        description: error instanceof Error ? error.message : String(error)
      });
    }
  };



  const handleDetailsDownload = () => {
    if (!focusedImage || !focusedImageUrl) return;

    fetch(focusedImageUrl)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${focusedImage.id}.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      })
      .catch(error => {
        console.error('Error downloading image:', error);
      });
  };


  function handleClearSearch(): void {
    setSearchQuery('');
    setActiveSearchQuery('');
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-8rem)]">
      <ResizablePanel defaultSize={75} minSize={30}>
        <div className="h-full flex flex-col p-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button onClick={openOutputFolder} variant="outline">
                <FolderOpen className="mr-2 h-4 w-4" />
                Open Folder
              </Button>

              <div className="relative flex items-center">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search images..."
                  className="pl-8 pr-8"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                />

                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={handleClearSearch}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

            </div>

            {selectedImages.length > 0 && (
              <div className="flex gap-2">
                <Button onClick={selectAllImages} variant="outline" size="sm" className="flex items-center" >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {selectedImages.length === filteredImages.length ? 'Deselect All' : 'Select All'}
                </Button>

                <Button
                  onClick={() => setMoveFolderDialogOpen(true)} variant="outline" size="sm" className="flex items-center" >
                  <FolderClosed className="mr-2 h-4 w-4" />
                  Move ({selectedImages.length})
                </Button>

                <Button
                  onClick={handleDeleteSelected} variant="destructive" size="sm" className="flex items-center" >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedImages.length})
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto pr-4">
            {filteredImages.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Matching Images</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or search criteria.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-auto gap-4">
                {filteredImages.map((image, index) => (
                  <div key={image.id} className="h-auto">
                    <ImageCard
                      key={image.id}
                      image={image}
                      isSelected={selectedImages.includes(image.id)}
                      isActive={lastSelectedImageIndexRef.current === index}
                      toggleSelection={toggleImageSelection}
                      onImageClick={handleImageClick}
                      onMoveToFolder={handleMoveToFolder}
                      onCreatePrompt={handleCreatePrompt}
                      onDeleteClick={handleDeleteClick}
                      availableFolders={availableFolders}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      {/* Filters Panel (right side) */}
      <ResizablePanel defaultSize={25} minSize={15}>
        <div className="h-full p-1">
          <FilterPanel
            availableTags={availableTags}
            selectedTags={selectedTags}
            toggleTagFilter={toggleTagFilter}

            availableModels={availableModels}
            selectedModels={selectedModels}
            toggleModelFilter={toggleModelFilter}

            availableLoras={availableLoras}
            selectedLoras={selectedLoras}
            toggleLoraFilter={toggleLoraFilter}

            availableFolders={availableFolders}
            selectedFolders={selectedFolders}
            onFolderSelect={toggleFolderFilter}

            clearAllFilters={clearAllFilters}
          />
        </div>
      </ResizablePanel>

      {
        focusedImage && (
          <ImageDetailsDialog
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            image={focusedImage}
            imageUrl={focusedImageUrl}
            isSelected={selectedImages.includes(focusedImage.id)}
            toggleSelection={toggleImageSelection}
            onCreatePrompt={handleCreatePrompt}
            onDownload={handleDetailsDownload}
            onNavigate={handleImageNavigation}
            onDeleteClick={handleDeleteClick}
            onMoveToFolder={handleMoveToFolder}
            availableFolders={availableFolders}
          />
        )
      }

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone, are you sure you want to proceed?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move to Folder Dialog */}
      <AlertDialog open={moveFolderDialogOpen} onOpenChange={setMoveFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Images to Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Select a destination folder for the {selectedImages.length} selected images.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <DropdownMenu>
              <DropdownMenuTrigger className='border p-2'>{targetFolder}</DropdownMenuTrigger>
              <DropdownMenuContent>
                {availableFolders.map((folder) => (
                  <DropdownMenuItem key={folder} onClick={() => setTargetFolder(folder)}> {folder}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>


          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveSelectedToFolder}>
              Move Images
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResizablePanelGroup>
  );
}