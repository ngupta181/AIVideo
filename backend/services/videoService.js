const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');
const sleep = promisify(setTimeout);
const ffprobeAsync = promisify(ffmpeg.ffprobe);
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const { searchVideos, downloadVideo } = require('../services/storyblocksService');


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

const fetchMediaFiles = async (queries, mediaPath, script) => {
    const { texts } = parseScript(script);
    const mediaFiles = [];
    for (const [index, keywords] of queries.entries()) {
        let media = await searchVideos(keywords);
        let attempts = 0;
        const maxAttempts = 3;

        while ((!media.results || media.results.length === 0) && attempts < maxAttempts) {
            console.log(`No media found for query: ${keywords}. Trying alternative keywords...`);
            const alternativeKeywords = generateAlternativeKeywords(keywords, texts, queries);
            media = await searchVideos(alternativeKeywords);
            attempts++;
        }

        const mediaFileUrl = media.results?.[0]?.preview_urls?._720p;
        if (mediaFileUrl) {
            const fileName = `Section_${index + 1}${path.extname(new URL(mediaFileUrl).pathname)}`;
            const filePath = path.join(mediaPath, fileName);
            await downloadVideo(mediaFileUrl, filePath);
            const duration = await getVideoDuration(filePath);
            mediaFiles.push({ path: filePath, duration });
        } else {
            console.warn(`No media found for query: ${keywords} after ${attempts} attempts`);
        }
    }
    if (mediaFiles.length === 0) {
        throw new Error('No media files were found or downloaded');
    }
    return mediaFiles;
};

const generateAlternativeKeywords = (originalKeywords, texts, queries) => {
    // Extract unique words from texts and queries
    const allWords = new Set([
        ...texts.flatMap(text => text.toLowerCase().split(/\W+/)),
        ...queries.flatMap(query => query.toLowerCase().split(/\W+/))
    ]);

    // Remove common words and very short words
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const keywords = Array.from(allWords).filter(word => word.length > 2 && !commonWords.has(word));

    // Combine original keywords with 1-2 random keywords from the script
    const originalWords = originalKeywords.toLowerCase().split(/\W+/);
    const newKeywords = [...new Set([...originalWords, ...getRandomElements(keywords, 2)])];

    return newKeywords.join(' ');
};

const getRandomElements = (array, n) => {
    const shuffled = array.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
};

const getVideoDuration = async (filePath) => {
    try {
        const metadata = await ffprobeAsync(filePath);
        const duration = metadata.format.duration;
        if (isNaN(duration) || duration <= 0) {
            console.warn(`Invalid duration for file: ${filePath}. Using default duration of 5 seconds.`);
            return 5; // Default to 5 seconds if invalid duration
        }
        return duration;
    } catch (error) {
        console.error(`Error getting duration for ${filePath}:`, error);
        return 5; // Default to 5 seconds on error
    }
};

const escapedText = (text) => {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/:/g, '\\:')
        .replace(/'/g, "'\\\\''")
        .replace(/"/g, '\\"')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\?/g, '\\?')
        .replace(/\!/g, '\\!')
        .replace(/\./g, '\\.')
        .replace(/,/g, '\\,')
        .replace(/\s/g, '\\ ');
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

const adjustVideoLength = async (videoPath, audioDuration, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .outputOptions([
                '-t', audioDuration,
                '-c:v copy',
                '-c:a copy'
            ])
            .output(outputPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
};

const createVideo = async (mediaFiles, audioPath, outputPath, wordTimings, audioDuration, manualOffset = 0, wordsPerSubtitle = 3) => {
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

        console.log('Step 3: Adjusting video length...');
        await adjustVideoLength(concatenatedVideoPath, audioDuration, adjustedVideoPath);
        console.log('Video length adjusted');

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
                await deleteFileWithRetry(file);
                console.log(`Deleted: ${file}`);
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

const analyzeAudioWaveform = (audioPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
            if (err) return reject(err);
            // Analyze the audio to find the first significant sound
            // This is a simplified example; you might need a more sophisticated analysis
            const firstSoundTime = metadata.streams[0].start_time || 0;
            resolve(firstSoundTime);
        });
    });
};

const splitSubtitles = (subtitles, wordsPerSubtitle = 3) => {
    const newSubtitles = [];
    subtitles.forEach(sub => {
        const words = sub.text.split(/\s+/);
        const totalDuration = sub.end - sub.start;
        const durationPerWord = totalDuration / words.length;

        for (let i = 0; i < words.length; i += wordsPerSubtitle) {
            const chunk = words.slice(i, i + wordsPerSubtitle).join(' ');
            const chunkStart = sub.start + (i * durationPerWord);
            const chunkEnd = Math.min(sub.end, chunkStart + (wordsPerSubtitle * durationPerWord));
            newSubtitles.push({
                start: chunkStart,
                end: chunkEnd,
                text: chunk
            });
        }
    });
    return newSubtitles;
};

const parseSubtitles = async (subtitlesPath) => {
    const content = await fs.readFile(subtitlesPath, 'utf8');
    const lines = content.split('\n');
    const subtitles = [];
    for (let i = 0; i < lines.length; i += 4) {
        if (lines[i+1] && lines[i+1].includes('-->')) {
            const [start, end] = lines[i+1].split(' --> ').map(timeToSeconds);
            subtitles.push({ start, end, text: lines[i+2] });
        }
    }
    return subtitles;
};

const adjustSubtitles = async (subtitlesPath, offset, wordsPerSubtitle = 3) => {
    const subtitles = await parseSubtitles(subtitlesPath);
    const splitSubs = splitSubtitles(subtitles, wordsPerSubtitle);
    const adjustedSubtitles = splitSubs.map(sub => ({
        ...sub,
        start: Math.max(0, sub.start + offset),
        end: Math.max(0, sub.end + offset)
    }));

    const content = adjustedSubtitles.map((sub, index) => 
        `${index + 1}\n${secondsToTime(sub.start)} --> ${secondsToTime(sub.end)}\n${sub.text}\n`
    ).join('\n');

    await fs.writeFile(subtitlesPath, content, 'utf8');
    console.log(`Subtitles adjusted and split into ${wordsPerSubtitle}-word chunks`);
};

const syncSubtitlesWithAudio = async (audioPath, subtitlesPath, wordsPerSubtitle = 3) => {
    const firstSoundTime = await analyzeAudioWaveform(audioPath);
    const subtitles = await parseSubtitles(subtitlesPath);
    const firstSubtitleTime = subtitles[0].start;
    
    const offset = firstSoundTime - firstSubtitleTime;
    console.log(`Calculated offset: ${offset} seconds`);
    
    await adjustSubtitles(subtitlesPath, offset, wordsPerSubtitle);
};

const timeToSeconds = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(':').map(parseFloat);
    return hours * 3600 + minutes * 60 + seconds;
};

const secondsToTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${padZero(hours)}:${padZero(minutes)}:${padZero(secs)}`;
};

const padZero = (num) => num.toString().padStart(2, '0');

module.exports = { createVideo, fetchMediaFiles, parseScript };
