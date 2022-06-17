/*******************************************************************************
Helper script that parses data files and fetches implementation information from
Web status platforms such as Can I use and those provided by browser vendors

To parse files:
node src/build-index.js [data folder/file]+
*******************************************************************************/

import esMain from 'es-main';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as bcdParser from './parse-bcd.js';
import * as caniuseParser from './parse-caniuse.js';
import * as chromeParser from './parse-chrome.js';
import * as manualParser from './parse-manual.js';
import * as webkitParser from './parse-webkit.js';

// Compute __dirname (not exposed when ES6 modules are used)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/**
 * Possible implementation statuses
 *
 * @type {Array}
 */
const statuses = [
  'notsupported',
  'consideration',
  'indevelopment',
  'experimental',
  'shipped'
];


/**
 * List of parsers
 */
const parsers = {
  'bcd': bcdParser,
  'caniuse': caniuseParser,
  'chrome': chromeParser,
  'manual': manualParser,
  'webkit': webkitParser
};


function getImplInfoForFeature(feature) {
  // Compute implementation status only when we know where to look in the
  // implementation data
  if (!feature.statusref) {
    return [];
  }

  const support = Object.entries(feature.statusref)
    .filter(([parser, keys]) => !!keys && keys.length)
    .map(([parser, keys]) => {
      if (!parsers[parser]) {
        return [];
      }

      if (parser === 'manual') {
        return parsers[parser].getImplementationStatus(keys);
      }

      const perUA = {};
      keys
        .map(key => {
          return parsers[parser].getImplementationStatus(key.id)
            .map(impl => {
              if (key.representative) {
                impl.representative = true;
              }
              return impl;
            });
          })
        .flat()
        .forEach(impl => {
          if (!perUA[impl.ua]) {
            perUA[impl.ua] = {
              ua: impl.ua,
              status: impl.status,
              source: impl.source,
              representative: impl.representative
            };
          }
          const merged = perUA[impl.ua];
          if ((!merged.representative && impl.representative) ||
              ((!merged.representative || impl.representative) &&
                (statuses.indexOf(impl.status) <= statuses.indexOf(merged.status)))) {
            for (const prop of ['flag', 'partial', 'prefix']) {
              if (impl[prop]) {
                merged[prop] = impl[prop];
              }
              else if (merged[prop] && impl.status !== merged.status) {
                delete merged[prop];
              }
            }
            merged.status = impl.status;
            merged.representative = impl.representative;
          }

          const detail = Object.assign({}, impl);
          delete detail.ua;
          delete detail.source;
          if (detail.representative) {
            if (!perUA[impl.ua].details) {
              perUA[impl.ua].details = [];
            }
            perUA[impl.ua].details.push(detail);
          }
        });

      // Non-representative implementation statuses are partial by definition
      // (note some representative statuses may also have the partial flag when
      // status platform reports that implementation is partial)
      return Object.values(perUA)
        .map(impl => {
          if (!impl.representative) {
            impl.partial = true;
          }
          return impl;
        });
    })
    .flat()
    .filter(info => !!info)
    .sort(sortByUA);

  return support;
}


function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}


function guessImplInfoFromSpec(featureName, implinfo) {
  if (!implinfo.features || !implinfo.features[featureName]) {
    return;
  }

  // List user-agents for which we have implementation info at the spec level
  const uas = implinfo.support.map(o => o.ua).filter(onlyUnique);

  for (const source of Object.keys(parsers)) {
    for (const ua of uas) {
      // Look for known implementation info
      // (skipping things that are already guesses or partial info so as not to
      // add another layer of uncertainty)
      const impl = implinfo.support.find(o =>
        (o.source === source) && (o.ua === ua) && !o.guess && !o.partial);
      if (!impl || !impl.status) {
        continue;
      }

      // Useless to guess something if we already have implementation info
      // from the same source for the same UA at the feature level
      if (implinfo.features[featureName].support.find(o =>
          (o.source === source) && (o.ua === ua))) {
        continue;
      }

      const guessed = {
        ua,
        status: impl.status,
        source,
        href: impl.href,
        guess: true
      };
      if (impl.prefix) {
        guessed.prefix = impl.prefix;
      }
      if (impl.flag) {
        guessed.flag = impl.flag;
      }
      if (impl.partial) {
        guessed.partial = impl.partial;
      }
      guessed.details = impl.details;

      implinfo.features[featureName].support.push(guessed);
    }
  }

  implinfo.features[featureName].support.sort(sortByUA);
}


/*******************************************************************************
 * Select the best implementation status for each user agent from sources.
 * 
 * Rules are:
 * 1. Trust the "feedback" source as being authoritauve. It should contain
 * feedback from reviewers about implementation statuses that are incorrectly
 * reported by other sources
 * 2. Prefer representative implementation info over non representative one.
 * 3. Similarly, only select inferred implementation status (flagged with
 * `guess`) when there is no other better info available. The `guess` flag is
 * typically set when implementation support for a feature is derived from the
 * implementation support for the whole spec.
 * 4. Trust authoritative sources for a given user agent over non-authoritative
 * ones. For instance, if Chrome Platform Status says that a feature is
 * "in development" in Chrome, ignore input from other sources, even if they
 * claim that the feature is "shipped" in Chrome.
 * 5. Keep the most optimistic status otherwise, meaning that if Chrome Platform
 * Status says that feature A has shipped in Edge while Can I Use says it is in
 * development, consider that the feature has shipped in Edge.
 * 6. Due to the close relationship between webkit and Safari, trust Webkit
 * Status more than any other source about support in Safari. If Webkit Status
 * claims that a feature is in development in webkit, it means that it cannot be
 * at a more advanced implementation level in Safari. In other words, constrain
 * the implementation status in Safari to the implementation status in Webkit
 * when it is known to be lower.
 ******************************************************************************/
function flagBestImplInfo(implinfo) {
  // Extract the list of user agents that appear in implementation
  // data, computing the status for "webkit" on the side to be able to
  // apply rule 6, and apply rules for each user agent.
  const webkitInfo = implinfo.find(impl =>
      (impl.ua === 'webkit') && (impl.source === 'webkit') &&
      !impl.guess && !impl.partial);
  const webkitStatus = (webkitInfo || {}).status;
  const safariInfo = [];
  const uas = implinfo.map(impl => impl.ua).filter(onlyUnique);
  uas.forEach(ua => {
    let authoritativeStatusFound = false;
    let selectedImplInfo = null;
    implinfo.filter(impl => impl.ua === ua).forEach(impl => {
      // Rule 1: reviewer feedback trumps anything else
      if (authoritativeStatusFound) {
        return;
      }
      if (impl.source === 'feedback') {
        authoritativeStatusFound = true;
        selectedImplInfo = impl;
        return;
      }

      // Rule 2: prefer representative info
      if (!impl.representative && selectedImplInfo?.representative) {
        return;
      }

      // Rule 3: don't guess if we know better
      if (impl.guess && selectedImplInfo && !selectedImplInfo.guess) {
        return;
      }

      // Rule 4: select authoritative platform
      if ((impl.source in parsers) &&
          parsers[impl.source].coreua &&
          parsers[impl.source].coreua.includes(ua)) {
        if (impl.representative) {
          authoritativeStatusFound = true;
        }
        selectedImplInfo = impl;
        return;
      }

      // Rule 5: be optimistic in life
      if (!selectedImplInfo ||
          (!impl.guess && selectedImplInfo.guess) ||
          (impl.representative && !selectedImplInfo.representative) ||
          (statuses.indexOf(impl.status) > statuses.indexOf(selectedImplInfo.status))) {
        // Rule 6, constrain safari status to that of webkit when it is lower. When
        // that happens, consider that the info from the webkit status site also
        // applies to safari/safari_ios. Note we don't do that in the generic case
        // because supported in webkit does not always mean supported in Safari.
        if (ua.startsWith('safari') && (typeof webkitStatus === 'string') &&
            statuses.indexOf(impl.status) > statuses.indexOf(webkitStatus)) {
          selectedImplInfo = Object.assign({}, webkitInfo, {
            ua: impl.ua,
            selected: true
          });
          safariInfo.push(selectedImplInfo);
        }
        else {
          selectedImplInfo = impl;
        }
        return;
      }
    });

    // Flag the selected implementation info
    if (selectedImplInfo) {
      selectedImplInfo.selected = true;
    }
  });

  // Complete implementation info with Safari info coming from the Webkit status
  // site if rule 3 had to be applied.
  for (const info of safariInfo) {
    implinfo.push(info);
  }
}


async function fetchImplData() {
  return Promise.all(Object.values(parsers).map(async parser => {
    if (parser.fetchImplementationData) {
      await parser.fetchImplementationData();
    }
  }));
}


function sortByShortname(s1, s2) {
  const name1 = s1.shortname.toLowerCase();
  const name2 = s2.shortname.toLowerCase();
  if (name1 < name2) {
    return -1;
  }
  else if (name1 > name2) {
    return 1;
  }
  else {
    return 0;
  }
}


function sortByUA(i1, i2) {
  if (i1.ua < i2.ua) {
    return -1;
  }
  else if (i1.ua > i2.ua) {
    return 1;
  }
  else {
    if (i1.source < i2.source) {
      return -1;
    }
    else if (i1.source > i2.source) {
      return 1;
    }
    else {
      return 0;
    }
  }
}


export async function extractImplData(files) {
  await fetchImplData();


  // Loop through files and compute the implementation status for each of them
  const impldata = files.map(file => {
    const id = file.split(/\/|\\/).pop().split('.')[0];
    let spec;
    try {
      spec = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch (err) {
      console.error(`Could not parse ${file} as JSON`);
      throw err;
    }

    // Get implementation status for the whole spec
    const implstatus = {
      shortname: id,
      support: getImplInfoForFeature(spec)
    };

    // Get implementation status for individual features in the spec
    if (spec.features) {
      implstatus.features = {};
      for (const featureName of Object.keys(spec.features)) {
        const feature = spec.features[featureName];
        implstatus.features[featureName] = {
          title: feature.title,
          url: feature.url,
          support: getImplInfoForFeature(feature)
        };
      }
    }

    // Flag the best implementation info for the whole spec
    flagBestImplInfo(implstatus.support);

    // Guess individual features implementation status from implementation
    // status of the whole spec and choose the best implementation info for
    // individual features
    if (implstatus.features) {
      for (const featureName of Object.keys(spec.features)) {
        guessImplInfoFromSpec(featureName, implstatus);
        flagBestImplInfo(implstatus.features[featureName].support);
      }
    }

    // Copy polyfill information over from the feature data file
    if (spec.polyfills) {
      implstatus.polyfills = spec.polyfills;
    }

    return implstatus;
  }).sort(sortByShortname);

  return impldata;
}


if (esMain(import.meta)) {
  const files = ((process.argv.slice(2).length > 0) ? process.argv.slice(2) : ['data'])
    .map(file => {
      const stat = fs.statSync(file);
      if (stat.isDirectory()) {
        const contents = fs.readdirSync(file);
        return contents.filter(f => f.endsWith('.json'))
          .map(f => path.join(file, f));
      }
      else {
        return file;
      }
    })
    .flat();

  extractImplData(files)
    .then(idx => fs.promises.writeFile(
      path.resolve(__dirname, "..", "index.json"),
      JSON.stringify(idx, null, 2)
    ));
}
