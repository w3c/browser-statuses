/**
 * Check Webkit Platform Status data parser
 */

import assert from 'assert';
import nock from 'nock';
import { fetchImplementationData, getImplementationStatus, coreua } from '../src/parse-webkit.js';

describe('The Webkit Platform Status parser', () => {
  before(async () => {
    nock.disableNetConnect();
    nock('https://svn.webkit.org')
      .get('/repository/webkit/trunk/Source/WebCore/features.json')
      .reply(200, webkitData);

    await fetchImplementationData();
    assert.ok(nock.isDone(), 'Parser did not fetch implementation data');
  });

  it('has authoritative info on Webkit', () => {
    assert.ok(coreua.includes('webkit'));
  });

  it('returns implementation info for the beacon spec', () => {
    const info = getImplementationStatus('specification-beacon-api')[0];
    const expected = {
      ua: 'webkit',
      status: 'shipped',
      href: 'https://webkit.org/status/#specification-beacon-api',
      source: 'webkit'
    };
    assert.deepEqual(info, expected);
  });

  it('returns implementation info for the requestIdleCallback feature', () => {
    const info = getImplementationStatus('feature-requestidlecallback')[0];
    const expected = {
      ua: 'webkit',
      status: 'consideration',
      source: 'webkit',
      href: 'https://webkit.org/status/#feature-requestidlecallback',
    };
    assert.deepEqual(info, expected);
  });
});


/**
 * An extract of Webkit Platform Status data to avoid a network request to
 * fetch the actual data in tests.
 */
const webkitData = {
  "specification": [
    {
      "name": "Beacon API",
      "status": {
        "status": "Supported"
      },
      "url": "https://www.w3.org/TR/beacon/",
      "webkit-url": "https://webkit.org/b/147885",
      "keywords": [
        "beacon",
        "analytics",
        "diagnostics",
        "request"
      ],
      "category": "webapps",
      "description": "Schedules asynchronous and non-blocking data delivery while the current page is unloading to mitigate resource contention for other time-critical requests.",
    }
  ],
  "features": [
    {
      "name": "requestIdleCallback",
      "status": {
        "status": "Under Consideration"
      },
      "url": "https://w3c.github.io/requestidlecallback/",
      "webkit-url": "https://bugs.webkit.org/show_bug.cgi?id=164193",
      "keywords": [
        "requestIdleCallback",
        "idle callback"
      ],
      "description": "An API that can be used to cooperatively schedule background tasks."
    }
  ]
}