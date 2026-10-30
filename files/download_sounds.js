const fs = require('fs');
const path = require('path');
const https = require('https');

const notes = [
  'C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4',
  'C5', 'Db5', 'D5', 'Eb5', 'E5', 'F5', 'Gb5', 'G5', 'Ab5', 'A5', 'Bb5', 'B5'
];

const baseUrl = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/';
const outputDir = path.join(__dirname, '../assets/sounds');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading 24 piano notes...');
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const url = `${baseUrl}${note}.mp3`;
    // We map Db4 to note_1.mp3, etc. for easy sequential array access in the app
    const dest = path.join(outputDir, `note_${i}.mp3`);
    try {
      await download(url, dest);
      console.log(`Downloaded ${note}.mp3 to note_${i}.mp3`);
    } catch (e) {
      console.error(`Failed to download ${note}: ${e.message}`);
    }
  }
  console.log('All sounds downloaded successfully!');
}

main();
