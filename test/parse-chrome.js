/**
 * Check Chrome Platform Status data parser
 */

import assert from 'assert';
import nock from 'nock';
import { fetchImplementationData, getImplementationStatus, coreua } from '../src/parse-chrome.js';
import * as caniuseParser from '../src/parse-caniuse.js';

describe('The Webkit Platform Status parser', () => {
  before(async () => {
    nock.disableNetConnect();
    nock('https://www.chromestatus.com')
      .get('/features.json')
      .reply(200, chromeData);
    nock('https://caniuse.com')
      .get('/data.json')
      .reply(200, caniuseData);

    await fetchImplementationData();
    await caniuseParser.fetchImplementationData();
    assert.ok(nock.isDone(), 'Parser did not fetch implementation data');
  });

  it('has authoritative info on Chrome', () => {
    assert.ok(coreua.includes('chrome'));
    assert.ok(coreua.includes('chrome_android'));
  });

  it('returns implementation info for the beacon spec', () => {
    const info = getImplementationStatus(5517433905348608);
    const chromeInfo = info.find(d => d.ua === 'chrome');
    ['chrome', 'edge', 'firefox', 'safari'].forEach(ua => {
      const uaInfo = info.find(d => d.ua === ua);
      assert.deepEqual(uaInfo, {
        ua,
        status: (ua === 'safari') ? 'notsupported' : 'shipped',
        href: 'https://www.chromestatus.com/feature/5517433905348608',
        source: 'chrome'
      });
    });
  });
});


/**
 * An extract of Chrome Platform Status data to avoid a network request to
 * fetch the actual data in tests.
 */
const chromeData = [
  {
    "api_spec": false,
    "browsers": {
      "chrome": {
        "android": 39,
        "blink_components": [
          "Blink>Network"
        ],
        "bug": "http://crbug.com/360603",
        "desktop": 39,
        "flag": false,
        "intervention": false,
        "origintrial": false,
        "owners": [
          "sof@opera.com",
          "sidv@chromium.org",
          "igrigorik@chromium.org"
        ],
        "prefixed": false,
        "status": {
          "milestone_str": 39,
          "text": "Enabled by default",
          "val": 5
        }
      },
      "edge": {
        "view": {
          "text": "Shipped/Shipping",
          "url": "http://status.modern.ie/beacon",
          "val": 1
        }
      },
      "ff": {
        "view": {
          "text": "Shipped/Shipping",
          "url": "https://bugzilla.mozilla.org/show_bug.cgi?id=936340",
          "val": 1
        }
      },
      "safari": {
        "view": {
          "text": "No signal",
          "val": 5
        }
      },
      "webdev": {
        "view": {
          "text": "Positive",
          "val": 2
        }
      }
    },
    "category": "Miscellaneous",
    "comments": "",
    "deleted": false,
    "feature_type": "New feature incubation",
    "feature_type_int": 0,
    "footprint": 2,
    "id": 5517433905348608,
    "intent_stage": "None",
    "intent_stage_int": 0,
    "intent_template_use_count": 0,
    "is_released": true,
    "name": "Beacon",
    "privacy_review_status": "Pending",
    "resources": {
      "docs": [
        "https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon",
        "http://updates.html5rocks.com/2014/10/Send-beacon-data-in-Chrome-39"
      ],
      "samples": [
        "https://github.com/GoogleChrome/samples/tree/gh-pages/beacon"
      ]
    },
    "security_review_status": "Pending",
    "standards": {
      "spec": "https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/Beacon/Overview.html",
      "status": {
        "text": "Editor's draft",
        "val": 4
      }
    },
    "star_count": 2,
    "summary": "This specification defines an interoperable means for site developers to asynchronously transfer small HTTP data from the User Agent to a web server.\r\n\r\nInitiated by the navigator.sendBeacon() method, the 'beacon' data will be transmitted by the User Agent as soon as possible, but independent of document navigation. The sendBeacon method returns true if the user agent is able to successfully queue the data for transfer. Otherwise it returns false.",
    "tag_review_status": "Pending",
    "unlisted": false,
    "updated": {
      "by": "khulmikuki@gmail.com",
      "when": "2020-11-09 13:47:18.282585"
    },
    "visibility": 3
  }
];


/**
 * An extract of Can I Use data to avoid a network request to fetch the actual
 * data in tests.
 */
const caniuseData = {
  "data": {},
  "agents": {
    "edge": {
      "browser": "Edge",
      "long_name": "Microsoft Edge",
      "abbr": "Edge",
      "prefix": "webkit",
      "type": "desktop",
      "usage_global": {
        "12": 0.0083,
        "13": 0.00415,
        "14": 0.0083,
        "15": 0.0083,
        "16": 0.01245,
        "17": 0.0332,
        "18": 0.166,
        "79": 0,
        "80": 0.0083,
        "81": 0.00944,
        "83": 0.00415,
        "84": 0.0083,
        "85": 0.0166,
        "86": 0.03735,
        "87": 2.35305,
        "88": 0.7968
      },
      "versions": [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "79",
        "80",
        "81",
        "83",
        "84",
        "85",
        "86",
        "87",
        "88",
        null,
        null,
        null
      ],
      "prefix_exceptions": {
        "12": "ms",
        "13": "ms",
        "14": "ms",
        "15": "ms",
        "16": "ms",
        "17": "ms",
        "18": "ms"
      }
    },
    "chrome": {
      "browser": "Chrome",
      "long_name": "Google Chrome",
      "abbr": "Chr.",
      "prefix": "webkit",
      "type": "desktop",
      "usage_global": {
        "4": 0.004706,
        "5": 0.004879,
        "6": 0.004879,
        "7": 0.005591,
        "8": 0.005591,
        "9": 0.005591,
        "10": 0.004534,
        "11": 0.004464,
        "12": 0.010424,
        "13": 0.0083,
        "14": 0.004706,
        "15": 0.015087,
        "16": 0.004393,
        "17": 0.004393,
        "18": 0.008652,
        "19": 0.00415,
        "20": 0.004393,
        "21": 0.004317,
        "22": 0.0083,
        "23": 0.008786,
        "24": 0.0083,
        "25": 0.004461,
        "26": 0.00415,
        "27": 0.004326,
        "28": 0.0047,
        "29": 0.004538,
        "30": 0.00415,
        "31": 0.0083,
        "32": 0.004566,
        "33": 0.0083,
        "34": 0.0083,
        "35": 0.0083,
        "36": 0.004335,
        "37": 0.004464,
        "38": 0.02905,
        "39": 0.004464,
        "40": 0.01245,
        "41": 0.0236,
        "42": 0.004403,
        "43": 0.0083,
        "44": 0.004465,
        "45": 0.004642,
        "46": 0.004891,
        "47": 0.0083,
        "48": 0.02075,
        "49": 0.2158,
        "50": 0.00415,
        "51": 0.00415,
        "52": 0.00415,
        "53": 0.0498,
        "54": 0.0083,
        "55": 0.01245,
        "56": 0.03735,
        "57": 0.0083,
        "58": 0.01245,
        "59": 0.0083,
        "60": 0.0083,
        "61": 0.02905,
        "62": 0.01245,
        "63": 0.0249,
        "64": 0.01245,
        "65": 0.0249,
        "66": 0.02075,
        "67": 0.0249,
        "68": 0.02905,
        "69": 0.0581,
        "70": 0.0415,
        "71": 0.03735,
        "72": 0.03735,
        "73": 0.0249,
        "74": 0.10375,
        "75": 0.0747,
        "76": 0.0664,
        "77": 0.03735,
        "78": 0.0664,
        "79": 0.1245,
        "80": 0.1328,
        "81": 0.10375,
        "83": 0.1577,
        "84": 0.21165,
        "85": 0.3154,
        "86": 0.6142,
        "87": 20.2728,
        "88": 3.3449,
        "89": 0.02075,
        "90": 0.0083,
        "91": 0
      },
      "versions": [
        null,
        null,
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20",
        "21",
        "22",
        "23",
        "24",
        "25",
        "26",
        "27",
        "28",
        "29",
        "30",
        "31",
        "32",
        "33",
        "34",
        "35",
        "36",
        "37",
        "38",
        "39",
        "40",
        "41",
        "42",
        "43",
        "44",
        "45",
        "46",
        "47",
        "48",
        "49",
        "50",
        "51",
        "52",
        "53",
        "54",
        "55",
        "56",
        "57",
        "58",
        "59",
        "60",
        "61",
        "62",
        "63",
        "64",
        "65",
        "66",
        "67",
        "68",
        "69",
        "70",
        "71",
        "72",
        "73",
        "74",
        "75",
        "76",
        "77",
        "78",
        "79",
        "80",
        "81",
        "83",
        "84",
        "85",
        "86",
        "87",
        "88",
        "89",
        "90",
        "91"
      ]
    }
  }
};