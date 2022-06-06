/*******************************************************************************
Helper script that updates data files with proposed new mappings

Run with:
node src/update-mappings.js [--known]
*******************************************************************************/

import esMain from 'es-main';
import { findMappings } from './find-mappings.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const owner = 'w3c';
const repo = 'browser-statuses';

// Compute __dirname (not exposed when ES6 modules are used)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processMappings(mappings, dataFolder) {
  const changes = Object.keys(mappings)
    .filter(shortname => mappings[shortname].analysis.changes.length > 0);
  let i = 0;
  for (const shortname of changes) {
    const dataFile = path.join(dataFolder, `${shortname}.json`);
    let dataFileContents = null;
    try {
      dataFileContents = JSON.parse(await fs.promises.readFile(dataFile, 'utf8'));
    }
    catch {
      dataFileContents = {};
    }
    dataFileContents.statusref = mappings[shortname].statusref;
    await fs.promises.writeFile(dataFile,
      JSON.stringify(dataFileContents, null, 2), 'utf8');
    console.log(`- wrote ${dataFile}`);
  }
}


/*******************************************************************************
Main loop
*******************************************************************************/
if (esMain(import.meta)) {
  const onlyExistingOnes = !!process.argv.find(arg => arg === '--known');
  let nb = process.argv.find(arg => arg.match(/^\d+$/));
  if (nb) {
    nb = parseInt(nb, 10);
  }
  else {
    nb = 5;
  }
  
  const dataFolder = path.join(__dirname, '..', 'data');
  findMappings(dataFolder, onlyExistingOnes)
    .then(mappings => processMappings(mappings, dataFolder))
    .then(_ => console.log('done'));
}