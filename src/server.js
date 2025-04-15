// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow requests from your frontend
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));

// Configure output directory
const OUTPUT_DIR = path.join(__dirname, 'output');
const METADATA_FILE = path.join(OUTPUT_DIR, 'metadata.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created output directory: ${OUTPUT_DIR}`);
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, OUTPUT_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// Helper function to read metadata
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

// Helper function to save metadata
const saveMetadata = (metadata) => {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving metadata:', error);
    return false;
  }
};

// API Endpoints

// Get all images metadata
app.get('/api/images', (req, res) => {
  const metadata = readMetadata();
  res.json({ success: true, data: metadata });
});

// Save an image
app.post('/api/images', (req, res) => {
  try {
    const { id, imageBase64, metadata } = req.body;
    
    // Create filename
    const filename = metadata.filename;
    const filePath = path.join(OUTPUT_DIR, filename);
    
    // Write image file (remove data URL prefix)
    const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    
    // Update metadata
    const allMetadata = readMetadata();
    allMetadata.push({
      ...metadata,
      path: filename // Save relative path
    });
    saveMetadata(allMetadata);
    
    res.json({ 
      success: true, 
      data: { ...metadata, path: filename }
    });
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Get image by ID
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

// Update image metadata
app.put('/api/images/:id', (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    
    const metadata = readMetadata();
    const updatedMetadata = metadata.map(item => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    });
    
    saveMetadata(updatedMetadata);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating metadata:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Delete image
app.delete('/api/images/:id', (req, res) => {
  try {
    const id = req.params.id;
    const metadata = readMetadata();
    const image = metadata.find(img => img.id === id);
    
    if (!image) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    
    const filePath = path.join(OUTPUT_DIR, image.path);
    
    // Delete file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Update metadata
    const updatedMetadata = metadata.filter(item => item.id !== id);
    saveMetadata(updatedMetadata);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Export all data
app.get('/api/export', (req, res) => {
  try {
    const metadata = readMetadata();
    res.json({ success: true, data: metadata });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});