/**
 * Fetch and parse implementation information from Chrome Platform Status.
 *
 * Note the getImplementationStatus function relies on Can I Use info to tell
 * the current version number of user agents. As such, the Can I Use info needs
 * to have been fetched before that function gets called.
 */

import { fetchJSON } from './fetch.js';
import { getUserAgentsInfo } from './parse-caniuse.js';

/**
 * URL of the implementation data file
 */
const url = 'https://www.chromestatus.com/features.json';


/**
 * Export list of user agents that the platform has authority on.
 */
export const coreua = ["chrome", "chrome_android", "edge"];


/**
 * Helper function that parses a Can I Use status and return a normalized
 * implementation structure.
 *
 * Second argument gives the implementation notes in case the status references
 * notes. Third argument can tell function to replace a "shipped" status with
 * an "experimental" status (useful when parsing statuses for upcoming versions
 * of a user agent).
 */
function parseStatus(chromestatus, key) {
  if (!chromestatus) {
    return null;
  }
  let status = (chromestatus.status ?
    chromestatus.status.text :
    chromestatus.view.text);
  let res = {};
  switch (status) {
    case 'Enabled by default':
    case 'Shipped':
    case 'Shipped/Shipping':
    case 'Browser Intervention':
      res.status = 'shipped';
      break;
    case 'In developer trial (Behind a flag)':
    case 'Behind a flag':
    case 'Origin trial':
      res.status = 'experimental';
      break;
    case 'In development':
      res.status = 'indevelopment';
      break;
    case 'Proposed':
    case 'Public support':
    case 'Positive':
    case 'Under consideration':
    case 'Worth prototyping':
      res.status = 'consideration';
      break;
    case 'No signal':
    case 'No public signals':
    case 'Mixed public signals':
    case 'No active development':
    case 'No longer pursuing':
    case 'Public skepticism':
    case 'Negative':
    case 'Opposed':
    case 'Removed':
    case 'Deprecated':
    case 'Defer':
    case 'Harmful':
    case 'Non-harmful':
    case 'Neutral':
    case 'N/A':
    case 'On hold':
      res.status = 'notsupported';
      break;
    default:
      console.warn(`- Unknown chrome status ${status} for key ${key}`);
      break;
  }

  // The "prefixed" and "flag" properties are no longer maintained once a
  // feature has shipped, see discussion in :
  // https://github.com/GoogleChrome/chromium-dashboard/issues/1006
  if (res.status !== 'shipped') {
    if (chromestatus.prefixed) {
      res.prefix = true;
    }
    if (chromestatus.flag || (status === 'Behind a flag')) {
      res.flag = true;
    }
  }
  res.source = 'chrome';
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
}


/**
 * Compute a normalized implementation status for the given Chrome Platform
 * Status identifier.
 */
export function getImplementationStatus(key) {
  if (!data) {
    throw new Error('No Chrome Platform Status available');
  }

  const impl = [];
  let impldata = data.find(feature => feature.id === key);
  if (impldata) {
    impldata = impldata.browsers;
  }
  if (!impldata) {
    throw new Error(`Unknown Chrome Platform Status feature ${key}`);
  }

  // The JSON file returned by the Chrome Platform Status does not give any
  // information about which version is the current one
  // (see https://github.com/GoogleChrome/chromium-dashboard/issues/440 for
  // a related issue)
  // We'll get the info from Can I Use data for now
  // The assumption is that the mobile version is the same as the desktop
  // version. That's usually correct as there seems to be one or two days
  // of difference between desktop and mobile releases at most:
  // https://en.wikipedia.org/wiki/Google_Chrome_version_history
  // (Also the information on Can I Use for Chrome for Android is not as
  // accurate. For instance, it reports that the today's version of Chrome
  // for Android is 64 whereas it should be 65 in practice)
  // Opera's version is a priori consistently Chrome's version - 13 as
  // explained in:
  // https://github.com/w3c/web-roadmaps/issues/13#issuecomment-351468443
  // TODO: is that still valid for Opera in 2021?
  const uaInfo = getUserAgentsInfo();
  const chromeVersion = uaInfo.chrome.versions.slice(-4, -3)[0];
  const edgeVersion = uaInfo.edge.versions.slice(-4, -3)[0];
  const operaVersion = chromeVersion - 13;


  // 2020-09-09: Voluntarily ignore information about "edge", which does not
  // seem to be current for the version of Edge based on Chromium
  for (let ua of ['chrome', 'ff', 'safari']) {
    const info = parseStatus(impldata[ua], key);
    ua = (ua === 'ff' ? 'firefox' : ua);
    if (info) {
      info.href = `https://www.chromestatus.com/feature/${key}`;

      // Chromestatus has more detailed and forward-looking implementation
      // info about Chrome (also, "in development" and "consideration" are
      // at the Chromium level and thus apply to Chrome for desktops and
      // Chrome for Android)
      const enabledOnAllPlatforms = (info.status === 'indevelopment') ||
          (info.status === 'consideration') ||
          (impldata.chrome.status.milestone_str === 'Enabled by default');
      if (ua === 'chrome') {
        if (impldata.chrome.desktop &&
            (impldata.chrome.desktop > chromeVersion) &&
            (info.status === 'shipped')) {
          impl.push(Object.assign({ ua: 'chrome' }, info,
            { status: 'experimental' }));
        }
        else if (impldata.chrome.desktop || enabledOnAllPlatforms) {
          impl.push(Object.assign({ ua: 'chrome' }, info));
        }
        if (impldata.chrome.android &&
            (impldata.chrome.android > chromeVersion) &&
            (info.status === 'shipped')) {
          impl.push(Object.assign({ ua: 'chrome_android' }, info,
            { status: 'experimental' }));
        }
        else if (impldata.chrome.android || enabledOnAllPlatforms) {
          impl.push(Object.assign({ ua: 'chrome_android' }, info));
        }

        // 2020-09-09: consider that implementation status for Edge is the
        // same as implementation status for Chrome (Chrome Platform Status
        // data include implementation data about Edge but that info seems
        // to be for the previous version of Edge)
        if (impldata.chrome.desktop &&
            (impldata.chrome.desktop > edgeVersion) &&
            (info.status === 'shipped')) {
          impl.push(Object.assign({ ua: 'edge' }, info,
            { status: 'experimental' }));
        }
        else if (impldata.chrome.desktop || enabledOnAllPlatforms) {
          impl.push(Object.assign({ ua: 'edge' }, info));
        }
      }
      else {
        impl.push(Object.assign({ ua }, info));
      }
    }
  }

  // Support in Opera is reported differently, and follows an "Opera
  // version is Chromium's version - 13" rule which is correct for the
  // desktop version, but Opera for Android seems to follow its own
  // schedule (today's version of Opera for Android is 45 and is based on
  // Chromium 61, so that's version - 16...). We could deduce the right
  // information for Opera for Android if we knew on which version of
  // Chromium the current version of Opera for Android is based, but there
  // is no easy way to tell, so let's ignore the Opera for Android info.
  if (impldata.opera && impldata.opera.desktop) {
    const href = `https://www.chromestatus.com/feature/${key}`;
    const status = (impldata.opera.desktop > operaVersion) ?
      'experimental' : 'shipped';
    impl.push({ ua: 'opera', status, source, href });
  }

  return impl;
}


export function findMappings(shortname, relatedUrls, knownData) {
  const mappings = data
    .filter(feature => {
      let url = feature?.standards?.spec;
      if (!url) {
        return false;
      }
      url = url.replace(/^http:/, 'https:');
      return !!relatedUrls.find(u => url.startsWith(u));
    })
    .filter(feature => feature.feature_type !== 'Feature deprecation')
    .map(feature => {
      return {
        id: feature.id,
        name: feature.name,
        statusUrl: `https://chromestatus.com/feature/${feature.id}`,
        specUrls: [feature.standards.spec]
      };
    });

  return mappings;
}