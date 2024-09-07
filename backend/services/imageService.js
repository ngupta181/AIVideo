const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');
const sleep = promisify(setTimeout);
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const parseScript = (script) => {
    const titleMatch = script.match(/###\s*TITLE:\s*(.+)/);
    const textMatches = script.match(/###\s*TEXT:\s*([\s\S]*?)(?=\n###|$)/g);
    const queryMatches = script.match(/###\s*QUERY:\s*([\s\S]*?)(?=\n###|$)/g);

    return {
        title: titleMatch ? titleMatch[1].trim() : 'Untitled',
        texts: textMatches ? textMatches.map(match => match.replace(/###\s*TEXT:\s*/, '').trim()) : [],
        queries: queryMatches ? queryMatches.map(match => match.replace(/###\s*QUERY:\s*/, '').trim()) : []
    };
};

const deleteFileWithRetry = async (filePath, maxRetries = 5, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await fs.unlink(filePath);
            return;
        } catch (error) {
            if (error.code === 'EBUSY' && i < maxRetries - 1) {
                await sleep(delay);
            } else {
                throw error;
            }
        }
    }
};

const getAudioDuration = async (audioPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
            if (err) {
                return reject(err);
            }
            const duration = metadata.format.duration;
            console.log(`Actual audio duration: ${duration} seconds`);
            resolve(duration);
        });
    });
};

const adjustVideoLengthAndRatio = async (videoPath, audioDuration, outputPath, aspectRatio) => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .outputOptions([
                '-t', audioDuration,
                '-vf', `scale=${aspectRatio.width * 100}:${aspectRatio.height * 100}:force_original_aspect_ratio=decrease,pad=${aspectRatio.width * 100}:${aspectRatio.height * 100}:(ow-iw)/2:(oh-ih)/2`,
                '-c:a copy'
            ])
            .output(outputPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
};

const createSubtitlesFile = async (wordTimings, subtitlesPath, audioDuration, wordsPerSubtitle = 3) => {
    let srtContent = '';
    let subtitleIndex = 1;
    let currentSubtitle = [];
    let startTime = 0;

    for (let i = 0; i < wordTimings.length; i++) {
        currentSubtitle.push(wordTimings[i].word);

        if (currentSubtitle.length === wordsPerSubtitle || i === wordTimings.length - 1) {
            const endTime = i === wordTimings.length - 1 ? audioDuration : wordTimings[i].end;
            srtContent += `${subtitleIndex}\n`;
            srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
            srtContent += `${currentSubtitle.join(' ')}\n\n`;

            subtitleIndex++;
            currentSubtitle = [];
            startTime = i + 1 < wordTimings.length ? wordTimings[i + 1].start : endTime;
        }
    }

    // Add a final subtitle if there's a gap between the last word and the audio end
    if (startTime < audioDuration) {
        srtContent += `${subtitleIndex}\n`;
        srtContent += `${formatTime(startTime)} --> ${formatTime(audioDuration)}\n`;
        srtContent += `[Music]\n\n`;  // Or any appropriate text for the final segment
    }

    await fs.writeFile(subtitlesPath, srtContent);
};

const formatTime = (seconds) => {
    const date = new Date(seconds * 1000);
    return date.toISOString().substr(11, 12).replace('.', ',');
};

const applySubtitles = async (inputPath, subtitlesPath, outputPath) => {
    return new Promise((resolve, reject) => {
        console.log('Applying subtitles...');
        console.log('Input video:', inputPath);
        console.log('Subtitles file:', subtitlesPath);
        console.log('Output path:', outputPath);

        const ffmpeg = require('fluent-ffmpeg');
        const path = require('path');

        const absoluteInputPath = path.resolve(inputPath);
        const absoluteSubtitlesPath = path.resolve(subtitlesPath);
        const absoluteOutputPath = path.resolve(outputPath);

        const escapedSubtitlesPath = absoluteSubtitlesPath.replace(/\\/g, '/').replace(/:/g, '\\:');

        ffmpeg(absoluteInputPath)
            .outputOptions('-vf', `subtitles='${escapedSubtitlesPath}':force_style='FontSize=24,FontName=Arial,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BackColour=&H00000000,Outline=1,Shadow=0,Alignment=10'`)
            .output(absoluteOutputPath)
            .on('start', (commandLine) => {
                console.log('FFmpeg command:', commandLine);
            })
            .on('end', () => {
                console.log('Subtitles applied successfully');
                resolve();
            })
            .on('error', (err, stdout, stderr) => {
                console.error('Error applying subtitles:', err);
                console.error('FFmpeg stdout:', stdout);
                console.error('FFmpeg stderr:', stderr);
                reject(err);
            })
            .run();
    });
};

const addAudioToVideo = async (videoPath, audioPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions(['-c:v copy', '-c:a aac', '-map 0:v:0', '-map 1:a:0', '-shortest'])
            .output(outputPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
};

const createImageVideo = async (mediaFiles, audioPath, outputPath, wordTimings, wordsPerSubtitle = 3, aspectRatio = { width: 9, height: 16 }) => {
    const tempDir = path.join(__dirname, 'tmp');
    const concatenatedVideoPath = path.join(tempDir, 'concatenated.mp4');
    const adjustedVideoPath = path.join(tempDir, 'adjusted.mp4');
    const subtitledVideoPath = path.join(tempDir, 'subtitled.mp4');
    const subtitlesPath = path.join(tempDir, 'subtitles.srt');

    try {
        await fs.mkdir(tempDir, { recursive: true });

        console.log('Step 1: Concatenating videos...');
        await concatenateVideos(mediaFiles, concatenatedVideoPath);
        console.log('Concatenation complete');

        console.log('Step 2: Getting audio duration...');
        const audioDuration = await getAudioDuration(audioPath);
        console.log('Audio duration:', audioDuration);

        console.log('Step 3: Adjusting video length and aspect ratio...');
        await adjustVideoLengthAndRatio(concatenatedVideoPath, audioDuration, adjustedVideoPath, aspectRatio);
        console.log('Video length and aspect ratio adjusted');

        console.log('Step 4: Creating subtitles file...');
        await createSubtitlesFile(wordTimings, subtitlesPath, audioDuration, wordsPerSubtitle);
        console.log('Subtitles file created');

        console.log('Step 5: Applying subtitles...');
        await applySubtitles(adjustedVideoPath, subtitlesPath, subtitledVideoPath);
        console.log('Subtitles applied');

        console.log('Step 6: Adding audio...');
        await addAudioToVideo(subtitledVideoPath, audioPath, outputPath);
        console.log('Audio added');

        console.log('Video created successfully at:', outputPath);
    } catch (error) {
        console.error('Error in createVideo:', error);
        throw error;
    } finally {
        console.log('Cleaning up temporary files...');
        const tempFiles = [concatenatedVideoPath, adjustedVideoPath, subtitledVideoPath, subtitlesPath];

        for (const file of tempFiles) {
            try {
                //await deleteFileWithRetry(file);
                //console.log(`Deleted: ${file}`);
            } catch (error) {
                console.error(`Error deleting ${file}:`, error);
            }
        }
    }
};

const concatenateVideos = async (mediaFiles, outputPath) => {
    const concatListPath = path.join(path.dirname(outputPath), 'concat_list.txt');
    await fs.writeFile(concatListPath, mediaFiles.map(file => `file '${file.path.replace(/\\/g, '/')}'`).join('\n'));

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatListPath)
            .inputOptions(['-f concat', '-safe 0'])
            .outputOptions(['-c copy', '-movflags +faststart'])
            .output(outputPath)
            .on('end', () => {
                deleteFileWithRetry(concatListPath).catch(console.error);
                resolve();
            })
            .on('error', reject)
            .run();
    });
};

module.exports = { createImageVideo, parseScript };