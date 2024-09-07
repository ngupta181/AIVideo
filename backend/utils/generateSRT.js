const fs = require('fs').promises;

function formatTime(seconds) {
  const date = new Date(seconds * 1000);
  return date.toISOString().substr(11, 12).replace('.', ',');
}

async function generateSRT(wordTimings, outputPath) {
  let srtContent = '';
  let index = 1;
  let currentLine = '';
  let lineStartTime = 0;

  for (let i = 0; i < wordTimings.length; i++) {
    const word = wordTimings[i];
    currentLine += word.word + ' ';

    // Start a new line after every 10 words or at the end
    if ((i + 1) % 10 === 0 || i === wordTimings.length - 1) {
      const lineEndTime = word.end;
      srtContent += `${index}\n`;
      srtContent += `${formatTime(lineStartTime)} --> ${formatTime(lineEndTime)}\n`;
      srtContent += `${currentLine.trim()}\n\n`;
      
      index++;
      currentLine = '';
      lineStartTime = i < wordTimings.length - 1 ? wordTimings[i + 1].start : lineEndTime;
    }
  }

  await fs.writeFile(outputPath, srtContent);
}

module.exports = generateSRT;