import { join } from "path";
import { mkdir, unlink, readdir } from "node:fs/promises";
import { existsSync, copyFileSync, unlinkSync } from "node:fs";
import { exec } from "child_process";
import { ImageMetadata, LabelsData, Prompt, PromptEditor } from "./types";
import { DEFAULT_OUTPUT_FOLDER, DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER, LABELS_FILE_NAME, PROMPTS_FILE_NAME, SD_API_BASE_URL } from "./lib/constants";
import sharp from 'sharp';
import { getImageFolder } from "./lib/utils";
import { ChildProcess, spawn } from "node:child_process";
import path from "path";

//Constants
const OUTPUT_DIR: string = join(import.meta.dir, DEFAULT_OUTPUT_FOLDER);
const PROMPTS_FILE: string = join(import.meta.dir, PROMPTS_FILE_NAME);
const LABELS_FILE: string = join(import.meta.dir, LABELS_FILE_NAME);


let sdProcess: ChildProcess | null = null;
let sdPID: number | null = null;

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

  return result;
}


function getSeedValue(data: string): number | null {
  const seedRegex = /Seed:\s*(\d+)/;
  const match = data.match(seedRegex);
  return match ? parseInt(match[1]) : null;
}


//Extract metadata from image file
async function extractMetadataFromImage(imagePath: string): Promise<ImageMetadata | null> {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    if (!metadata.exif) {
      console.log(`No EXIF data found in image: ${imagePath}`);
      return null;
    }

    console.log();


    try {
      const metadataStr = metadata.exif.toString('utf16le');

      const jsonStartIndex = metadataStr.indexOf('{');
      const jsonEndIndex = metadataStr.lastIndexOf('}') + 1;

      if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
        const jsonStr = metadataStr.substring(jsonStartIndex, jsonEndIndex);
        const parsedMetadata = JSON.parse(jsonStr) as ImageMetadata;
        const seed = metadata.comments ? getSeedValue(metadata.comments[0]?.text || '') : null;


        if (seed) parsedMetadata.promptData.seed = seed;
        parsedMetadata.path = imagePath;
        parsedMetadata.folder = getImageFolder(imagePath);
        return parsedMetadata;
      }
    } catch (error) {
      console.error(`Error parsing metadata from image: ${imagePath}`, error);
    }

    return null;
  } catch (error) {
    console.error(`Error extracting metadata from image: ${imagePath}`, error);
    return null;
  }
}

//Get all images with metadata
async function getAllImagesWithMetadata(): Promise<ImageMetadata[]> {
  try {
    const imagePaths = await scanDirectoriesForImages();
    const imagesMetadata: ImageMetadata[] = [];

    for (const imagePath of imagePaths) {
      const metadata = await extractMetadataFromImage(imagePath);
      if (metadata) imagesMetadata.push(metadata);
    }

    return imagesMetadata;
  } catch (error) {
    console.error('Error getting all images with metadata:', error);
    return [];
  }
}


async function readLabelsData(): Promise<LabelsData> {
  try {
    const labelsFile = Bun.file(LABELS_FILE);
    if (!await labelsFile.exists()) return { modelLabels: [], lorasLabels: [] };
    return JSON.parse(await labelsFile.text());
  } catch (error) {
    console.error('Error reading labels data:', error);
    return { modelLabels: [], lorasLabels: [] };
  }
}


async function getLabelsData(req: BunRequest): Promise<Response> {
  console.log("GET: Getting labels data");
  const labelsData = await readLabelsData();
  return Response.json({ success: true, data: labelsData }, { headers: corsHeaders });
}



async function saveLabelsData(labelsData: any): Promise<boolean> {
  try {
    await ensureDirectories(OUTPUT_DIR);
    await Bun.write(LABELS_FILE, JSON.stringify(labelsData, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving labels data:', error);
    return false;
  }
}

async function saveLabelsDataRoute(req: BunRequest): Promise<Response> {
  console.log("POST: Saving labels data");
  try {
    await saveLabelsData(await req.json() as PromptEditor[]);
    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, error: String(error) },
      { status: 500, headers: corsHeaders });
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

async function savePrompts(prompts: PromptEditor[]): Promise<boolean> {
  try {
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
    const result: string[] = [];
    const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });

    //Only include direct subfolders
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        result.push(entry.name);
      }
    }

    //Ensure default folder is always included
    if (!result.includes(DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER)) {
      result.push(DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER);
    }

    return result.sort();
  } catch (error) {
    console.error('Error reading folders:', error);
    return [DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER];
  }
}


//Handle OPTIONS requests for CORS preflight
function handleOptions() {
  return new Response(null, {
    status: 204, // No content
    headers: corsHeaders
  });
}

//Get all prompts
async function getPrompts(req: BunRequest): Promise<Response> {
  console.log("GET: Getting prompts");
  const prompts = await readPrompts();
  return Response.json({ success: true, data: prompts }, { headers: corsHeaders });
}

//Save prompts
async function savePromptsRoute(req: BunRequest): Promise<Response> {
  console.log("POST: Saving prompts");
  try {
    await savePrompts(await req.json() as PromptEditor[]);
    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, error: String(error) },
      { status: 500, headers: corsHeaders });
  }
}

//Get all images metadata
async function getImagesMetadata(req: BunRequest): Promise<Response> {
  console.log("GET: Getting images");
  const metadata = await getAllImagesWithMetadata();
  return Response.json({ success: true, data: metadata }, { headers: corsHeaders });
}

//Create new image
async function saveImage(req: BunRequest): Promise<Response> {
  console.log("POST: Saving image");
  try {
    console.log("Saving generated image");
    const { imageBase64, metadata } = await req.json() as
      {
        imageBase64: string,
        metadata: ImageMetadata
      }
    //Save image file
    const filename = `${metadata.id}.png`;
    const folderPath = join(OUTPUT_DIR, metadata.folder || DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER);
    const filePath = join(folderPath, filename);
    await ensureDirectories(folderPath);
    console.log(`Saving image to: ${filePath}`);

    //Extract the base64 data
    const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const metadataString = JSON.stringify(metadata);

    //Store metadata in the PNG using tEXt chunks
    await sharp(imageBuffer)
      .withMetadata({
        //Add custom metadata
        exif: {
          IFD0: {
            XPComment: metadataString
          }
        }
      })
      .toFile(filePath);

    //Set path in metadata for response
    metadata.path = filePath;

    return Response.json({ success: true, data: metadata }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error saving image with metadata:", error);
    return Response.json({ success: false, error: String(error) },
      { status: 500, headers: corsHeaders });
  }
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
      return {
        imageId: move.imageId,
        oldPath: join(OUTPUT_DIR, move.oldPath),
        newPath: join(OUTPUT_DIR, move.newPath)
      }
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

//Get Civitai image data
async function getCivitaiImage(req: BunRequest): Promise<Response> {
  try {
    const imageUrl = req.params?.id;

    if (!imageUrl) {
      return Response.json({ success: false, error: 'Image URL not provided' },
        { status: 400, headers: corsHeaders });
    }

    const response = await fetch(imageUrl);

    if (!response.ok) {
      return Response.json({ success: false, error: 'Failed to fetch image' },
        { status: response.status, headers: corsHeaders });
    }

    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    return Response.json({
      success: true,
      data: {
        base64: `data:${response.headers.get('content-type') || 'image/jpeg'};base64,${base64Image}`
      }
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({ success: false, error: String(error) },
      { status: 500, headers: corsHeaders });
  }
}

//Refresh LoRAs from Stable Diffusion
async function refreshLoras(req: BunRequest): Promise<Response> {
  console.log("POST: Refreshing LoRAs");
  try {
    const response = await fetch(`${SD_API_BASE_URL}/sdapi/v1/refresh-loras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh LoRAs: ${response.status}`);
    }

    const result = await response.json();
    return Response.json({ success: true, data: result }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error refreshing LoRAs:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}

//Refresh checkpoints from Stable Diffusion
async function refreshCheckpoints(req: BunRequest): Promise<Response> {
  console.log("POST: Refreshing checkpoints");
  try {
    const response = await fetch(`${SD_API_BASE_URL}/sdapi/v1/refresh-checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh checkpoints: ${response.status}`);
    }

    const result = await response.json();
    return Response.json({ success: true, data: result }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error refreshing checkpoints:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function startStableDiffusionWebUI(): Promise<boolean> {
  try {
    console.log("Starting Stable Diffusion WebUI...");

    const projectRoot = path.resolve(process.cwd());
    const webuiPath = path.join(projectRoot, '..', 'webui-user.bat');

    console.log(`Starting WebUI from path: ${webuiPath}`);

    // Use spawn to start the process detached so it can run independently
    sdProcess = spawn('cmd.exe', ['/c', webuiPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });

    sdProcess.unref();

    if (sdProcess.pid) {
      sdPID = sdProcess.pid;
      console.log(`Stable Diffusion WebUI started with process ID: ${sdPID}`);
      return true;
    } else {
      console.error("Failed to get PID for Stable Diffusion WebUI process");
      return false;
    }
  } catch (error) {
    console.error("Error starting Stable Diffusion WebUI:", error);
    return false;
  }
}

async function restartStableDiffusion(req: BunRequest): Promise<Response> {
  console.log("POST: Restarting Stable Diffusion WebUI");

  try {
    console.log(`Killing Stable Diffusion process with PID: ${sdPID}`);

    await new Promise<void>((resolve) => {
      exec(`taskkill /F /PID ${sdPID}`, (error) => {
        if (error) {
          console.warn(`Failed to kill process with PID ${sdPID}:`, error);
        } else {
          console.log(`Successfully killed process with PID ${sdPID}`);
        }
        sdPID = null;
        sdProcess = null;
        resolve();
      });
    });

    const success = await startStableDiffusionWebUI();

    if (success) {
      return Response.json(
        { success: true, message: 'Restart initiated', pid: sdPID },
        { headers: corsHeaders }
      );
    } else {
      return Response.json(
        { success: false, error: 'Failed to start Stable Diffusion WebUI' },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Error restarting Stable Diffusion:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
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
      GET: getPrompts,
      POST: savePromptsRoute
    },
    "/api/images": {
      GET: getImagesMetadata,
      POST: saveImage
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
    "/api/civitai/image/:id": {
      GET: getCivitaiImage
    },
    "/api/sdapi/v1/refresh-loras": {
      POST: refreshLoras
    },
    "/api/sdapi/v1/refresh-checkpoints": {
      POST: refreshCheckpoints
    },
    "/api/labels":
    {
      GET: getLabelsData,
      POST: saveLabelsDataRoute
    },
    "/api/restart-sd": {
      POST: restartStableDiffusion
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