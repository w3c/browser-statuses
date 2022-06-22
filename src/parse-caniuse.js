/**
 * Fetch and parse implementation information from Can I Use.
 */

import { fetchJSON } from './fetch.js';

/**
 * URL of the implementation data file
 */
const url = 'https://caniuse.com/data.json';

/**
 * List of user agent identifiers used in Can I use with corresponding
 * names in this project
 *
 * Note that names on the right side must be in user-agents.js
 */
const userAgents = {
  'and_chr': 'chrome_android',
  'and_ff': 'firefox_android',
  'and_qq': 'qq_android',
  'and_uc': 'uc_android',
  'baidu': 'baidu_android',
  'chrome': 'chrome',
  'edge': 'edge',
  'firefox': 'firefox',
  'ios_saf': 'safari_ios',
  'opera': 'opera',
  'safari': 'safari',
  'samsung': 'samsunginternet_android'
};


/**
 * Helper function that parses a Can I Use status and return a normalized
 * implementation structure.
 *
 * Third argument gives the implementation notes in case the status references
 * notes. Fourth argument can tell function to replace a "shipped" status with
 * an "experimental" status (useful when parsing statuses for upcoming versions
 * of a user agent).
 */
function parseStatus(ua, status, implnotes = [], options = {}) {
  const res = { ua };
  if (status.startsWith('y') || status.startsWith('a')) {
    res.status = (options.experimental ? 'experimental' : 'shipped');
  }
  else if (status.startsWith('n d')) {
    res.status = 'experimental';
  }
  else if (status.startsWith('n')) {
    res.status = 'notsupported';
  }
  if (status.includes('x')) {
    res.prefix = true;
  }
  if (status.includes('d')) {
    res.flag = true;
  }
  if ((res.status === 'shipped') && (res.prefix || res.flag)) {
    res.status = 'experimental';
  }
  const notes = status.split(' ')
    .filter(token => token.startsWith('#'))
    .map(noteid => implnotes[noteid.slice(1)])
    .filter(note => !!note);
  if (notes.length > 0) {
    res.notes = notes;
  }
  res.source = 'caniuse';
  return res;
}


/**
 * Implementation data (set by a call to fetchImplementationData)
 */
let data;


/**
 * Retrieve and save implementation data
 */
export async function fetchImplementationData() {
  data = await fetchJSON(url);
  if (!data.data || !data.agents) {
    throw new Error('Unexpected Can I Use data structure retrieved');
  }
}


/**
 * Expose user agent implementation information (needed by other platform
 * parsers to tell which version of a user agent is the latest version)
 */
export function getUserAgentsInfo() {
  if (!data) {
    throw new Error('No Can I Use data available');
  }
  return data.agents;
}


/**
 * Compute a normalized implementation status for the given Can I Use feature
 * identifier.
 */
export function getImplementationStatus(key) {
  if (!data) {
    throw new Error('No Can I Use data available');
  }
  if (!data.data[key]) {
    throw new Error(`Unknown Can I Use feature ${key}`);
  }

  const impl = [];
  const impldata = data.data[key].stats;
  const implnotes = data.data[key].notes_by_num;
  Object.keys(impldata).forEach(ua => {
    const uadata = impldata[ua];
    const latestUAVersion = data.agents[ua].versions.slice(-4, -3);
    const upcomingUAVersions = data.agents[ua].versions.slice(-3);

    // Only keep known user agents and normalize user agent names
    if (!(ua in userAgents)) {
      return;
    }
    ua = userAgents[ua];

    // Parse implementation status, considering support in upcoming UA versions
    // as "experimental".
    const info = parseStatus(ua, uadata[latestUAVersion], implnotes);
    info.href = `https://caniuse.com/#feat=${key}`;
    if ((info.status === 'shipped') || (info.status === 'experimental')) {
      impl.push(info);
    }
    else {
      upcomingUAVersions.forEach(version => {
        if (!version) return;
        const info = parseStatus(ua, uadata[version], implnotes, { experimental: true });
        if (info.status === 'experimental') {
          info.href = `https://caniuse.com/#feat=${key}`;
          impl.push(info);
        }
      });
    }
  });
  return impl;
}


export function findMappings(shortname, relatedUrls, knownData) {
  const mappings = Object.entries(data.data)
    .filter(([id, feature]) => {
      const url = feature.spec + '/';
      return id === shortname || (url && !!relatedUrls.find(u => url.startsWith(u)));
    })
    .map(([id, feature]) => {
      return {
        id: id,
        name: feature.title,
        statusUrl: `https://caniuse.com/${id}`,
        specUrls: [feature.spec]
      };
    });

  return mappings;
}