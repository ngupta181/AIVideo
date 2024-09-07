const gtts = require('gtts');
const path = require('path');

const textToSpeech = (text, outputPath) => {
    return new Promise((resolve, reject) => {
        const speech = new gtts(text);
        speech.save(outputPath, (err) => {
            if (err) {
                return reject(err);
            }
            resolve(outputPath);
        });
    });
};

module.exports = textToSpeech;
