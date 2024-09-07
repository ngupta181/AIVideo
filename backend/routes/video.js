const express = require('express');
const router = express.Router();
const { createVideo, updateVideo, getVideo, getAllVideos, streamMedia } = require('../controllers/videoController');
const auth = require('../middleware/authMiddleware');
const Video = require('../models/Video');
const path = require('path');
const fs = require('fs');
const { createImageVideo } = require('../controllers/ImageController');


// Route to create a new video
router.post('/create', auth, createVideo);
router.put('/:videoId', auth, updateVideo);

// Route to get all videos for the logged-in user
router.get('/all-videos', auth, getAllVideos);

// Route to get a single video by ID
router.get('/:videoId', auth, getVideo);

router.get('/media/:videoId/:filePath', auth, streamMedia);

// New route for DALL-E 3 video creation
router.post('/create-image-video', auth, createImageVideo);

// Stream video
router.get('/:videoId/stream', auth, async (req, res) => {
    console.log('User accessing video stream:', JSON.stringify(req.user, null, 2));
    console.log('Video ID:', req.params.videoId);

    try {
        const video = await Video.findById(req.params.videoId);
        if (!video) {
            console.log('Video not found in database:', req.params.videoId);
            return res.status(404).send('Video not found');
        }

        console.log('Video found:', JSON.stringify(video, null, 2));

        // Check if the user is authorized to access this video
        if (video.userId.toString() !== req.user._id.toString()) {
            console.log('User not authorized to access video');
            console.log('Video user ID:', video.userId);
            console.log('Request user ID:', req.user._id);
            return res.status(403).json({ error: 'Not authorized to access this video' });
        }

        const videoPath = video.filePath;
        console.log('Attempting to stream from path:', videoPath);
        
        if (!fs.existsSync(videoPath)) {
            console.log('Video file not found on server:', videoPath);
            return res.status(404).send('Video file not found');
        }

        // Set headers to prevent caching
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        // Stream the video
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
            const chunksize = (end-start)+1;
            const file = fs.createReadStream(videoPath, {start, end});
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        console.error('Error streaming video:', error);
        res.status(500).send('Error streaming video');
    }
});


module.exports = router;