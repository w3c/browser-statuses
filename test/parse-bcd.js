/**
 * Check browser compatibility data parser
 */

import assert from 'assert';
import { getImplementationStatus } from '../src/parse-bcd.js';

describe('The Browser Compatibility Data parser', () => {
  it('maps shipped info for Chrome', () => {
    const info = getImplementationStatus('api.Element.attributes')
      .filter(d => d.ua === 'chrome');
    const expected = {
      ua: 'chrome',
      status: 'shipped',
      source: 'bcd',
      href: 'https://developer.mozilla.org/docs/Web/API/Element/attributes'
    };
    assert.deepEqual(info, [expected]);
  });

  it('has implementation info about main user agents', () => {
    const info = getImplementationStatus('api.Element.attributes')
      .map(d => d.ua);
    const uas = [
      'chrome', 'chrome_android', 'edge', 'firefox', 'firefox_android',
      'opera', 'safari', 'safari_ios', 'samsunginternet_android'
    ];
    uas.forEach(ua => assert.strictEqual(info.includes(ua), true, `No info about ${ua}`));
  });
});
