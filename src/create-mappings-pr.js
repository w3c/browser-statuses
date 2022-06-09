/*******************************************************************************
Helper script that creates a number of pull requests with proposed new mappings

Run with:
node src/create-mappings-pr.js [nb] --known
... where [nb] is the maximum number of pull requests to create (5 by default)
*******************************************************************************/

import esMain from 'es-main';
import { findMappings } from './find-mappings.js';
import { Octokit } from './octokit.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const owner = 'w3c';
const repo = 'browser-statuses';

// Compute __dirname (not exposed when ES6 modules are used)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/*******************************************************************************
Retrieve GH_TOKEN from environment, prepare Octokit and kick things off
*******************************************************************************/
const GH_TOKEN = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config.json'), 'utf8')).GH_TOKEN;
  } catch {
    return process.env.GH_TOKEN;
  }
})();
if (!GH_TOKEN) {
  console.error('GH_TOKEN must be set to some personal access token as an env variable or in a config.json file');
  process.exit(1);
}

const octokit = Octokit({
  auth: GH_TOKEN
  //log: console
});


function btoa(str) {
  return Buffer.from(str).toString('base64');
}

function esc(title) {
  return (title ?? '').replace(/</g, '&lt;');
}

async function createMappingsPR(shortname, mappings) {
  console.log();
  console.log(`Create mappings PR for "${shortname}"`);
  console.log('- Get latest commit on current branch');
  const latestCommitSha = execSync('git log -n 1 --pretty=format:"%H"', { encoding: 'utf8' }).trim();
  console.log(`- Current branch is at ${latestCommitSha}`);

  console.log('- Look for a pending PR for the shortname');
  const searchResponse = await octokit.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} type:pr state:open head:data-${shortname}-mappings`
  });
  const found = searchResponse?.data?.items?.[0];

  const pendingPRResponse = found ?
    await octokit.pulls.get({
      owner, repo,
      pull_number: found.number
    }) :
    null;
  const pendingPR = pendingPRResponse?.data;
  console.log(pendingPR ?
    `- Found pending PR for same spec series: ${pendingPR.title} (#${pendingPR.number})` :
    '- No pending PR for same spec series');
  if (pendingPR) {
    return false;
  }

  console.log('- Update data file');
  let dataFileExists = false;
  let dataFile = null;
  try {
    dataFile = JSON.parse(fs.readFileSync(
      path.join(__dirname, '..', 'data', `${shortname}.json`),
      'utf8'));
    dataFileExists = true;
    console.log('- Data file already exists')
  }
  catch {
    dataFile = {};
    dataFileExists = false;
    console.log('- Data file does not exist yet')
  }
  dataFile.statusref = mappings.statusref;
  const updatedDataFileContents = btoa(JSON.stringify(dataFile, null, 2));
  console.log(`- Data file updated`);

  console.log('- Prepare PR title and body');
  const title = `Update platform status references for "${shortname}"`;
  const body = `
🤖 This pull request was automatically created to facilitate human review of data changes for the \`data/${shortname}.json\` file.

🧐 Please check the todos below. If all looks good, merge this pull request to release the changes to npm. If changes are needed, push additional commits to this pull request before you merge.

General info about the proposed pull request:
` + mappings.analysis.info.filter(info => !info.includes('same mapping')).map(info => `- ${esc(info)}`).join('\n') + `

Changes introduced by the pull request:
` + mappings.analysis.changes.map(change => `- ${esc(change)}`).join('\n') + `

**Additional things to review:**
` + mappings.analysis.todo.map(todo => `- [ ] ${esc(todo)}`).join('\n');
  console.log(`- title: ${title}`);

  const prRef = `data-${shortname}-mappings`;
  console.log(`- Create new branch ${prRef} for the PR`);
  await octokit.git.createRef({
    owner, repo,
    ref: `refs/heads/${prRef}`,
    sha: latestCommitSha
  });
  
  console.log('- Commit updated data to PR branch');
  let resp = null;
  if (dataFileExists) {
    const fileResponse = await octokit.repos.getContent({
      owner, repo, path: `data/${shortname}.json`
    });

    resp = await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      branch: prRef,
      path: `data/${shortname}.json`,
      message: `Update platform status references for ${shortname}`,
      content: updatedDataFileContents,
      sha: fileResponse.data.sha,
    });
  }
  else {
    resp = await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      branch: prRef,
      path: `data/${shortname}.json`,
      message: `Create platform status references for ${shortname}`,
      content: updatedDataFileContents
    });
  }
  
  console.log('- Actually create PR');
  const defaultBranchResponse = await octokit.repos.get({ owner, repo });
  const defaultBranch = defaultBranchResponse.data.default_branch;
  const prResponse = await octokit.pulls.create({
    owner, repo,
    head: prRef,
    base: defaultBranch,
    title, body
  });
  console.log('- done');

  return true;
}

async function processMappings(mappings, nb) {
  const changes = Object.keys(mappings)
    .filter(shortname => mappings[shortname].analysis.changes.length > 0);
  let i = 0;
  for (const shortname of changes) {
    const created = await createMappingsPR(shortname, mappings[shortname]);
    if (created) {
      i += 1;
    }
    if (i === nb) {
      break;
    }
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
    .then(mappings => processMappings(mappings, nb))
    .then(_ => console.log('done'));
}