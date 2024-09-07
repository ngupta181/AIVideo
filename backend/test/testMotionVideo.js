require('dotenv').config(); // Load environment variables
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { pollForMotionVideo } = require('../services/leonardoService');

async function ensureDirectoryExists(dirPath) {
    try {
        await fsPromises.access(dirPath);
    } catch (error) {
        await fsPromises.mkdir(dirPath, { recursive: true });
    }
}

async function downloadVideo(url, outputPath) {
    await ensureDirectoryExists(path.dirname(outputPath));

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function testPollAndDownloadMotionVideo() {
    try {
        // Replace this with an actual generation ID from a recent Leonardo AI request
        const generationId = '1e91d5ab-ca87-4cff-b5da-54b223083ef0';
        
        console.log(`Starting to poll for motion video with generation ID: ${generationId}`);
        
        const result = await pollForMotionVideo(generationId);
        
        console.log('Polling result:', JSON.stringify(result, null, 2));

        if (result && result.motionMP4URL) {
            const outputPath = path.join(__dirname, '..', 'media', 'test_motion_video.mp4');
            console.log(`Attempting to download video to: ${outputPath}`);

            await downloadVideo(result.motionMP4URL, outputPath);

            console.log(`Video successfully downloaded to: ${outputPath}`);

            // Verify the file exists and log its size
            const stats = await fsPromises.stat(outputPath);
            console.log(`Downloaded file size: ${stats.size} bytes`);
        } else {
            console.log('No motion video URL found in the polling result');
        }
    } catch (error) {
        console.error('Error during polling or downloading:', error);
    }
}

testPollAndDownloadMotionVideo();