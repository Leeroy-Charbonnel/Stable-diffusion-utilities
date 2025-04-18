import { join, dirname } from "path";
import { mkdir, readFile } from "node:fs/promises";
import { exec } from "child_process";
import { ImageMetadata, SaveImageRequest, Prompt } from "./types";
import { DEFAULT_OUTPUT_FOLDER, DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER, METADATA_FILE_NAME, PROMPTS_FILE_NAME } from "./lib/constants";

//Constants
const OUTPUT_DIR: string = join(import.meta.dir, DEFAULT_OUTPUT_FOLDER);
const METADATA_FILE: string = join(OUTPUT_DIR, METADATA_FILE_NAME);
const PROMPTS_FILE: string = join(OUTPUT_DIR, PROMPTS_FILE_NAME);

//Utility functions
const toAbsolutePath = (relativePath: string): string => join(OUTPUT_DIR, relativePath);

async function ensureDirectories(path: string): Promise<void> {
  const dirPath = path.includes('.') ? path.substring(0, path.lastIndexOf('/')) : path;
  await mkdir(dirPath, { recursive: true });
}

async function readMetadata(): Promise<ImageMetadata[]> {
  try {
    const metadataFile = Bun.file(METADATA_FILE);
    if (!await metadataFile.exists()) return [];
    return JSON.parse(await metadataFile.text());
  } catch (error) {
    console.error('Error reading metadata:', error);
    return [];
  }
}

async function readPrompts(): Promise<Prompt[]> {
  try {
    const promptsFile = Bun.file(PROMPTS_FILE);
    if (!await promptsFile.exists()) return [];
    return JSON.parse(await promptsFile.text());
  } catch (error) {
    console.error('Error reading prompts:', error);
    return [];
  }
}

async function saveMetadata(metadata: ImageMetadata[]): Promise<boolean> {
  try {
    console.log("Saving metadata");
    await ensureDirectories(OUTPUT_DIR);
    await Bun.write(METADATA_FILE, JSON.stringify(metadata, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving metadata:', error);
    return false;
  }
}

async function savePrompts(prompts: Prompt[]): Promise<boolean> {
  try {
    console.log("Saving prompts");
    await ensureDirectories(OUTPUT_DIR);
    await Bun.write(PROMPTS_FILE, JSON.stringify(prompts, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving prompts:', error);
    return false;
  }
}

//CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

interface BunRequest extends Request {
  params?: Record<string, string>;
}

const server = Bun.serve({
  port: process.env.PORT || 3001,

  routes: {
    //CORS preflight
    "OPTIONS *": () => new Response(null, { headers: corsHeaders }),

    //Prompts routes
    "/api/prompts": {
      //GET /api/prompts - Get all prompts
      GET: async () => {
        const prompts = await readPrompts();
        return Response.json({ success: true, data: prompts }, { headers: corsHeaders });
      },
      //POST /api/prompts - Save all prompts
      POST: async (req: BunRequest) => {
        try {
          await savePrompts(await req.json() as Prompt[]);
          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      }
    },

    //Images collection route
    "/api/images": {
      //GET /api/images - Get all images metadata
      GET: async () => {
        const metadata = await readMetadata();
        return Response.json({ success: true, data: metadata }, { headers: corsHeaders });
      }
    },

    //Individual image routes
    "/api/images/:id": {
      //GET /api/images/:id - Get a specific image's data
      GET: async (req: BunRequest) => {
        try {
          const id = req.params?.id;
          const metadata = await readMetadata();
          const image = metadata.find(img => img.id === id);

          if (!image) {
            return Response.json({ success: false, error: 'Image not found' }, { status: 404, headers: corsHeaders });
          }

          const filePath = toAbsolutePath(image.path);
          if (!await Bun.file(filePath).exists()) {
            return Response.json({ success: false, error: 'Image file not found' }, { status: 404, headers: corsHeaders });
          }

          const fileData = await readFile(filePath);
          const base64Data = Buffer.from(fileData).toString('base64');

          return Response.json({
            success: true, data: {
              info: image,
              imageData: base64Data
            }
          }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      },
      //POST /api/images/:id - Create a new image in folder
      POST: async (req: BunRequest) => {
        try {
          const id = req.params?.id;
          const { imageBase64, metadata } = await req.json() as { imageBase64: string, metadata: Partial<ImageMetadata> };

          //Validate request
          if (!id || !imageBase64 || !metadata) {
            return Response.json({
              success: false,
              error: 'Missing required parameters: imageBase64 or metadata'
            }, { status: 400, headers: corsHeaders });
          }

          //Check if image with this ID already exists
          const allMetadata = await readMetadata();
          if (allMetadata.some(img => img.id === id)) {
            return Response.json({
              success: false,
              error: 'Image with this ID already exists'
            }, { status: 409, headers: corsHeaders });
          }

          //Save image file
          const filename = metadata.filename || `${id}.png`;
          const relativePath = metadata.path || `${DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER}/${filename}`;
          const filePath = toAbsolutePath(relativePath);

          await ensureDirectories(dirname(filePath));

          const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
          await Bun.write(filePath, Buffer.from(base64Data, 'base64'));

          //Update metadata
          const newImageMetadata: ImageMetadata = {
            id,
            filename,
            path: relativePath,
            ...metadata,
          };

          allMetadata.push(newImageMetadata);
          await saveMetadata(allMetadata);

          return Response.json({ success: true, data: newImageMetadata }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      },
      //PUT /api/images/:id - Update image metadata
      PUT: async (req: BunRequest) => {
        try {
          const id = req.params?.id;
          const updates = await req.json() as Partial<ImageMetadata>;
          const metadata = await readMetadata();
          const imageIndex = metadata.findIndex(item => item.id === id);

          if (imageIndex === -1) {
            return Response.json({ success: false, error: 'Image not found' },
              { status: 404, headers: corsHeaders });
          }

          const currentImage = metadata[imageIndex];

          //Handle file movement if path changed
          if (updates.path && updates.path !== currentImage.path) {
            const currentPath = toAbsolutePath(currentImage.path);
            const newPath = toAbsolutePath(updates.path);

            await ensureDirectories(dirname(newPath));
            const currentFile = Bun.file(currentPath);

            if (await currentFile.exists()) {
              await Bun.write(newPath, await currentFile.arrayBuffer());
              await currentFile.delete();
            }
          }

          //Update metadata
          const updatedMetadata = metadata.map(item =>
            item.id === id ? { ...item, ...updates } : item
          );

          await saveMetadata(updatedMetadata);

          return Response.json({
            success: true,
            data: updatedMetadata[imageIndex]
          }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      },
      //DELETE /api/images/:id - Delete an image
      DELETE: async (req: BunRequest) => {
        try {
          const id = req.params?.id;
          const metadata = await readMetadata();
          const image = metadata.find(img => img.id === id);

          if (!image) {
            return Response.json({ success: false, error: 'Image not found' },
              { status: 404, headers: corsHeaders });
          }

          //Delete file if exists
          const file = Bun.file(toAbsolutePath(image.path));
          if (await file.exists()) {
            await file.delete();
          }

          //Update metadata
          await saveMetadata(metadata.filter(item => item.id !== id));

          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      }
    },

    //Open folder route
    "/api/open-folder": {
      POST: async () => {
        try {
          //Platform-specific command to open folder
          const command = process.platform === 'win32'
            ? `explorer "${OUTPUT_DIR}"`
            : process.platform === 'darwin'
              ? `open "${OUTPUT_DIR}"`
              : `xdg-open "${OUTPUT_DIR}"`;

          exec(command, (error) => {
            if (error) console.error('Error opening folder:', error);
          });

          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      }
    },

    //Fallback for API routes
    "/api/*": () => Response.json({ success: false, error: 'API endpoint not found' },
      { status: 404, headers: corsHeaders }),

    //Fallback for all other routes
    "*": () => new Response('Not found', { status: 404, headers: corsHeaders })
  }
});

//Initialize server
ensureDirectories(OUTPUT_DIR).then(() => {
  console.log(`Server running on port ${server.port}`);
  console.log(`Images will be saved to: ${OUTPUT_DIR}`);
  console.log(`Default folder: ${join(OUTPUT_DIR, DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER)}`);
});