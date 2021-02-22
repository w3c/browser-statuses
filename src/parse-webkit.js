/**
 * Fetch and parse implementation information from Can I Use.
 */

import { fetchJSON } from './fetch.js';

/**
 * URL of the implementation data file
 */
const url = 'https://svn.webkit.org/repository/webkit/trunk/Source/WebCore/features.json';


/**
 * Export list of user agents that the platform has authority on.
 */
export const coreua = ["webkit"];


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
 * Compute a normalized implementation status for the given Webkit Status
 * identifier.
 */
export function getImplementationStatus(key) {
  if (!data) {
    throw new Error('No Webkit Status available');
  }

  const impl = [];
  let keyType = key.split('-')[0];
  if (keyType === 'feature') {
    keyType = 'features';
  }
  const keyName = key.split('-').slice(1).join(' ');
  if (!data[keyType]) {
    throw new Error(`Unkown webkit status type ${keyType}`);
  }

  let impldata = data[keyType]
    .find(feature => feature.name.toLowerCase() === keyName);
  if (!impldata) {
    throw new Error(`Unknown webkit feature ${key}`);
  }

  impldata = impldata.status;
  if (!impldata) {
    return impl;
  }

  const webkitstatus = impldata.status;
  const res = { ua: 'webkit' };
  switch (webkitstatus) {
    case 'Supported':
    case 'Partially Supported':
      res.status = 'shipped';
      if (webkitstatus === 'Partially Supported') {
        res.partial = true;
      }
      break;
    case 'Supported In Preview':
      res.status = 'experimental';
      break;
    case 'In Development':
      res.status = 'indevelopment';
      break;
    case 'Under Consideration':
      res.status = 'consideration';
      break;
    case 'Removed':
    case 'Not Considering':
      res.status = 'notsupported';
      break;
    default:
      console.warn(`- Unknown webkit status ${webkitstatus}`);
      break;
  }

  if (('enabled_by_default' in impldata) &&
      !impldata.enabled_by_default) {
    res.flag = true;
  }
  // No specific info about whether implementation requires use of a
  // prefix but that seems to be noted in comments, so let's assume that
  // the presence of the term "prefixed" is a good-enough indicator.
  if (impldata.comment && impldata.comment.includes(' prefixed')) {
    res.prefix = true;
  }
  if ((res.status === 'shipped') && (res.prefix || res.flag)) {
    res.status = 'experimental';
  }
  if (impldata.comment) {
    res.notes = [impldata.comment];
  }
  res.source = 'webkit';
  res.href = `https://webkit.org/status/#${key}`;
  if (res.status || (res.status === '')) {
    impl.push(res);
  }

  return impl;
}