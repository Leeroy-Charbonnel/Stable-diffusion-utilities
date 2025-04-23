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
  Copy,
  MoreVertical,
  Pencil
} from 'lucide-react';
import { ImageMetadata } from '@/types';
import { getImageFromPath } from '@/services/apiFS';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';

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

  const formattedDate = new Date(image.createdAt).toLocaleDateString();
  const truncatedPrompt = image.prompt.substring(0, 90);
  const numberOfTagsToShow = 3;

  //Load image when component mounts
  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      try {
        //Try loading from path first (more efficient)
        if (image.path) {
          const pathUrl = await getImageFromPath(image.path);
          if (pathUrl) {
            setImageUrl(pathUrl);
            setIsLoading(false);
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

    //Clean up object URL when component unmounts
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [image.id, image.path]);

  const handleCreatePrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      onCreatePrompt(image);
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast("Error creating prompt", {
        description: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const activeStyle = 'shadow-[0_0_0_2px_orange]';
  const selectStyle = 'shadow-[0_0_0_2px_var(--primary)]';
  const cssStyle = isActive ? activeStyle : isSelected ? selectStyle : '';

  return (
    <Card
      key={image.id}
      className={`p-0 gap-0 overflow-hidden relative rounded-lg m-0.5 transition-all ${cssStyle}`}
    >


      {/*Image Preview*/}
      <div
        className="relative overflow-hidden bg-muted cursor-pointer group"
        style={{ aspectRatio: `2/3` }}
        onClick={() => onImageClick(image)}>


        {/*Quick Actions*/}

        <Checkbox
            checked={isSelected}
            className="rounded-sm shadow-md transition-all absolute top-3 left-3 z-10"
            onClick={(e) => { e.stopPropagation(); toggleSelection(image.id); }}
          />

        <div className="absolute w-full flex justify-between px-3 transition-opacity pt-3 items-center z-20 gap-2 opacity-0 group-hover:opacity-100">
   

          <Popover>
            <PopoverTrigger asChild className='absolute top-3 right-3'>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm rounded-full shadow-md"
                title="Options"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52" align="end">
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCreatePrompt}
                  title="Copy prompt"
                  className="w-full h-8"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Create Prompt
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

        {isLoading ? (
          <Skeleton className="h-12 w-12" />
        ) : (
          <img
            src={imageUrl}
            alt={image.prompt}
            className="object-cover w-full h-full transition-all duration-300 group-hover:scale-102 aspect-square"
            loading="lazy"
          />
        )}

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
          <div className="mt-auto space-y-3">
            <div className="w-full">
              <p className="text-sm font-medium text-white leading-tight line-clamp-3" title={image.prompt}>
                {truncatedPrompt}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/*Tags and Folder - Now below the image*/}
      <div className="p-2 bg-background">
        <div className="flex flex-wrap gap-1 justify-end items-center">
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
          {image.tags.length > 0 && (
            <>
              {image.tags.slice(0, numberOfTagsToShow).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs rounded-full px-2 h-6 bg-muted/80">
                  {tag}
                </Badge>
              ))}
              {image.tags.length > numberOfTagsToShow && (
                <Badge variant="secondary" className="text-xs rounded-full px-2 h-6 bg-muted/80">
                  +{image.tags.length - numberOfTagsToShow}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}