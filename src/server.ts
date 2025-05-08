// src/server.ts
import { join } from "path";
import { mkdir, unlink, readdir } from "node:fs/promises";
import { existsSync, copyFileSync, unlinkSync } from "node:fs";
import { exec } from "child_process";
import { ImageMetadata } from "./types";
import { DEFAULT_OUTPUT_FOLDER, EXTERNAL_IMAGES_FOLDER } from "./lib/constants";
import { getImageFolder } from "./lib/utils";
import path from "path";

//Constants
const OUTPUT_DIR: string = join(import.meta.dir, DEFAULT_OUTPUT_FOLDER);

//CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

interface BunRequest extends Request {
  params?: Record<string, string>;
}

async function ensureDirectories(path: string): Promise<void> {
  let dirPath = path;

  const parts = path.split(/[/\\]/); // handles both / and \
  const lastPart = parts[parts.length - 1];
  if (lastPart.includes('.')) {
    parts.pop(); // remove the filename
    dirPath = parts.join('/');
  }

  if (!dirPath) return;

  await mkdir(dirPath, { recursive: true });
}

async function scanDirectoriesForImages(basePath: string = OUTPUT_DIR): Promise<string[]> {
  const result: string[] = [];

  const baseEntries = await readdir(basePath, { withFileTypes: true });

  for (const entry of baseEntries) {
    if (entry.isFile() && entry.name.endsWith('.png')) {
      result.push(join(basePath, entry.name));
    }
  }

  //Check for PNG files in direct subfolders only
  for (const entry of baseEntries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const folderPath = join(basePath, entry.name);
      const subEntries = await readdir(folderPath, { withFileTypes: true });

      for (const subEntry of subEntries) {
        if (subEntry.isFile() && subEntry.name.endsWith('.png')) {
          result.push(join(folderPath, subEntry.name));
        }
      }
    }
  }

  // Also check the external folder
  const externalPath = join(basePath, '..', EXTERNAL_IMAGES_FOLDER);
  if (existsSync(externalPath)) {
    const externalEntries = await readdir(externalPath, { withFileTypes: true });
    for (const entry of externalEntries) {
      if (entry.isFile() && entry.name.endsWith('.png')) {
        result.push(join(externalPath, entry.name));
      }
    }
  }

  return result;
}

async function getAllImagesWithMetadata(): Promise<ImageMetadata[]> {
  try {
    const imagePaths = await scanDirectoriesForImages();
    const imagesMetadata: ImageMetadata[] = [];

    for (const imagePath of imagePaths) {
      // Create simple metadata without parsing contents
      const metadata: ImageMetadata = {
        id: path.basename(imagePath, '.png'),
        path: imagePath,
        folder: getImageFolder(imagePath),
        createdAt: new Date().toISOString(),
        promptData: {
          name: '',
          text: '',
          negativePrompt: '',
          cfgScale: 7,
          seed: -1,
          steps: 20,
          sampler: '',
          model: '',
          width: 512,
          height: 512,
          tags: [],
          loras: [],
          embeddings: []
        }
      };
      
      imagesMetadata.push(metadata);
    }

    return imagesMetadata;
  } catch (error) {
    console.error('Error getting all images with metadata:', error);
    return [];
  }
}

//Handle OPTIONS requests for CORS preflight
function handleOptions() {
  return new Response(null, {
    status: 204, // No content
    headers: corsHeaders
  });
}

//Get all images metadata
async function getImagesMetadata(req: BunRequest): Promise<Response> {
  console.log("GET: Getting images");
  const metadata = await getAllImagesWithMetadata();
  return Response.json({ success: true, data: metadata }, { headers: corsHeaders });
}

//Serve static image
async function serveStaticImage(req: BunRequest): Promise<Response> {
  try {
    const { path } = await req.json() as {
      path: string
    };
    const file = Bun.file(path);
    if (!await file.exists()) {
      return new Response("File not found", { status: 404, headers: corsHeaders });
    }

    const contentType = 'image/png';

    return new Response(await file.arrayBuffer(), {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000" //Cache for a year
      }
    });
  } catch (error) {
    return new Response(`Error: ${error}`, { status: 500, headers: corsHeaders });
  }
}

//Delete multiple images
async function deleteImages(req: BunRequest): Promise<Response> {
  try {
    const { paths } = await req.json() as {
      paths: string[]
    };
    console.log(`POST: Deleting ${paths.length} images`);

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return Response.json({ success: false, error: 'No paths provided' },
        { status: 400, headers: corsHeaders });
    }

    const results = [];
    const errors = [];

    //Process each file deletion
    for (const path of paths) {
      try {
        //Check if file exists before deleting
        if (existsSync(path)) {
          await unlink(path);
          results.push({ path, deleted: true });
        } else {
          errors.push({ path, error: 'File not found' });
        }
      } catch (error) {
        errors.push({ path, error: String(error) });
      }
    }

    return Response.json({
      success: errors.length === 0,
      data: {
        deleted: results,
        errors: errors
      }
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, error: String(error) },
      { status: 500, headers: corsHeaders });
  }
}

//Move multiple images to new folders
async function moveImages(req: BunRequest): Promise<Response> {
  try {
    const { moves } = await req.json() as {
      moves: Array<{
        imageId: string,
        oldPath: string,
        newPath: string
      }>
    };

    console.log(`POST: Moving ${moves.length} images`);

    if (!moves || !Array.isArray(moves) || moves.length === 0) {
      return Response.json({ success: false, error: 'No move operations provided' },
        { status: 400, headers: corsHeaders });
    }

    const results = [];
    const errors = [];

    const absoluteMoves = moves.map(move => {
      // Check if the old path is in the external folder
      if (move.oldPath.includes(EXTERNAL_IMAGES_FOLDER)) {
        // If from external folder, make sure the move is to the internal output directory
        return {
          imageId: move.imageId,
          oldPath: move.oldPath,
          newPath: join(OUTPUT_DIR, move.newPath)
        };
      }
      return {
        imageId: move.imageId,
        oldPath: join(OUTPUT_DIR, move.oldPath),
        newPath: join(OUTPUT_DIR, move.newPath)
      };
    });

    //Process each move operation
    for (const move of absoluteMoves) {
      try {
        const { imageId, oldPath, newPath } = move;

        if (!oldPath || !newPath) {
          errors.push({ id: imageId, error: 'Missing parameters' });
          continue;
        }

        //Check if source file exists
        if (!existsSync(oldPath)) {
          errors.push({ id: imageId, error: 'File not found' });
          continue;
        }

        if (newPath === oldPath) {
          results.push(imageId);
          continue;
        }

        //Create destination directory if it doesn't exist
        await ensureDirectories(newPath);

        //Move file to new location
        copyFileSync(oldPath, newPath);
        unlinkSync(oldPath);

        results.push(imageId);
      } catch (error) {
        errors.push({ id: move.imageId, error: String(error) });
      }
    }

    return Response.json({
      success: errors.length === 0,
      data: {
        moved: results,
        errors: errors
      }
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, error: String(error) },
      { status: 500, headers: corsHeaders });
  }
}

//Open output folder
async function openFolder(req: BunRequest): Promise<Response> {
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

//Get all folders
async function getFolders(req: BunRequest): Promise<Response> {
  console.log("GET: Folders");
  try {
    const folders = await getAllFolders();
    return Response.json({ success: true, data: folders }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, error: String(error) },
      { status: 500, headers: corsHeaders });
  }
}

async function getAllFolders(): Promise<string[]> {
  try {
    const result: string[] = [];
    const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });

    //Only include direct subfolders
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        result.push(entry.name);
      }
    }

    //Ensure default folder is always included
    if (!result.includes(EXTERNAL_IMAGES_FOLDER)) {
      result.push(EXTERNAL_IMAGES_FOLDER);
    }

    return result.sort();
  } catch (error) {
    console.error('Error reading folders:', error);
    return [EXTERNAL_IMAGES_FOLDER];
  }
}

const server = Bun.serve({
  port: process.env.PORT || 3001,
  fetch(req, server) {
    const url = new URL(req.url);
    console.log(`SERVER RECEIVED ${req.method} REQUEST TO: ${url.pathname}`);

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
    "/api/images": {
      GET: getImagesMetadata,
    },
    "/api/static-images": {
      POST: serveStaticImage
    },
    "/api/images/delete-batch": {
      POST: deleteImages
    },
    "/api/images/move-batch": {
      POST: moveImages
    },
    "/api/open-folder": {
      POST: openFolder
    },
    "/api/folders": {
      GET: getFolders
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

ensureDirectories(OUTPUT_DIR).then(async () => {
  console.log(`Server running on port ${server.port}`);
  console.log(`Images will be saved to: ${OUTPUT_DIR}`);
  console.log(`External images folder: ${EXTERNAL_IMAGES_FOLDER}`);
});