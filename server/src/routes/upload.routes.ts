import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/cloudinary';

const router = Router();

// POST /api/upload
router.post('/', authenticate, upload.single('image'), (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // multer-storage-cloudinary adds 'path' (the URL) and 'filename' to the file object
    res.json({ 
      url: req.file.path,
      publicId: req.file.filename 
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
