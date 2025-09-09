const express = require('express');
const { upload, uploadToS3, deleteFromS3 } = require('../utils/fileUpload');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Upload single file
router.post('/single', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const result = await uploadToS3(req.file, 'uploads');
    
    if (result.success) {
      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: result.url,
          key: result.key,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'File upload failed',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
});

// Upload multiple files
router.post('/multiple', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadResults = [];
    
    for (const file of req.files) {
      const result = await uploadToS3(file, 'uploads');
      uploadResults.push({
        originalName: file.originalname,
        success: result.success,
        url: result.url,
        key: result.key,
        error: result.error
      });
    }

    const successfulUploads = uploadResults.filter(result => result.success);
    const failedUploads = uploadResults.filter(result => !result.success);

    res.json({
      success: true,
      message: `${successfulUploads.length} files uploaded successfully`,
      data: {
        successful: successfulUploads,
        failed: failedUploads
      }
    });
  } catch (error) {
    logger.error('Multiple file upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
});

// Delete file
router.delete('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);
    
    const result = await deleteFromS3(decodedKey);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'File deletion failed',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'File deletion failed'
    });
  }
});

// Upload business logo
router.post('/logo', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file uploaded'
      });
    }

    // Validate file type for logo
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Logo must be an image file'
      });
    }

    const result = await uploadToS3(req.file, 'logos');
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Logo uploaded successfully',
        data: {
          logoUrl: result.url
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Logo upload failed',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Logo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Logo upload failed'
    });
  }
});

// Upload receipt/document
router.post('/receipt', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No receipt file uploaded'
      });
    }

    const result = await uploadToS3(req.file, 'receipts');
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Receipt uploaded successfully',
        data: {
          receiptUrl: result.url
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Receipt upload failed',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Receipt upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Receipt upload failed'
    });
  }
});

module.exports = router;
