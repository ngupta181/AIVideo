const OpenAI = require('openai');
const fs = require('fs');
const { getAudioDurationInSeconds } = require('get-audio-duration');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function openaiTTS(text, outputPath) {
    const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(outputPath, buffer);

    const audioDuration = await getAudioDurationInSeconds(outputPath);
    console.log(`Actual audio duration: ${audioDuration} seconds`);

    const words = text.split(/\s+/);
    const wordDuration = audioDuration / words.length;

    const wordTimings = words.map((word, index) => ({
        word,
        start: index * wordDuration,
        end: (index + 1) * wordDuration
    }));

    return { wordTimings, audioDuration };
}

module.exports = openaiTTS;