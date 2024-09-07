const { generateScript } = require('../services/aiService');
const { parseScript, createImageVideo: createVideoService } = require('../services/imageService');
const path = require('path');
const fs = require('fs').promises;
const openaiTTS = require('../utils/openaiTTS');
const generateSRT = require('../utils/generateSRT');
const crypto = require('crypto');
const User = require('../models/User');
const Video = require('../models/Video');
const util = require('util');
const statAsync = util.promisify(fs.stat);
const { generateImage } = require('../services/dalleService');

// Define the temporary directory
const TMP_DIR = path.join(__dirname, '..', 'services', 'tmp');


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
        await Promise.all(Object.values(paths).map(p => fs.mkdir(p, { recursive: true })));
        
        // Generate script
        const script = await generateScript(topic);
        await fs.writeFile(path.join(userDir, 'script.txt'), script);

        // Parse script
        const { title, texts, queries } = parseScript(script);
        
        // Generate images using DALL-E 3
       /*  const mediaFiles = await Promise.all(queries.map(async (query, index) => {
            const imagePath = path.join(paths.media, `image_${index + 1}.png`);
            await generateImage(query, imagePath);
            return { path: imagePath, duration: 8.2128 }; // Adjust duration as needed
        })); */

        const mediaFiles = await Promise.all(texts.map(async (text, index) => {
            const query = queries[index];
            const imagePath = path.join(paths.media, `image_${index + 1}.png`);
            await generateImage(text, query, topic, imagePath, index, texts.length);
            return { path: imagePath, duration: 5 }; // Adjust duration as needed
        }));

        // Generate audio using OpenAI TTS
        const audioPath = path.join(paths.audio, 'narration.mp3');
        const fullText = texts.join(' ');
        const { wordTimings, audioDuration } = await openaiTTS(fullText, audioPath);

        console.log('Word timings:', wordTimings); // For debugging
        console.log('Last few word timings:', wordTimings.slice(-5)); // Added this line
        console.log('Audio duration:', audioDuration); // Add this line for debugging

        // Check if wordTimings is empty or undefined
        if (!wordTimings || wordTimings.length === 0) {
            throw new Error('No word timings received from TTS service');
        }

        // Generate SRT file
        const srtPath = path.join(paths.audio, 'subtitles.srt');
        await generateSRT(wordTimings, srtPath, audioDuration);

        // Create subtitles array with accurate timings for each word
        const subtitles = wordTimings.map(word => ({
            text: word.word,
            startTime: word.start,
            endTime: word.end
        }));

        // Adjust media files to match audio duration
        const adjustedMediaFiles = await adjustMediaDuration(mediaFiles, audioDuration);

        // Use a shorter output file name
        const outputFileName = `output_${video._id}.mp4`;
        const outputPath = path.join(paths.output, outputFileName);

        // Create video with subtitles
        await createVideoService(adjustedMediaFiles, audioPath, outputPath, wordTimings, audioDuration, 0, 3);
        console.log("Video created at:", outputPath);

        video.title = title;
        video.filePath = outputPath;
        video.scripts = { title, texts, queries };
        video.mediaFiles = adjustedMediaFiles;
        video.status = 'completed';
        await video.save();

        res.status(201).json({
            message: 'Video created successfully',
            videoId: video._id,
            script: video.scripts,
            media: video.mediaFiles
        });

    } catch (error) {
        console.error('Error in createImageVideo:', error.message, error.stack);
        res.status(500).json({ error: 'Error creating video', details: error.message });
    }
};

// Function to adjust media duration
async function adjustMediaDuration(mediaFiles, targetDuration) {
    const totalDuration = mediaFiles.reduce((sum, file) => sum + file.duration, 0);
    const scaleFactor = targetDuration / totalDuration;

    return mediaFiles.map(file => ({
        ...file,
        duration: file.duration * scaleFactor
    }));
}

const updateVideo = async (req, res) => {
  const { videoId } = req.params;
  const { script, media } = req.body;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this video' });
    }

    // Update script
    video.scripts[0].texts = script.split('\n');

    // Update media
    video.media = media;

    await video.save();

    res.status(200).json({
      message: 'Video updated successfully',
      video: video
    });

  } catch (error) {
    console.error('Error in updateVideo:', error);
    res.status(500).json({ error: 'Error updating video' });
  }
};

const getAllVideos = async (req, res) => {
    try {
        const userId = req.user._id;
        const videos = await Video.find({ userId });
        console.log('Fetched videos:', videos); // Debugging line
        res.status(200).json({ videos });
    } catch (error) {
        console.error('Error fetching videos:', error.message);
        res.status(500).json({ error: 'Error fetching videos' });
    }
};

const getVideo = async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const video = await Video.findById(videoId);

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        if (video.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to access this video' });
        }

        res.status(200).json({
            id: video._id,
            title: video.title,
            filePath: video.filePath,
            scripts: video.scripts || [],
            mediaFiles: video.mediaFiles || [],
        });
    } catch (error) {
        console.error('Error fetching video data:', error.message);
        res.status(500).json({ error: 'Error fetching video data' });
    }
};

const streamMedia = async (req, res) => {
    const { videoId, filePath } = req.params;
    const userId = req.user._id;

    // Find the video to get the shortTopic
    const video = await Video.findById(videoId);
    if (!video) {
        return res.status(404).send('Video not found');
    }

     // Construct the path relative to your server's media storage location
   // Construct the path relative to your server's media storage location
   const fullPath = path.join(__dirname, '..', 'users', userId.toString(), videoId, 'media', filePath);
   console.log('Attempting to access file:', fullPath);

   try {
       await fs.access(fullPath);
       console.log('File exists');
   } catch (error) {
       console.log('File not found:', fullPath);
       return res.status(404).send('Media file not found');
   }

    // Set headers to prevent caching
    res.set({
       'Cache-Control': 'no-cache, no-store, must-revalidate',
       'Pragma': 'no-cache',
       'Expires': '0'
   });

   res.setHeader('Content-Type', 'video/mp4');

   const stat = await statAsync(fullPath);
   const fileSize = stat.size;
   const range = req.headers.range;

   console.log('File stats:', { fileSize, range });


    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(fullPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'application/octet-stream',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'application/octet-stream',
        };
        res.writeHead(200, head);
        fs.createReadStream(fullPath).pipe(res);
    }
};


module.exports = { createImageVideo, updateVideo, getVideo, getAllVideos, streamMedia };