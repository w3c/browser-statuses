/**
 * Parse implementation information from Browser Compatibility Data.
 *
 * Based on the MDN Browser Compatibility Data:
 * https://github.com/mdn/browser-compat-data
 *
 * Note the data is not retrieved online but rather directly imported as an NPM
 * package.
 */

import bcd from '@mdn/browser-compat-data';
import { userAgents } from './user-agents.js';


/**
 * Compute a normalized implementation status for the given Brower Compatibility
 * Data identifier.
 *
 * Key describes the path to the feature in BCD, with tokens separated by ".".
 * In the repository, first token is the folder under which the feature should
 * be found. Second token is the filename, and tokens below the path in the
 * JSON structure. For instance, "api.StorageManager.estimate" links to the
 * "estimate" subfeature of the StorageManager class in the API folder.
 */
export function getImplementationStatus(key) {
  const impl = [];
  const now = (new Date()).toISOString();
  const tokens = key.split('.');
  let impldata = tokens.reduce((res, token) => { return res[token]; }, bcd);
  if (!impldata || !impldata.__compat) {
    return impl;
  }
  impldata = impldata.__compat;
  const href = impldata.mdn_url;

  const uas = Object.keys(impldata.support || {});
  for (const ua of uas) {
    if (!userAgents.includes(ua)) {
      continue;
    }
    const res = { ua };

    let releases = (bcd.browsers[ua] || {}).releases || {};
    if ((ua === 'chrome_android') && !bcd.browsers[ua] && bcd.browsers['chrome']) {
      releases = bcd.browsers['chrome'].releases || {};
    }

    // Inner function to sort support array by release date
    function mostRecentFirst(a, b) {
      let aAdded = a.version_added;
      let bAdded = b.version_added;
      if ((aAdded === true) || (aAdded === false)) {
        return -1;
      }
      else if ((bAdded === true) || (bAdded === false)) {
        return 1;
      }
      else if (aAdded === null) {
        return (bAdded === null) ? 0 : 1;
      }
      else if (bAdded === null) {
        return -1;
      }
      else {
        const aRelease = releases[aAdded];
        const bRelease = releases[bAdded];
        if (!aRelease) {
          return (!bRelease ? 0 : -1);
        }
        else if (!bRelease) {
          return 1;
        }
        else if (!aRelease.release_date) {
          return (!bRelease.release_date ? 0 : -1);
        }
        else if (!bRelease.release_date) {
          return 1;
        }
        else if (aRelease.release_date < bRelease.release_date) {
          return 1;
        }
        else if (aRelease.release_date > bRelease.release_date) {
          return -1;
        }
        else {
          return 0;
        }
      }
    }

    // Sort support array, most recent info first and take the first one
    let support = impldata.support[ua];
    if (Array.isArray(support)) {
      support.sort(mostRecentFirst);
      support = support[0] || {};
    }
    if (!support.version_added && (support.version_added !== false)) {
      continue;
    }

    if ((support.version_added === false) || support.version_removed) {
      res.status = '';
    }
    else if (support.prefix || support.alternative_name) {
      res.status = 'experimental';
      res.prefix = true;
    }
    else if (support.flags && (support.flags.length > 0)) {
      res.status = 'experimental';
      res.flag = true;
    }
    else if (typeof support.version_added === 'string') {
      let release = releases[support.version_added];
      if (!release) {
        // Nothing known about release version, consider it does not exist yet.
        res.status = 'experimental';
      }
      else if ((release.status === 'retired') ||
          (release.release_date && (release.release_date < now))) {
        // Version released some time ago
        res.status = 'shipped';
      }
      else {
        // Version not released yet
        res.status = 'experimental';
      }
    }
    else {
      res.status = 'shipped';
    }

    if (support.partial_implementation) {
      res.partial = true;
    }
    if (support.notes) {
      res.notes = (Array.isArray(support.notes) ?
        support.notes : [support.notes]);
    }

    res.source = 'bcd';
    if (impldata.mdn_url) {
      res.href = impldata.mdn_url;
    }
    impl.push(res);
  }
  return impl;
}