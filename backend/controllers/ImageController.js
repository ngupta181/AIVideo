const { aiVideoGenerationScript} = require('../services/aiService');
const { parseScript, createImageVideo: createVideoService  } = require('../services/imageService');
//const { generateImage, generateMotion, pollForMotionVideo } = require('../services/leonardoService');
const { generateImage } = require('../services/leonardoService');

const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const Video = require('../models/Video');
const axios = require('axios');
const openaiTTS = require('../utils/openaiTTS');
const generateSRT = require('../utils/generateSRT');

const TMP_DIR = path.join(__dirname, '..', 'tmp');

const ASPECT_RATIO = {
    width: 9,
    height: 16
};

const createImageVideo = async (req, res) => {
    const { topic } = req.body;
    let video;
    let tempDir;
    let userDir;

    try {
        // Create a new video document
        video = new Video({
            userId: req.user._id,
            title: topic,
            status: 'processing'
        });
        await video.save();

        const videoId = video._id.toString();
        userDir = path.join(__dirname, '..', 'users', req.user._id.toString(), videoId);
        tempDir = path.join(TMP_DIR, videoId);

        
        const paths = {
            media: path.join(userDir, 'media'),
            audio: path.join(userDir, 'audio'),
            output: path.join(userDir, 'output'),
            temp: tempDir
        };

        // Create directories
        await Promise.all(Object.values(paths).map(p => fsPromises.mkdir(p, { recursive: true })));
        
        // Generate script
        const script = await aiVideoGenerationScript(topic);
        await fsPromises.writeFile(path.join(userDir, 'script.txt'), script);

        // Parse script
        const { title, texts, queries } = parseScript(script);
        
        // Generate image using Leonardo AI
        const mediaFiles = [];
        for (let i = 0; i < queries.length; i++) {
            const query = queries[i];
            const imagePath = path.join(paths.media, `image_${i + 1}.png`);
            
            console.log(`Generating image for query ${i + 1}: ${query}`);
            const { imageId } = await generateImage(query, imagePath, ASPECT_RATIO.width * 100, ASPECT_RATIO.height * 100);
            console.log(`Image generated with ID: ${imageId}`);

            // Generate motion video
           /*  console.log(`Generating motion video for image ID: ${imageId}`);
            const motionResult = await generateMotion(imageId);
            console.log('Motion generation result:', JSON.stringify(motionResult, null, 2));

            if (!motionResult || !motionResult.motionSvdGenerationJob || !motionResult.motionSvdGenerationJob.generationId) {
                throw new Error(`Failed to start motion video generation for query ${i + 1}`);
            }

            const generationId = motionResult.motionSvdGenerationJob.generationId;
            console.log(`Motion video generation started with ID: ${generationId}`);

            console.log(`Polling for motion video with generation ID: ${generationId}`);
            const motionVideoData = await pollForMotionVideo(generationId);
            
            if (motionVideoData && motionVideoData.motionMP4URL) {
                const videoFileName = `motion_video_${i + 1}.mp4`;
                const videoPath = path.join(paths.media, videoFileName);
                console.log(`Downloading motion video from: ${motionVideoData.motionMP4URL}`);
                await downloadVideo(motionVideoData.motionMP4URL, videoPath);
                mediaFiles.push({ path: videoPath, duration: 5 }); // Assuming 5 seconds duration for each video
                console.log(`Motion video ${i + 1} saved to: ${videoPath}`);
            } else {
                throw new Error(`Failed to generate motion video for query ${i + 1}`);
            } */
                mediaFiles.push({ path: imagePath, duration: 5 }); // Assuming 5 seconds duration for each image
            }

        // Generate audio using OpenAI TTS
        const audioPath = path.join(paths.audio, 'narration.mp3');
        const fullText = texts.join(' ');
        const { wordTimings, audioDuration } = await openaiTTS(fullText, audioPath);

        // Check if wordTimings is empty or undefined
        if (!wordTimings || wordTimings.length === 0) {
            throw new Error('No word timings received from TTS service');
        }

        // Generate SRT file
        const srtPath = path.join(paths.audio, 'subtitles.srt');
        await generateSRT(wordTimings, srtPath, audioDuration);

        // Adjust media files to match audio duration
        const adjustedMediaFiles = await adjustMediaDuration(mediaFiles, audioDuration);

        // Use a shorter output file name
        const outputFileName = `output_${video._id}.mp4`;
        const outputPath = path.join(paths.output, outputFileName);

        // Create video with subtitles and specified aspect ratio
        await createVideoService(adjustedMediaFiles, audioPath, outputPath, wordTimings, 3, ASPECT_RATIO);
        console.log("Video created at:", outputPath);

        video.title = title;
        video.filePath = outputPath;
        video.scripts = { title, texts, queries };
        video.mediaFiles = adjustedMediaFiles;
        video.status = 'completed';
        await video.save();

        console.log("Video creation process completed successfully");
        res.status(201).json({
            message: 'Video created successfully',
            videoId: video._id,
            script: video.scripts,
            media: video.mediaFiles
        });

    } catch (error) {
        console.error('Error in createImageVideo:', error.message, error.stack);
        if (video) {
            video.status = 'failed';
            video.errorMessage = error.message;
            await video.save();
        }
        res.status(500).json({ error: 'Error creating video', message: error.message });
    } finally {
        // Clean up temporary directory if it was created
        if (tempDir) {
            try {
                await fsPromises.rm(tempDir, { recursive: true, force: true });
                console.log(`Temporary directory cleaned up: ${tempDir}`);
            } catch (cleanupError) {
                console.error('Error cleaning up temporary directory:', cleanupError);
            }
        }
    }
};


// Helper function to download video
/* async function downloadVideo(url, outputPath) {
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
} */

async function adjustMediaDuration(mediaFiles, targetDuration) {
    const totalDuration = mediaFiles.reduce((sum, file) => sum + file.duration, 0);
    const scaleFactor = targetDuration / totalDuration;

    return mediaFiles.map(file => ({
        ...file,
        duration: file.duration * scaleFactor
    }));
}

//module.exports = { createImageVideo, downloadVideo, adjustMediaDuration };
module.exports = { createImageVideo, adjustMediaDuration };