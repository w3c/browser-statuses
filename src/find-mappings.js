/*******************************************************************************
Helper script to propose new mappings based on spec entries in browser-specs and
implementation info from the implementation status data files.

Run with:
node src/find-mappings.js [--known]
*******************************************************************************/

import esMain from 'es-main';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as bcdParser from './parse-bcd.js';
import * as caniuseParser from './parse-caniuse.js';
import * as chromeParser from './parse-chrome.js';
import * as webkitParser from './parse-webkit.js';
import browserSpecs from 'web-specs' assert { type: 'json' };

// Compute __dirname (not exposed when ES6 modules are used)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/**
 * List of parsers
 */
const parsers = {
  'bcd': bcdParser,
  'caniuse': caniuseParser,
  'chrome': chromeParser,
  'webkit': webkitParser
};


async function fetchImplData() {
  return Promise.all(Object.values(parsers).map(async parser => {
    if (parser.fetchImplementationData) {
      await parser.fetchImplementationData();
    }
  }));
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function esc(title) {
  return (title ?? '').replace(/</g, '&lt;');
}

// Specs are sometimes referenced without the final slash
function withoutFinalSlash(url) {
  if (!url) {
    return null;
  }
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
}

// Platform status projects often continue to reference specs with their
// wicg.github.io after they migrated to W3C.
function toWicgUrl(url) {
  if (!url) {
    return null;
  }
  return url.replace(/w3c\.github\.io/, 'wicg.github.io');
}

// Platform status projects sometimes continue to reference CSS specs with
// old dev.w3.org URLs.
function toDevUrl(url) {
  if (!url) {
    return null;
  }
  return url.replace(/drafts\.csswg\.org\//, 'dev.w3.org/csswg/');
}

// Consider GitHub repository URL as a URL that can be used to reference the
// spec unless the repository contains multiple specs
function repositoryUrl(spec) {
  const multiSpecRepo = browserSpecs.find(s =>
      s.shortname !== spec.shortname &&
      s.nightly.repository &&
      s.nightly.repository === spec.nightly.repository);
  return multiSpecRepo ? null : spec.nightly.repository;
}

function findMappingsForSpec(shortname, relatedSpecs, data) {
  const res = JSON.parse(JSON.stringify(data ?? {}));
  res.statusref = {};

  console.log(`Finding mappings for ${shortname}`);

  // Consider GitHub repository URL as a URL that can be used to reference the
  // spec, unless the repository contains multiple specs

  // Compute list of URLs that can be used to refer to the spec
  relatedSpecs = relatedSpecs ?? [];
  let relatedUrls = relatedSpecs
    .map(spec => [
      spec.url,
      spec.nightly.url,
      repositoryUrl(spec),
      spec?.release?.url,
      spec.series.nightlyUrl,
      spec.series.releaseUrl,
      withoutFinalSlash(spec.url),
      withoutFinalSlash(spec.nightly.url),
      withoutFinalSlash(spec?.release?.url),
      withoutFinalSlash(spec.series.nightlyUrl),
      withoutFinalSlash(spec.series.releaseUrl),
      toWicgUrl(spec.url),
      toWicgUrl(spec.nightly.url),
      toWicgUrl(spec?.release?.url),
      toWicgUrl(spec.series.nightlyUrl),
      toWicgUrl(spec.series.releaseUrl),
      toDevUrl(spec.url),
      toDevUrl(spec.nightly.url),
      toDevUrl(spec?.release?.url),
      toDevUrl(spec.series.nightlyUrl),
      toDevUrl(spec.series.releaseUrl)
    ])
    .flat()
    .filter(url => !!url);
  if (data?.altUrls) {
    for (const url of data.altUrls) {
      relatedUrls.push(url);
    }
  }
  relatedUrls = relatedUrls.filter(onlyUnique);


  // Find mappings and compute the new "statusref" property
  const found = {};
  for (const [name, parser] of Object.entries(parsers)) {
    if (!parser.findMappings) {
      continue;
    }
    const mappings = parser.findMappings(shortname, relatedUrls, data);
    if (mappings && mappings.length > 0) {
      found[name] = {};
      for (const mapping of mappings) {
        found[name][mapping.id] = mapping;
      }

      res.statusref[name] = mappings;
    }

    // Complete info with old info that we already had
    const oldref = data?.statusref?.[name];
    const newref = res.statusref[name] ?? [];
    if (oldref) {
      for (const oldmapping of oldref) {
        const newmapping = newref.find(m => m.id === oldmapping.id);
        if (newmapping) {
          if (oldmapping.representative) {
            newmapping.representative = oldmapping.representative;
          }
        }
        else if (oldmapping.manual) {
          newref.push(oldmapping);
        }
      }
    }
    if (newref.length > 0) {
      res.statusref[name] = newref;
    }

    // Sort resulting array
    if (res.statusref[name]) {
      res.statusref[name].sort((m1, m2) => {
        if (m1.id < m2.id) {
          return -1;
        }
        if (m1.id > m2.id) {
          return 1;
        }
        return 0;
      });
    }
  }

  // Analyze the new "statusref" property against the one we previously had
  const analysis =  {
    info: [],
    changes: [],
    todo: []
  };

  // Spec not yet in data?
  if (!data) {
    analysis.info.push(`Spec not yet in data folder`);
  }

  for (const name of Object.keys(parsers)) {
    // No old mapping. No new mapping.
    // Report and do nothing.
    const oldref = data?.statusref?.[name];
    const newref = (res.statusref[name] && res.statusref[name].length) ?
      res.statusref[name] : null;
    if (!oldref && !newref) {
      analysis.info.push(`${name}: no mappings known/found`);
    }

    // No old mapping. New mappings found.
    // Check which ones are "representative".
    if (!oldref && newref) {
      analysis.info.push(`${name}: mappings found`);
      for (const mapping of newref) {
        analysis.changes.push(`Add ${name} mapping [${mapping.id}](${mapping.statusUrl})${mapping.name && mapping.name !== mapping.id ? ' ' + esc(mapping.name) : ''}`);
      }
      analysis.todo.push(`Check "representative" flags for ${name} mappings`);
    }

    // Old mappings. No new mapping.
    // Check old mappings and flag them as "manual"
    if (oldref && !newref) {
      analysis.info.push(`${name}: obsolete mappings found`);
      for (const mapping of oldref) {
        analysis.changes.push(`Drop old ${name} mapping ${mapping.id}${mapping.name && mapping.name !== mapping.id ? ' ' + esc(mapping.name) : ''}`);
        analysis.todo.push(`Check need to add "manual" flag to keep ${name} mapping ${mapping.id} if needed`)
      }
    }

    // Old mappings. New mappings.
    // For old mappings that don't exist in new mappings, check and add "manual".
    // For new mappings that don't exist in old mappings, check "representative".
    // For new mappings that update old mappings, check new info
    // For new mappings that are the same as old mappings, report but do nothing.
    if (oldref && newref) {
      if ((oldref.length !== newref.length) ||
          oldref.find(mapping => !newref.find(m => m.id === mapping.id))) {
        analysis.info.push(`${name}: additional mappings found`);
      }

      for (const mapping of oldref) {
        if (!newref.find(m => m.id === mapping.id)) {
          analysis.changes.push(`Drop old ${name} mapping ${mapping.id}${mapping.name && mapping.name !== mapping.id ? ' ' + esc(mapping.name) : ''}`);
          analysis.todo.push(`Check need to add "manual" flag to keep ${name} mapping ${mapping.id} if needed`)
        }
      }

      for (const mapping of newref) {
        if (!oldref.find(m => m.id === mapping.id)) {
          analysis.changes.push(`Add ${name} mapping [${mapping.id}](${mapping.statusUrl})${mapping.name && mapping.name !== mapping.id ? ' ' + esc(mapping.name) : ''}`);
        }
        analysis.todo.push(`Check "representative" flags for ${name} mappings`);
      }

      for (const mapping of newref) {
        const oldmapping = oldref.find(m => m.id === mapping.id);
        if (!oldmapping) {
          continue;
        }
        analysis.info.push(`${name}: same mapping [${mapping.id}](${mapping.statusUrl}) as before`);
      }
    }
  }
  analysis.todo = analysis.todo.filter(onlyUnique);
  analysis.changes.sort();
  analysis.todo.sort();

  return {
    statusref: res.statusref,
    analysis: analysis
  };
}

export async function findMappings(dataFolder, onlyExistingOnes) {
  await fetchImplData();

  const files = fs.readdirSync(dataFolder)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dataFolder, f));

  // Load known data
  const data = {};
  for (const file of files) {
    const shortname = file.split(/\/|\\/).pop().split('.')[0];
    data[shortname] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  // Group specs per series
  const specSeries = {};
  browserSpecs.map(spec => {
    if (!specSeries[spec.series.shortname]) {
      specSeries[spec.series.shortname] = [];
    }
    specSeries[spec.series.shortname].push(spec);
  });

  // Loop through spec series to find new/obsolete mappings
  const results = {};
  for (const [shortname, specs] of Object.entries(specSeries)) {
    if (onlyExistingOnes && !data[shortname]) {
      continue;
    }
    results[shortname] = findMappingsForSpec(shortname, specs, data[shortname]);
  }

  return results;
}


if (esMain(import.meta)) {
  const onlyExistingOnes = !!process.argv.find(arg => arg === '--known');
  const dataFolder = path.join(__dirname, '..', 'data');
  findMappings(dataFolder, onlyExistingOnes)
    .then(changes => fs.promises.writeFile("res.json", JSON.stringify(changes, null, 2)));
}
