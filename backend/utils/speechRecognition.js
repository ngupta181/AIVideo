require('dotenv').config();
const speech = require('@google-cloud/speech');
const fs = require('fs');

//process.env.GOOGLE_APPLICATION_CREDENTIALS;

const client = new speech.SpeechClient();

async function getSpeechTimings(audioFilePath) {
    const file = fs.readFileSync(audioFilePath);
    const audioBytes = file.toString('base64');

    const audio = {
        content: audioBytes,
    };
    const config = {
        encoding: 'MP3',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableWordTimeOffsets: true,
    };
    const request = {
        audio: audio,
        config: config,
    };

    const [response] = await client.recognize(request);
    const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
    console.log(`Transcription: ${transcription}`);

    const wordTimings = response.results
        .flatMap(result => result.alternatives[0].words)
        .map(wordInfo => ({
            word: wordInfo.word,
            startTime: wordInfo.startTime.seconds + wordInfo.startTime.nanos / 1e9,
            endTime: wordInfo.endTime.seconds + wordInfo.endTime.nanos / 1e9,
        }));

    return wordTimings;
}

module.exports = getSpeechTimings;