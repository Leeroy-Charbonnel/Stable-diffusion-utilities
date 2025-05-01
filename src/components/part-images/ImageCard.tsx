import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Folder,
  CheckSquare,
  Trash2,
  MoreVertical,
  Pencil
} from 'lucide-react';
import { ImageMetadata } from '@/types';
import { getImageFromPath } from '@/services/apiFS';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../ui/context-menu';

interface ImageCardProps {
  image: ImageMetadata;
  isSelected: boolean;
  isActive: boolean;
  toggleSelection: (imageId: string) => void;
  onImageClick: (image: ImageMetadata) => void;
  onMoveToFolder: (imageId: string, folder: string) => void;
  onCreatePrompt: (image: ImageMetadata) => void;
  onDeleteClick: (image: ImageMetadata) => void;
  availableFolders: string[];
}

export function ImageCard({
  image,
  isSelected,
  isActive,
  toggleSelection,
  onImageClick,
  onMoveToFolder,
  onCreatePrompt,
  onDeleteClick,
  availableFolders,
}: ImageCardProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [contextOpen, setContextMenuOpen] = useState(false)

  const truncatedPrompt = image.promptData.text.substring(0, 90);
  const numberOfTagsToShow = 3;

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      try {
        if (image.path) {
          const pathUrl = await getImageFromPath(image.path);
          if (pathUrl) {
            setImageUrl(pathUrl);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading image:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [image.path]);

  const handleCreatePrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenuOpen(false)
    try {
      onCreatePrompt(image);
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast("Error creating prompt", {
        description: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const activeStyle = 'shadow-[0_0_0_2px_var(--primary-brighter)]';
  const selectStyle = 'shadow-[0_0_0_2px_var(--primary)]';
  const cssStyle = isActive ? activeStyle : isSelected ? selectStyle : '';

  const handleDeleteImage = (e: React.MouseEvent) => {
    document.body.style.pointerEvents = '';
    e.stopPropagation();
    setContextMenuOpen(false)
    try {
      onDeleteClick(image);
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast("Error deleting prompt", {
        description: error instanceof Error ? error.message : String(error)
      });
    }
  }




  return (
    <Card
      key={image.id}
      className={`p-0 gap-0 overflow-hidden relative rounded-lg m-0.5 transition-all select-none ${cssStyle}`}
    >
      {!isLoading && (<div>

        <ContextMenu onOpenChange={setContextMenuOpen} >
          <ContextMenuTrigger asChild>
            {/*Image Preview*/}
            <div
              className="relative overflow-hidden bg-muted cursor-pointer group"
              style={{ aspectRatio: `2/3` }}
              onClick={() => onImageClick(image)}>

              <Checkbox
                checked={isSelected}
                className="border-1 border-neutral-500 rounded-none !bg-background/50 absolute top-3 left-3 z-10"
                onClick={(e) => { e.stopPropagation(); toggleSelection(image.id); }}
              />

              <img
                src={imageUrl}
                className="object-cover w-full h-full transition-all duration-300"
                loading="lazy"
              />



              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 bg-gradient-to-t from-(--card) via-(--card)/70 to-transparent">
                <div className="mt-auto space-y-3">
                  <div className="w-full">
                    <p className="text-sm font-medium text-white leading-tight line-clamp-3" title={image.promptData.text}>
                      {truncatedPrompt}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={handleCreatePrompt}>Create prompt from image</ContextMenuItem>
            <ContextMenuItem variant='destructive' onClick={handleDeleteImage}>Delete image</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/*Tags and Folder - Now below the image*/}
        <div className="p-2 ">
          <div className="flex flex-wrap gap-1 justify-start items-center">
            {/*Folder Badge - Always first with distinct styling*/}
            <Popover>
              <PopoverTrigger asChild>
                <Badge variant="outline" className="text-xs rounded-full px-2 h-6 border-primary/30 bg-primary/5 text-primary-foreground flex items-center cursor-pointer">
                  <Folder className="h-3 w-3 mr-1 text-primary" />{image.folder}</Badge>
              </PopoverTrigger>
              <PopoverContent className="w-52" align="end">
                <div className="space-y-2">
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {availableFolders.map(folder => (
                      <div
                        key={folder}
                        className={`text-sm px-2 py-1.5 rounded cursor-pointer flex items-center ${image.folder === folder
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                          }`}
                        onClick={() => {
                          if (image.folder !== folder) { onMoveToFolder(image.id, folder); }
                        }}
                      >
                        {image.folder === folder && <CheckSquare className="mr-2 h-4 w-4" />}
                        {folder}
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/*Regular Tags*/}
            {image.promptData.tags.length > 0 && (
              <>
                {image.promptData.tags.slice(0, numberOfTagsToShow).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs rounded-full h-6 bg-muted/80">
                    {tag}
                  </Badge>
                ))}
                {image.promptData.tags.length > numberOfTagsToShow && (
                  <Badge variant="secondary" className="text-xs rounded-full h-6 bg-muted/80">
                    +{image.promptData.tags.length - numberOfTagsToShow}
                  </Badge>
                )}
              </>
            )}

          </div>
        </div>


      </div>)}







      <div className="absolute w-full z-20 opacity-0 group-hover:opacity-100">
        <Popover>
          <PopoverTrigger asChild className='absolute top-2 right-2 z-10'>
            <Button
              variant="secondary" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-background/50  rounded-full cursor-pointer" title="Options" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4 " />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 dark" align="end">
            <div className="space-y-2">
              <Button variant="secondary" size="sm" onClick={handleCreatePrompt} title="Copy prompt" className="w-full h-8" >
                <Pencil className="h-4 w-4 mr-1" />Create Prompt
              </Button>
              <Separator />

              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(image);
                }}
                className="w-full h-8"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>


      {isLoading && (
        <div>
          <div className="relative overflow-hidden" style={{ aspectRatio: `2/3` }}>
            <div className='bg-muted w-full h-full'></div>
          </div>
          <div className="p-2">
            <div className="flex flex-wrap gap-1 justify-start items-center">
              <Skeleton className="h-6 w-18 rounded-full bg-primary/30" />
              {new Array(Math.min(numberOfTagsToShow + 1, image.promptData.tags.length)).fill(0).map(() => (
                <Skeleton key={Math.random()} className="h-6 w-15 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      )
      }

    </Card>
  );
}