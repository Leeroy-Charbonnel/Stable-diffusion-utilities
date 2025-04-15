// server.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';

//Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

//Configure CORS to allow requests from your frontend
app.use(bodyParser.json({limit: '50mb'}));

//Configure output directory
const OUTPUT_DIR = path.join(__dirname, 'output');
const METADATA_FILE = path.join(OUTPUT_DIR, 'metadata.json');

//Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created output directory: ${OUTPUT_DIR}`);
}

//Helper function to read metadata
const readMetadata = () => {
  try {
    if (!fs.existsSync(METADATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(METADATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading metadata:', error);
    return [];
  }
};

//Helper function to save metadata
const saveMetadata = (metadata) => {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving metadata:', error);
    return false;
  }
};

//Serve static files from the output directory
app.use('/images', express.static(OUTPUT_DIR));

//API Endpoints

//Get all images metadata
app.get('/api/images', (req, res) => {
  const metadata = readMetadata();
  res.json({ success: true, data: metadata });
});

//Save an image
app.post('/api/images', (req, res) => {
  try {
    const { id, imageBase64, metadata } = req.body;
    
    if (!id || !imageBase64 || !metadata) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: id, imageBase64, or metadata' 
      });
    }
    
    //Create filename with timestamp to ensure uniqueness
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `img_${timestamp}_${id.slice(0, 8)}.png`;
    const filePath = path.join(OUTPUT_DIR, filename);
    
    //Write image file (remove data URL prefix if present)
    const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    
    //Update metadata
    const allMetadata = readMetadata();
    const newImageMetadata = {
      ...metadata,
      id,
      path: filename,
      createdAt: new Date().toISOString()
    };
    
    allMetadata.push(newImageMetadata);
    saveMetadata(allMetadata);
    
    res.json({ 
      success: true, 
      data: newImageMetadata
    });
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

//Get image by ID
app.get('/api/images/:id', (req, res) => {
  try {
    const id = req.params.id;
    const metadata = readMetadata();
    const image = metadata.find(img => img.id === id);
    
    if (!image) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    
    const filePath = path.join(OUTPUT_DIR, image.path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Image file not found' });
    }
    
    const imageBuffer = fs.readFileSync(filePath);
    const base64Data = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    
    res.json({ success: true, data: base64Data });
  } catch (error) {
    console.error('Error getting image:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

//Update image metadata
app.put('/api/images/:id', (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Missing image ID' });
    }
    
    const metadata = readMetadata();
    const imageIndex = metadata.findIndex(item => item.id === id);
    
    if (imageIndex === -1) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    
    const updatedMetadata = metadata.map(item => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    });
    
    saveMetadata(updatedMetadata);
    
    res.json({ success: true, data: updatedMetadata[imageIndex] });
  } catch (error) {
    console.error('Error updating metadata:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

//Delete image
app.delete('/api/images/:id', (req, res) => {
  try {
    const id = req.params.id;
    const metadata = readMetadata();
    const image = metadata.find(img => img.id === id);
    
    if (!image) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    
    const filePath = path.join(OUTPUT_DIR, image.path);
    
    //Delete file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    //Update metadata
    const updatedMetadata = metadata.filter(item => item.id !== id);
    saveMetadata(updatedMetadata);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

//Export all data
app.get('/api/export', (req, res) => {
  try {
    const metadata = readMetadata();
    res.json({ success: true, data: metadata });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

//Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Images will be saved to: ${OUTPUT_DIR}`);
  console.log(`Metadata file: ${METADATA_FILE}`);
});