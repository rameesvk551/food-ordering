import { Router } from 'express';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import { upload, usingCloudinary } from '../config/cloudinary';

const router = Router();

// POST /api/upload
router.post('/', authenticate, upload.single('image'), (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const provider = String(req.query.provider || '').toLowerCase();
    if (provider === 'cloudinary' && !usingCloudinary) {
      if (req.file.path) {
        fs.promises.unlink(req.file.path).catch(() => undefined);
      }
      return res.status(503).json({
        error: 'Cloudinary is not configured on server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      });
    }

    // Cloudinary provides a remote URL in file.path; disk storage needs a public uploads URL.
    const url = usingCloudinary ? req.file.path : `/uploads/${req.file.filename}`;

    res.json({
      url,
      publicId: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
