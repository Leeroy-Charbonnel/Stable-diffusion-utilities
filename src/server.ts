import { join, dirname } from "path";
import { mkdir, unlink } from "node:fs/promises";
import { existsSync, copyFileSync, unlinkSync } from "node:fs";
import { exec } from "child_process";
import { ImageMetadata, Prompt } from "./types";
import { DEFAULT_OUTPUT_FOLDER, DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER, METADATA_FILE_NAME, PROMPTS_FILE_NAME } from "./lib/constants";

//Constants
const OUTPUT_DIR: string = join(import.meta.dir, DEFAULT_OUTPUT_FOLDER);
const METADATA_FILE: string = join(OUTPUT_DIR, METADATA_FILE_NAME);
const PROMPTS_FILE: string = join(OUTPUT_DIR, PROMPTS_FILE_NAME);

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

async function getAllFolders(): Promise<string[]> {
  try {
    const { readdir } = require('fs/promises');

    const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });
    const folders = entries.filter((entry: any) => entry.isDirectory()).map((dir: any) => dir.name);
    return folders;
  } catch (error) {
    console.error('Error reading folders:', error);
    return [DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER];
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

//Handle OPTIONS requests for CORS preflight
function handleOptions() {
  return new Response(null, {
    status: 204, // No content
    headers: corsHeaders
  });
}

const server = Bun.serve({
  port: process.env.PORT || 3001,
  fetch(req, server) {
    if (req.method === "OPTIONS") { return handleOptions(); }
    return server.fetch(req);
  },
  error(error) {
    return new Response(`Error: ${error.message}`, {
      status: 500,
      headers: corsHeaders
    });
  },
  routes: {
    "/api/prompts": {
      //Get all prompts
      GET: async () => {
        console.log("Getting prompts");
        const prompts = await readPrompts();
        return Response.json({ success: true, data: prompts }, { headers: corsHeaders });
      },
      //Save prompts
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

    "/api/images": {
      //Get all images metadata
      GET: async () => {
        console.log("Getting images");
        const metadata = await readMetadata();
        return Response.json({ success: true, data: metadata }, { headers: corsHeaders });
      },

      //Create new image
      POST: async (req: BunRequest) => {
        try {
          console.log("Saving image");
          const { imageBase64, metadata } = await req.json() as { imageBase64: string, metadata: ImageMetadata }

          //Save image file
          const filename = `${metadata.id}.png`;
          const folderPath = join(OUTPUT_DIR, metadata.folder || DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER);
          const filePath = join(folderPath, filename);
          await ensureDirectories(dirname(filePath));

          console.log(`Saving image to: ${filePath}`);
          const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
          await Bun.write(filePath, Buffer.from(base64Data, 'base64'));

          //Set default name if not provided
          if (!metadata.name) {
            metadata.name = `Image ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
          }

          //Update metadata
          const allMetadata = await readMetadata();
          const newImageMetadata: ImageMetadata = {
            ...metadata,
            path: filePath,
            folder: metadata.folder || DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER
          };

          allMetadata.push(newImageMetadata);
          await saveMetadata(allMetadata);

          return Response.json({ success: true, data: newImageMetadata }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      }
    },

    //Get image by ID
    "/api/images/:id": {
      GET: async (req: BunRequest) => {
        try {
          const imageId = req.params?.id;
          console.log(`Getting image by ID: ${imageId}`);

          if (!imageId) {
            return Response.json({ success: false, error: 'Image ID not provided' },
              { status: 400, headers: corsHeaders });
          }

          const metadata = await readMetadata();
          const imageMetadata = metadata.find(img => img.id === imageId);

          if (!imageMetadata) {
            return Response.json({ success: false, error: 'Image not found' },
              { status: 404, headers: corsHeaders });
          }

          const file = Bun.file(imageMetadata.path);
          if (!await file.exists()) {
            return Response.json({ success: false, error: 'Image file not found' },
              { status: 404, headers: corsHeaders });
          }

          return new Response(await file.arrayBuffer(), {
            headers: {
              ...corsHeaders,
              "Content-Type": "image/png"
            }
          });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      },

      //Delete image
      DELETE: async (req: BunRequest) => {
        try {
          const imageId = req.params?.id;
          if (!imageId) {
            return Response.json({ success: false, error: 'Image ID not provided' },
              { status: 400, headers: corsHeaders });
          }

          const metadata = await readMetadata();
          const imageIndex = metadata.findIndex(img => img.id === imageId);

          if (imageIndex === -1) {
            return Response.json({ success: false, error: 'Image not found in metadata' },
              { status: 404, headers: corsHeaders });
          }

          //Delete the file
          const imagePath = metadata[imageIndex].path;
          try {
            await unlink(imagePath);
          } catch (err) {
            console.error(`Failed to delete file at ${imagePath}:`, err);
          }

          //Update metadata
          metadata.splice(imageIndex, 1);
          await saveMetadata(metadata);

          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      }
    },

    //Update image metadata
    "/api/images/:id/update": {
      POST: async (req: BunRequest) => {
        try {
          const imageId = req.params?.id;
          if (!imageId) {
            return Response.json({ success: false, error: 'Image ID not provided' },
              { status: 400, headers: corsHeaders });
          }

          const updates = await req.json() as Partial<ImageMetadata>;
          const metadata = await readMetadata();
          const imageIndex = metadata.findIndex(img => img.id === imageId);

          if (imageIndex === -1) {
            return Response.json({ success: false, error: 'Image not found in metadata' },
              { status: 404, headers: corsHeaders });
          }

          //Update metadata fields
          metadata[imageIndex] = {
            ...metadata[imageIndex],
            ...updates
          };

          //Save updated metadata
          await saveMetadata(metadata);

          return Response.json({ success: true, data: metadata[imageIndex] }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      }
    },

    //Move image to folder
    "/api/images/:id/move": {
      POST: async (req: BunRequest) => {
        try {
          const imageId = req.params?.id;
          if (!imageId) {
            return Response.json({ success: false, error: 'Image ID not provided' },
              { status: 400, headers: corsHeaders });
          }

          const { folder } = await req.json() as { folder: string };
          if (!folder) {
            return Response.json({ success: false, error: 'Folder not provided' },
              { status: 400, headers: corsHeaders });
          }

          //Create folder if it doesn't exist
          const folderPath = join(OUTPUT_DIR, folder);
          await ensureDirectories(folderPath);

          const metadata = await readMetadata();
          const imageIndex = metadata.findIndex(img => img.id === imageId);

          if (imageIndex === -1) {
            return Response.json({ success: false, error: 'Image not found' },
              { status: 404, headers: corsHeaders });
          }

          const image = metadata[imageIndex];
          const oldPath = image.path;

          const filename = `${imageId}.png`;
          const newPath = join(folderPath, filename);

          try {
            if (existsSync(oldPath)) {
              copyFileSync(oldPath, newPath);
              unlinkSync(oldPath);
            }
          } catch (err) {
            console.error(`Failed to move file from ${oldPath} to ${newPath}:`, err);
            return Response.json({ success: false, error: `Failed to move file: ${err}` },
              { status: 500, headers: corsHeaders });
          }

          metadata[imageIndex] = { ...image, path: newPath, folder };

          const metadataSaved = await saveMetadata(metadata);
          if (!metadataSaved) {
            return Response.json({ success: false, error: 'Failed to update metadata' },
              { status: 500, headers: corsHeaders });
          }

          return Response.json({
            success: true,
            data: metadata[imageIndex]
          }, { headers: corsHeaders });
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

    //Get all folders
    "/api/folders": {
      GET: async () => {
        try {
          const folders = await getAllFolders();
          return Response.json({ success: true, data: folders }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      }
    },

    //Proxy for Civitai API to avoid CORS issues
    "/api/civitai/image/:id": {
      GET: async (req: BunRequest) => {
        try {
          const imageId = req.params?.id;
          if (!imageId) {
            return Response.json({ success: false, error: 'Image ID not provided' },
              { status: 400, headers: corsHeaders });
          }

          const response = await fetch(`https://civitai.com/api/trpc/image.getGenerationData?input={"json":{"id":${imageId}}}`);

          if (!response.ok) {
            return Response.json({ success: false, error: 'Failed to fetch from Civitai API' },
              { status: response.status, headers: corsHeaders });
          }

          const data = await response.json();
          return Response.json({ success: true, data }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: String(error) },
            { status: 500, headers: corsHeaders });
        }
      }
    },

    //Fallback for API routes
    "/api/*": (req: BunRequest) => {
      if (req.method === "OPTIONS") {
        return handleOptions();
      }
      return Response.json({ success: false, error: 'API endpoint not found' },
        { status: 404, headers: corsHeaders });
    },
  }
});

//Initialize server
ensureDirectories(OUTPUT_DIR).then(() => {
  console.log(`Server running on port ${server.port}`);
  console.log(`Images will be saved to: ${OUTPUT_DIR}`);
  console.log(`Default folder: ${join(OUTPUT_DIR, DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER)}`);
});