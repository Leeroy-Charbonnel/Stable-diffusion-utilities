import { serve } from "bun";
import { join, dirname } from "path";
import { mkdir } from "node:fs/promises";
import { exec } from "child_process";
import { ImageMetadata, SaveImageRequest, Prompt } from "./types";

//Output directory
const OUTPUT_DIR = join(import.meta.dir, 'output');
const METADATA_FILE = join(OUTPUT_DIR, 'metadata.json');
const PROMPTS_FILE = join(OUTPUT_DIR, 'prompts.json');

const readMetadata = async (): Promise<ImageMetadata[]> => {
  try {
    const metadataFile = Bun.file(METADATA_FILE);
    const exists = await metadataFile.exists();
    if (!exists) { return []; }
    const data = await metadataFile.text();
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading metadata:', error);
    return [];
  }
};

const saveMetadata = async (metadata: ImageMetadata[]): Promise<boolean> => {
  try {
    console.log("Saving metadata");
    await Bun.write(METADATA_FILE, JSON.stringify(metadata, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving metadata:', error);
    return false;
  }
};

//Read prompts from file
const readPrompts = async (): Promise<Prompt[]> => {
  try {
    const promptsFile = Bun.file(PROMPTS_FILE);
    const exists = await promptsFile.exists();
    if (!exists) { return []; }
    const data = await promptsFile.text();
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading prompts:', error);
    return [];
  }
};

//Save prompts to file
const savePrompts = async (prompts: Prompt[]): Promise<boolean> => {
  try {
    console.log("Saving prompts");
    //Create output directory if it doesn't exist
    try {
      await mkdir(OUTPUT_DIR, { recursive: true });
    } catch (err) {
      //Ignore if directory already exists
    }
    await Bun.write(PROMPTS_FILE, JSON.stringify(prompts, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving prompts:', error);
    return false;
  }
};

const server = serve({
  port: process.env.PORT || 3001,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    console.log(path);

    if (path.startsWith('/images/')) {
      const filePath = join(OUTPUT_DIR, path.substring(8));
      const file = Bun.file(filePath);
      const exists = await file.exists();

      if (!exists) {
        return new Response("File not found", { status: 404, headers });
      }

      return new Response(file);
    }

    if (path.startsWith('/api/')) {
      const apiPath = path.substring(4);

      //GET /api/prompts - Get all prompts
      if (apiPath === '/prompts' && req.method === "GET") {
        const prompts = await readPrompts();
        return new Response(JSON.stringify({ success: true, data: prompts }), {
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }

      //POST /api/prompts - Save all prompts
      if (apiPath === '/prompts' && req.method === "POST") {
        try {
          const body = await req.json() as Prompt[];
          await savePrompts(body);
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...headers, "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Error saving prompts:', error);
          return new Response(JSON.stringify({
            success: false,
            error: String(error)
          }), {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" }
          });
        }
      }

      //GET /api/images - Get all images metadata
      if (apiPath === '/images' && req.method === "GET") {
        const metadata = await readMetadata();
        return new Response(JSON.stringify({ success: true, data: metadata }), {
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }

      //POST /api/images - Save an image
      if (apiPath === '/images' && req.method === "POST") {
        try {
          const body = await req.json() as SaveImageRequest;
          const { id, imageBase64, metadata } = body;

          //Checks
          if (!id || !imageBase64 || !metadata) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Missing required parameters: id, imageBase64, or metadata'
            }), {
              status: 400, //Bad request
              headers: { ...headers, "Content-Type": "application/json" }
            });
          }

          let filePath = join(OUTPUT_DIR, metadata.filename);

          //Write image file
          const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
          await Bun.write(filePath, Buffer.from(base64Data, 'base64'));

          //Save metadata
          const allMetadata = await readMetadata();
          const newImageMetadata: ImageMetadata = { ...metadata, path: filePath };

          allMetadata.push(newImageMetadata);
          await saveMetadata(allMetadata);

          return new Response(JSON.stringify({
            success: true,
            data: newImageMetadata
          }), {
            headers: { ...headers, "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Error saving image:', error);
          return new Response(JSON.stringify({
            success: false,
            error: String(error)
          }), {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" }
          });
        }
      }

      //PUT /api/images/:id - Update image metadata
      if (apiPath.startsWith('/images/') && req.method === "PUT") {
        try {
          const id = apiPath.split('/').pop();
          const updates = await req.json();

          if (!id) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Missing image ID'
            }), {
              status: 400,
              headers: { ...headers, "Content-Type": "application/json" }
            });
          }

          const metadata = await readMetadata();
          const imageIndex = metadata.findIndex(item => item.id === id);

          if (imageIndex === -1) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Image not found'
            }), {
              status: 404,
              headers: { ...headers, "Content-Type": "application/json" }
            });
          }

          const currentImage = metadata[imageIndex];

          // Handle path/folder changes
          if (updates.path && updates.path !== currentImage.path) {
            try {
              // Get current file location
              const currentPath = join(OUTPUT_DIR, currentImage.path);
              const newPath = join(OUTPUT_DIR, updates.path);

              // Check if the new path includes a folder
              if (updates.path.includes('/')) {
                const folder = dirname(newPath);
                const folderExists = await Bun.file(folder).exists();

                // Create folder if it doesn't exist
                if (!folderExists) {
                  await mkdir(folder, { recursive: true });
                  console.log(`Created folder: ${folder}`);
                }
              }

              // Read current file
              const currentFile = Bun.file(currentPath);
              if (await currentFile.exists()) {
                // Read the image data
                const imageData = await currentFile.arrayBuffer();

                // Write to new location
                await Bun.write(newPath, imageData);

                // Delete old file
                await currentFile.delete();
              }
            } catch (e) {
              console.error(`Error moving file: ${e}`);
            }
          }

          const updatedMetadata = metadata.map(item => {
            if (item.id === id) {
              return { ...item, ...updates };
            }
            return item;
          });

          await saveMetadata(updatedMetadata);

          return new Response(JSON.stringify({
            success: true,
            data: updatedMetadata[imageIndex]
          }), {
            headers: { ...headers, "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Error updating metadata:', error);
          return new Response(JSON.stringify({
            success: false,
            error: String(error)
          }), {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" }
          });
        }
      }

      // DELETE /api/images/:id - Delete image
      if (apiPath.startsWith('/images/') && req.method === "DELETE") {
        try {
          const id = apiPath.split('/')[2];
          const metadata = await readMetadata();
          const image = metadata.find(img => img.id === id);

          if (!image) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Image not found'
            }), {
              status: 404,
              headers: { ...headers, "Content-Type": "application/json" }
            });
          }

          const filePath = join(OUTPUT_DIR, image.path);
          const file = Bun.file(filePath);
          const exists = await file.exists();

          // Delete file if it exists
          if (exists) {
            await file.delete();
          }

          // Update metadata
          const updatedMetadata = metadata.filter(item => item.id !== id);
          await saveMetadata(updatedMetadata);

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...headers, "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Error deleting image:', error);
          return new Response(JSON.stringify({
            success: false,
            error: String(error)
          }), {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" }
          });
        }
      }

      // GET /api/open-folder - Open output folder
      if (apiPath === '/open-folder' && req.method === "POST") {
        try {
          // Determine the platform-specific command to open a folder
          const command = process.platform === 'win32'
            ? `explorer "${OUTPUT_DIR}"`
            : process.platform === 'darwin'
              ? `open "${OUTPUT_DIR}"`
              : `xdg-open "${OUTPUT_DIR}"`;

          // Execute the command
          exec(command, (error) => {
            if (error) {
              console.error('Error opening folder:', error);
            }
          });

          return new Response(JSON.stringify({
            success: true
          }), {
            headers: { ...headers, "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Error opening folder:', error);
          return new Response(JSON.stringify({
            success: false,
            error: String(error)
          }), {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" }
          });
        }
      }

      // GET /api/export - Export all data
      if (apiPath === '/export' && req.method === "GET") {
        try {
          const metadata = await readMetadata();
          return new Response(JSON.stringify({
            success: true,
            data: metadata
          }), {
            headers: { ...headers, "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Error exporting data:', error);
          return new Response(JSON.stringify({
            success: false,
            error: String(error)
          }), {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" }
          });
        }
      }

      // If no API endpoint matched
      return new Response('API endpoint not found', {
        status: 404,
        headers
      });
    }

    // Default: Not found
    return new Response('Not found', {
      status: 404,
      headers
    });
  },
});

console.log(`Server running on port ${server.port}`);
console.log(`Images will be saved to: ${OUTPUT_DIR}`);
console.log(`Metadata file: ${METADATA_FILE}`);
console.log(`Prompts file: ${PROMPTS_FILE}`);