/**
 * Check manual implementation info parser
 */

import assert from 'assert';
import { getImplementationStatus } from '../src/parse-manual.js';

describe('The manual implementation data parser', () => {
  it('copies over main properties', () => {
    const manual = {
      ua: 'fridge',
      status: 'shipped',
      source: 'gossip',
      date: '2021-02-16',
      href: 'https://example.org'
    };
    assert.deepEqual(getImplementationStatus([manual]), [manual]);
  });

  it('sets "other" as source when not specified', () => {
    const manual = {
      ua: 'fridge',
      status: 'shipped'
    };
    const info = getImplementationStatus([manual])[0];
    assert.equal(info.source, 'other');
  });

  it('sets boolean flags when needed', () => {
    const manual = {
      ua: 'fridge',
      status: 'shipped',
      prefix: true,
      flag: true
    };
    const info = getImplementationStatus([manual])[0];
    assert.strictEqual(info.prefix, true, 'The prefix property should be set');
    assert.strictEqual(info.flag, true, 'The flag property should be set');
  });

  it('does not set boolean flags when not needed', () => {
    const manual = {
      ua: 'fridge',
      status: 'shipped',
      prefix: false,
      flag: false
    };
    const info = getImplementationStatus([manual])[0];
    assert.strictEqual(info.hasOwnProperty('prefix'), false, 'The prefix property should not be set');
    assert.strictEqual(info.hasOwnProperty('flag'), false, 'The flag should not be set');
  });

  it('converts the comment to a note', () => {
    const manual = {
      ua: 'fridge',
      status: 'shipped',
      comment: 'my comment is rich'
    };
    const info = getImplementationStatus([manual])[0];
    assert.deepEqual(info.notes, [manual.comment]);
  });
});