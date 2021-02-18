/**
 * Wrapper around fetch to retrieve a JSON object and abort the request when
 * it takes too long
 */

import fetch from 'node-fetch';
import AbortController from 'abort-controller';
import fs from 'fs';

const timeoutDuration = 30000;

export async function fetchJSON(url) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => { controller.abort(); },
    timeoutDuration,
  );

  try {
    const res = await fetch(url, { signal: controller.signal });
    const json = await res.json();
    return json;
  }
  finally {
    clearTimeout(timeout);
  }
}