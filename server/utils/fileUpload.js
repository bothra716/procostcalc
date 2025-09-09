const multer = require('multer');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const { logger } = require('./logger');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Upload file to S3
const uploadToS3 = async (file, folder = 'uploads') => {
  try {
    let fileBuffer = file.buffer;
    let contentType = file.mimetype;
    let key = `${folder}/${Date.now()}-${file.originalname}`;

    // Process images
    if (file.mimetype.startsWith('image/')) {
      // Resize and optimize image
      fileBuffer = await sharp(file.buffer)
        .resize(1200, 1200, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      contentType = 'image/jpeg';
      key = key.replace(/\.[^/.]+$/, '.jpg');
    }

    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: 'public-read'
    };

    const result = await s3.upload(uploadParams).promise();
    
    logger.info(`File uploaded to S3: ${result.Location}`);
    return {
      success: true,
      url: result.Location,
      key: result.Key
    };
  } catch (error) {
    logger.error('S3 upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
  try {
    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    };

    await s3.deleteObject(deleteParams).promise();
    logger.info(`File deleted from S3: ${key}`);
    return { success: true };
  } catch (error) {
    logger.error('S3 delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate signed URL for private files
const getSignedUrl = async (key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Expires: expiresIn
    };

    const url = await s3.getSignedUrl('getObject', params);
    return {
      success: true,
      url
    };
  } catch (error) {
    logger.error('S3 signed URL error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  upload,
  uploadToS3,
  deleteFromS3,
  getSignedUrl
};
