import { v2 as cloudinary } from 'cloudinary';

// Config is applied lazily inside each exported function so that
// process.env values are read after dotenv.config() has run in server.js.
// (ES module imports are hoisted before any code executes, so module-level
//  cloudinary.config() would fire before dotenv loads the .env file.)
function applyConfig() {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

/**
 * Ping Cloudinary by calling the ping API.
 * Logs success or failure to the console.
 */
export async function checkCloudinaryConnection() {
    applyConfig();
    try {
        await cloudinary.api.ping();
        console.log(`✅ Cloudinary connected (cloud: ${process.env.CLOUDINARY_CLOUD_NAME})`);
    } catch (err) {
        console.error('❌ Cloudinary connection failed:', err.message);
    }
}

/**
 * Upload a buffer to Cloudinary.
 * Uses upload_large_stream for chunked uploads so large video files
 * (>10 MB) don't fail or time-out on a single-shot stream.
 *
 * @param {Buffer} buffer  - File buffer from multer memoryStorage
 * @param {object} options - Cloudinary upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
export function uploadToCloudinary(buffer, options = {}) {
    applyConfig();
    // CRITICAL: resource_type must be 'video' or Cloudinary rejects video files
    const opts = {
        resource_type: 'video',
        chunk_size:    6_000_000,   // 6 MB chunks — required for upload_large_stream
        ...options,
    };

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_chunked_stream(opts, (error, result) => {
            if (error) {
                console.error('[Cloudinary] Upload failed:', error.message, error.http_code);
                return reject(error);
            }
            resolve(result);
        });
        stream.end(buffer);
    });
}

export default cloudinary;
