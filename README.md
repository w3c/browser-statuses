# Web browser implementation statuses

This repository contains implementation support information of Web technologies
on main desktop and mobile Web browsers, assembled from data gleaned from
external open source platform status projects:
- [Can I Use](https://caniuse.com/)
- [Chrome Platform Status](https://www.chromestatus.com/)
- [MDN's Browser Compatilibity Data](https://github.com/mdn/browser-compat-data)
- [Webkit Feature Status](https://webkit.org/status/)

This Web technologies included in the final list are those for which there
exists some implementation information. The list is expected to grow over time.
It should roughly contain specifications in
[browser-specs](https://github.com/w3c/browser-specs), in other words those
published by W3C Working Groups, as well as standards and proposals developed or
incubated in W3C Community Groups, the WHATWG, or the Khronos Group.


## Table of Contents

- [Installation and usage](#installation-and-usage)
- [List of Web browsers](#list-of-web-browsers)
- [Spec series object](#spec-series-object)
  - [`shortname`](#shortname)
  - [`support`](#support)
  - [`features`](#features)
    - [Feature `url`](#feature-url)
    - [Feature `title`](#feature-title)
    - [Feature `support`](#feature-support)
  - [`polyfills`](#polyfills)
    - [Polyfill `url`](#polyfill-url)
    - [Polyfill `label`](#polyfill-label)
- [Implementation info object](#implementation-info-object)
  - [`ua`](#ua)
  - [`status`](#status)
  - [`source`](#source)
  - [`flag`](#flag)
  - [`guess`](#guess)
  - [`partial`](#partial)
  - [`prefix`](#prefix)
  - [`selected`](#selected)
  - [`details`](#details)
    - [`href`](#href)
    - [`representative`](#representative)
    - [`notes`](#notes)
- [How to add/update/delete implementation info](#how-to-addupdatedelete-implementation-info)
- [Versioning](#versioning)
- [Development notes](#development-notes)
  - [How to generate `index.json` manually](#how-to-generate-indexjson-manually)
  - [Tests](#tests)
- [Attributions](#attributions)


## Installation and usage

The data is distributed as an NPM package. To incorporate it to your project,
run:

```bash
npm install browser-statuses
```

You can then retrieve the list from your Node.js program:

```js
const impldata = require("browser-statuses");
console.log(JSON.stringify(impldata, null, 2));
```

Alternatively, you can either retrieve the [latest
release](https://github.com/w3c/browser-statuses/releases/latest) or fetch
[`index.json`](https://w3c.github.io/browser-statuses/index.json).

**Note:** If you choose to fetch the `index.json` file directly, keep in mind
that it may contain (possibly incorrect) updates that have not yet been included
in the NPM package and the latest GitHub release.


## List of Web browsers

The implementation info is available for the following browsers:

| identifier | name | type |
| ---------- | ---- | ---- |
| `baidu_android` | Baidu Browser | mobile |
| `chrome` | Google Chrome | desktop |
| `chrome_android` | Google Chrome | mobile |
| `edge` | Microsoft Edge, based on Chromium | desktop |
| `firefox` | Mozilla Firefox | desktop |
| `firefox_android` | Mozilla Firefox | mobile |
| `opera` | Opera | desktop |
| `qq_android` | QQ Browser | mobile |
| `safari` | Apple Safari | desktop |
| `safari_ios` | Apple Safari for iOS | mobile |
| `samsunginternet_android` | Samsung Internet | mobile |
| `uc_android` | UC Browser | mobile |
| `webkit` | Webkit | engine |


## Spec series object

Each entry in the list describes the implementation status of a **specification
series**, and/or of some of the features it defines, on main desktop and mobile
Web browsers. Each entry has the following overall structure:

```json
{
  "shortname": "series shortname",
  "support": [
    {
      "ua": "user agent identifier",
      "status": "implementation status",
      "source": "platform status project that gave birth to this info",
      "details": [
        {
          "status": "implementation status",
          "flag": true,
          "notes": ["Possible implementation notes"],
          "href": "URL to the corresponding platform status project page"
        },
        "other implementation status pages considered to compute overall status"
      ],
      "selected": true
    }
  ],
  "features": {
    "feature name": {
      "url": "URL of the section that defines the feature in the spec",
      "title": "Human readable description of the feature",
      "support": ["same construct as main one"]
    }
  },
  "polyfills": [
    {
      "url": "URL of a polyfill library",
      "label": "Name of the polyfill library"
    }
  ]
}
```

In many cases, the `features` level will not exist, and implementation support
information will only exist at the series level. Here is a simple example
(support info truncated to keep number of lines minimal):

```json


{
  "shortname": "beacon",
  "support": [
    {
      "ua": "chrome",
      "status": "shipped",
      "source": "bcd",
      "details": [
        {
          "status": "shipped",
          "notes": [
            "Starting in Chrome 59, this method cannot send a <code>Blob</code> whose type is not CORS safelisted. This is a temporary change until a mitigation can be found for the security issues that this creates. For more information see <a href='https://crbug.com/720283'>Chrome bug 720283</a>."
          ],
          "href": "https://developer.mozilla.org/docs/Web/API/Navigator/sendBeacon",
          "representative": true
        }
      ]
    },
    {
      "ua": "chrome",
      "status": "shipped",
      "source": "chrome",
      "details": [
        {
          "status": "shipped",
          "href": "https://www.chromestatus.com/feature/5517433905348608",
          "representative": true
        }
      ],
      "selected": true
    },
    {
      "ua": "firefox",
      "status": "shipped",
      "source": "bcd",
      "details": [
        {
          "status": "shipped",
          "href": "https://developer.mozilla.org/docs/Web/API/Navigator/sendBeacon",
          "representative": true
        }
      ],
      "selected": true
    },
    {
      "ua": "firefox",
      "status": "shipped",
      "source": "caniuse",
      "details": [
        {
          "status": "shipped",
          "href": "https://caniuse.com/#feat=beacon",
          "representative": true
        }
      ]
    }
  ]
}
```


### `shortname`

A shortname that uniquely identifies the spec series. In most cases, the series
shortname is the shortname of an individual spec in the series without the level
or version number. For instance, the series' shortname for `css-color-5` is
`css-color`. When a specification is not versioned, the series' shortname is
identical to the spec's shortname.

All spec series described in this project must exist in 
[browser-specs](https://github.com/w3c/browser-specs/). In other words, the
value of the `shortname` property must match the value of a
[`series.shortname` property](https://github.com/w3c/browser-specs/#seriesshortname)
in the [`index.json`](https://github.com/w3c/browser-specs/blob/master/index.json)
file of browser-specs.

The `shortname` property is always set.


### `support`

The list of implementation support information for the specification series.
Each item in the list is an [Implementation info object](#implementation-info-object)
that describes the implementation support in a given browser.

There may be more than one implementation support information in the list for
the same browser, as information may come from different sources. The most
authoritative source will be flagged with a [`selected`](#selected) property set
to `true`.

The `support` property is usually set, but there may exist a few specs in the
list for which there is no implementation support information, and that still
appear in the list, e.g. because there are known polyfills.


### `features`

A list of specific features defined in the specification, indexed by some unique
feature identifier.


#### Feature `url`

A pointer to the definition of the feature in the latest Editor's Draft of the
specification.

The URL must be an absolute URL.

The `url` property should be set whenever possible. It may not be set in cases
where the feature describes a generic concept (e.g. "support in workers").


#### Feature `title`

A short human-readable English title for the feature.


#### Feature `support`

The list of implementation support information for the feature. Each item in the
list is an [Implementation info object](#implementation-info-object) that
describes the implementation support in a given browser. See also
[`support`](#support).


### `polyfills`

A list of known polyfills for the specification. Each polyfill has the following
properties.


#### Polyfill `url`

The URL to the web site that describes the polyfill.

The `url` property is always set.


#### Polyfill `label`

The name of the polyfill.

The `label` property is always set.


## Implementation info object

All items in `support` properties describe the implementation status of the
underlying specification or feature in a given browser, collected from one of
the external platform status projects.

The structure and possible properties that may appear in an implementation info
object are illustrated by the following example:

```json
{
  "ua": "safari",
  "status": "experimental",
  "source": "caniuse",
  "guess": true,
  "flag": true,
  "partial": true,
  "selected": true,
  "details": ["support info details"]
}
```

### `ua`

An identifier for the browser, see [List of web browsers](#list-of-web-browsers).

The `ua` property is always set.


### `status`

The implementation status for the spec or feature. Value may be one of:
- `"shipped"`: spec or feature is supported
- `"experimental"`: support for the spec or feature is available but not final
- `"indevelopment"`: implementation of the spec or feature is ongoing
- `"consideration"`: support for the spec or feature is under consideration but
not under active developement.
- `""`: spec or feature is not supported in the browser.

The `status` property is always set.


### `source`

The provenance for the implementation status information. Can be one of:
- `bcd`: [MDN's Browser Compatilibity Data](https://github.com/mdn/browser-compat-data) project
- `caniuse`: [Can I Use](https://caniuse.com/)
- `chrome`: [Chrome Platform Status](https://www.chromestatus.com/)
- `webkit`: [Webkit Feature Status](https://webkit.org/status/)
- `feedback`: Specific feedback received
- `other`: Heard through the grapevine

The last two types of information are maintained manually in this repository.
They should only be used as last resort when information from other sources is
invalid or inexistant for some reason.

The `source` property is always set.


### `flag`

A boolean flag set to `true` when the spec or feature is available behind a flag
and needs to be manually enabled by the user before it may be used.

The `flag` property is only set when it is truthy.


### `guess`

A boolean flag that may only appear at the spec series level, set to `true` when
the implementation info was derived from support for individual features that
the specification defines.

When the flag is true, the [`features`](#features-support) property gives the
list of feature identifiers that were used to derive the overall implementation
status.

The `guess` property is only set when it is truthy.


### `partial`

A boolean flag set to `true` when implementation of the spec or feature is known
to be incomplete.

The `partial` property is only set when it is truthy.


### `prefix`

A boolean flag set to `true` when the implementation of the spec or feature
requires a prefix (e.g. `webkitXXX`), as is typically the case as long as an
API is not final.

The `prefix` property is only set when it is truthy.


### `selected`

A boolean flag set to `true` when the implementation information is the best
one in the list for the browser, typically because it originates from the
most authoritative source for the browser (Chrome Platform Status for Chrome,
Webkit status for Safari). 

The `selected` property is only set when it is truthy. For each browser that
appears in a `support` list, there will always be one and only one
implementation info object with a `selected` flag set to `true`.


### `details`

The implementation status at the spec series or feature level is often computed
by looking at a set of platform status entries. The `details` property is an
array that lists the implementation status for each of them.

Each item in the array looks like the following example:

```json
{
  "status": "shipped",
  "href": "https://www.chromestatus.com/feature/6488656873259008",
  "representative": true
}
```

Some of the properties that may appear in `details` items are the same as those
in `support`: [`status`](#status), [`flag`](#flag), [`partial`](#partial),
[`prefix`](#prefix).

Additional properties are described below.


#### `href`

The absolute URL of the page that describes the spec or feature in the platform
status project that is at the source of the info.

The `href` property is always set. It uniquely identifies the related entry in
the platform status project.


#### `representative`

A boolean flag set that indicates whether the related entry in the platform
status project is considered to be representative of the implementation of
the underlying spec or feature. There may be more than one representative entry
for a given spec or feature.

When there are entries for which the `representative` flag is set, only these
entries are taken into account to compute the final implementation status of
the underlying spec or feature, even though the implementation status of non
representative entries still appears in the `details` array.

In the absence of entries for which the `representative` flag is set, the final
implementation status takes the individual implementation status of all
(non representative) entries into account, and the resulting status is
considered to be a guess (see the [`guess`](#guess) flag).

The `representative` flag is only set when it is truthy.


#### `notes`

A list of implementation notes, collected from the implementation info source.

The `notes` property is only set when needed.


## How to add/update/delete implementation info

If you believe that a spec or a feature should be added, modified, or removed
from the list, or if you would like to otherwise contribute to this project,
please check the [contributing instructions](CONTRIBUTING.md).


## Versioning

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
with the following increment rules given a `major.minor.patch` version:
- `major`: A property disappeared, its meaning has changed, or some other
incompatible API change was made. When the `major` number gets incremented, code
that parses the list likely needs to be updated.
- `minor`: A new property was added, the list of spec changed (a new spec was
added, or a spec was removed). Code that parses the list should continue to work
undisturbed, but please note that there is no guarantee that a spec that was
present in the previous version will continue to appear in the new version.
- `patch`: Implementation info about one or more specs changed. Minor updates
were made to the code that don't affect the list.


## Development notes

### How to generate `index.json` manually

To re-generate the `index.json` file locally, run:

```bash
npm run build
```


### Tests

To run all tests:

```bash
npm test
```

Tests are run automatically on pull requests.


## Attributions

Implementation support information gets assembled from the following external
open source platform status projects:

- [Can I Use](https://caniuse.com/) was built and is maintained by
[Alexis Deveria](http://a.deveria.com/). Data is published under the
[CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) license.
- [MDN's Browser Compatilibity Data](https://github.com/mdn/browser-compat-data)
is published under the [CC0](https://github.com/mdn/browser-compat-data/blob/master/LICENSE)
license.
- The [Chrome Platform Status](https://www.chromestatus.com/) Web site and
material are published under the
[Apache License 2.0](https://github.com/GoogleChrome/chromium-dashboard/blob/main/LICENSE).
- Data from the [Webkit Feature Status](https://webkit.org/status/) is licensed
under the [BSD License](https://webkit.org/licensing-webkit/).

The code that generates and validates the `index.json` file makes use of a
number of open source libraries, listed as dev dependencies in
[`package.json`](package.json). Kudos to everyone involved in these projects! 🙏
