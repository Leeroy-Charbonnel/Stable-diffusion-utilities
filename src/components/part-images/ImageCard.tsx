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
  MoreVertical
} from 'lucide-react';
import { ImageMetadata } from '@/types';
import { getImageUrl } from '@/services/fileSystemApi';

interface ImageCardProps {
  image: ImageMetadata;
  isSelected: boolean;
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
  toggleSelection,
  onImageClick,
  onMoveToFolder,
  onCreatePrompt,
  onDeleteClick,
  availableFolders,
}: ImageCardProps) {
  //Assume square images but respect actual dimensions if not square
  const imageFolder = image.folder;
  const imageUrl = getImageUrl(image.id);
  const formattedDate = new Date(image.createdAt).toLocaleDateString();
  const truncatedPrompt = image.prompt.substring(0, 90);
  const numberOfTagsToShow = 3;

  return (
    <Card
      key={image.id}
      className={`p-0 gap-0 overflow-hidden relative rounded-lg m-0.5 transition-all h-full ${isSelected ? 'shadow-[0_0_0_2px_var(--primary)]' : 'hover:shadow-md'}`}
    >
      {/*Quick Actions*/}
      <div className="absolute w-full flex justify-between px-3 pt-3 items-center z-20 gap-2">
        <Checkbox
          checked={isSelected}
          className="rounded-sm shadow-md transition-all"
          onClick={(e) => { e.stopPropagation(); toggleSelection(image.id); }}
        />

        <div className="flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm rounded-full shadow-md"
            onClick={(e) => { e.stopPropagation(); onCreatePrompt && onCreatePrompt(image); }}
            title="Copy prompt"
          >
            <Copy className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm rounded-full shadow-md"
                title="Move to folder"
                onClick={(e) => e.stopPropagation()}
              >
                <Folder className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Move to folder</h4>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {availableFolders.map(folder => (
                    <div
                      key={folder}
                      className={`text-sm px-2 py-1.5 rounded cursor-pointer flex items-center ${imageFolder === folder
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                        }`}
                      onClick={() => {
                        if (imageFolder !== folder) { onMoveToFolder(image.id, folder); }
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

          <Popover>
            <PopoverTrigger asChild>
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
                {/*Main Info Section*/}
                <div className="flex items-center text-sm py-1">
                  <span className="flex-1">Dimensions:</span>
                  <Badge variant="outline" className="ml-2">
                    {image.width}×{image.height}
                  </Badge>
                </div>

                <div className="flex items-center text-sm py-1">
                  <span className="flex-1">Date:</span>
                  <Badge variant="outline" className="ml-2">
                    {formattedDate}
                  </Badge>
                </div>

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
      </div>

      {/*Image Preview*/}
      <div
        className="relative overflow-hidden bg-muted cursor-pointer group min-h-64"
        style={{ aspectRatio: `${image.width} / ${image.height}` }}
        onClick={() => onImageClick(image)}
      >
        <img
          src={imageUrl}
          alt={image.prompt}
          className="object-cover w-full h-full transition-all duration-300 group-hover:scale-105"
          loading="lazy"
        />

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
          {imageFolder !== 'default' && (
            <Badge variant="outline" className="text-xs rounded-full px-2 h-6 border-primary/30 bg-primary/5 text-primary-foreground flex items-center">
              <Folder className="h-3 w-3 mr-1 text-primary" />{imageFolder}
            </Badge>
          )}

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