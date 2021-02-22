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
    .filter(([parser, key]) => !!key)
    .map(([parser, key]) => {
      if (parsers[parser]) {
        return parsers[parser].getImplementationStatus(key);
      }
    })
    .flat()
    .filter(info => !!info)
    .sort(sortByUA);

  return support;
}


function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}


function guessImplInfoFromFeatures(implinfo, coverage) {
  if (!implinfo.features) {
    return;
  }

  // List user-agents for which we have some level of implementation info
  // at the feature level
  const uas = Object.values(implinfo.features)
    .map(feature => feature.support.map(info => info.ua))
    .flat()
    .filter(onlyUnique);

  for (const source of Object.keys(parsers)) {
    for (const ua of uas) {
      const guessed = {
        ua,
        status: null,
        source,
        guess: true,
        features: []
      };

      for (const featureName of Object.keys(implinfo.features)) {
        const impl = implinfo.features[featureName].support.find(o =>
          (o.ua === ua) && (o.source === source));
        if (!impl) {
          continue;
        }
        if ((guessed.status === null) ||
            (statuses.indexOf(impl.status) <= statuses.indexOf(guessed.status))) {
          // Guessed impl status for the whole spec is the lowest status of
          // individual features
          guessed.status = impl.status;
          if (impl.prefix) {
            guessed.prefix = impl.prefix;
          }
          if (impl.flag) {
            guessed.flag = impl.flag;
          }
          if (impl.partial) {
            guessed.partial = impl.partial;
          }
        }
        guessed.features.push(featureName);
      }

      if (guessed.status) {
        if ((coverage === 'full') && !guessed.partial &&
            (guessed.features.length === Object.keys(implinfo.features).length)) {
          guessed.partial = false;
        }
        else {
          guessed.partial = true;
        }
        implinfo.support.push(guessed);
      }
    }
  }

  implinfo.support.sort(sortByUA);
}


function guessImplInfoFromSpec(featureName, implinfo) {
  if (!implinfo.features || !implinfo.features[featureName]) {
    return;
  }

  // List user-agents for which we have implementation info at the spec level
  const uas = implinfo.support.map(o => o.ua).filter(onlyUnique);

  for (const source of Object.keys(parsers)) {
    for (const ua of uas) {
      const impl = implinfo.support.find(o =>
        (o.source === source) && (o.ua === ua));
      if (!impl || !impl.status) {
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
        guessed.partial = impl.partial
      }

      implinfo.features[featureName].support.push(guessed);
    }
  }

  implinfo.features[featureName].support.sort(sortByUA);
}


function flagBestImplInfo(implinfo) {
  // Compute the final implementation status for each user agent with
  // the following rules:
  // 0. Trust the "feedback" source as being authoritative. It should
  // contain feedback from reviewers about implementation statuses that
  // are incorrectly reported by other sources.
  // 1. Trust platform sources to say the right thing about their own
  // user-agent or rendering engine. For instance, if chromestatus says
  // that a feature is "in development" in Chrome, consider that the
  // feature is really "in development" in Chrome, and ignore possible
  // claims in other sources that the feature is "shipped" in Chrome.
  // 2. Keep the most optimistic status otherwise, meaning that if
  // chromestatus says that feature A has shipped in Edge while
  // caniuse says it is in development, consider that the feature has
  // shipped in Edge
  // 3. Due to the close relationship between webkit and Safari, trust
  // webkitstatus more than any other source about support in Safari.
  // If webkitstatus says that a feature is in development in webkit,
  // it means it cannot be at a more advanced level in Safari. In other
  // words, constrain the implementation status in Safari to the
  // implementation status in Webkit, when it is known to be lower.
  // 4. Only select inferred implementation status (flagged with `guess`) when
  // there is no other better info.

  // Extract the list of user agents that appear in implementation
  // data, computing the status for "webkit" on the side to be able to
  // apply rule 3, and apply rules for each user agent.
  const webkitInfo = implinfo.find(impl => (impl.ua === 'webkit') && (impl.source === 'webkit'));
  const webkitStatus = (webkitInfo || {}).status;
  const safariInfo = [];
  const uas = implinfo.map(impl => impl.ua).filter(onlyUnique);
  uas.forEach(ua => {
    let authoritativeStatusFound = false;
    let coreStatusFound = false;
    let selectedImplInfo = null;
    implinfo.filter(impl => impl.ua === ua).forEach(impl => {
      if (authoritativeStatusFound) return;
      if (impl.source === 'feedback') {
        // Rule 0, status comes from reviewer feedback, consider
        // it as authoritative
        authoritativeStatusFound = true;
        selectedImplInfo = impl;
      }
      else if ((impl.source in parsers) &&
          !impl.guess &&
          parsers[impl.source].coreua &&
          parsers[impl.source].coreua.includes(ua)) {
        // Rule 1, status comes from the right platform, we've
        // found the implementation status unless we got some
        // feedback from a reviewer that this status is incorrect
        // which will be handled by Rule 0
        coreStatusFound = true;
        selectedImplInfo = impl;
      }
      else if (!selectedImplInfo || (!coreStatusFound && !impl.guess &&
          (statuses.indexOf(impl.status) > statuses.indexOf(selectedImplInfo.status)))) {
        // Rule 2, be optimistic in life... except if Rule 1 was
        // already applied.

        // Rule 3, constrain safari status to that of webkit when it is lower. When
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
    const spec = JSON.parse(fs.readFileSync(file, 'utf8'));

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
          support: getImplInfoForFeature(feature)
        };
      }

      // Merge implementation status at the feature level to guess
      // implementation status of the whole spec
      guessImplInfoFromFeatures(implstatus, spec.featuresCoverage);
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
