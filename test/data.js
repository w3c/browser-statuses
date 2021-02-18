/**
 * Validate files in data folder
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ajv = new Ajv.default();
addFormats(ajv);

// Compute __dirname (not exposed when ES6 modules are used)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaFile = path.join(__dirname, '..', 'src', 'schema', 'data.json');

// Import browser specs (cannot use "import" for now since entry point is JSON)
const browserSpecs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'browser-specs', 'index.json'), 'utf8'));


function loadJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

describe('Data files', () => {
  describe('The JSON schema', () => {
    it('is valid', () => {
      const schema = loadJSON(schemaFile);
      const isSchemaValid = ajv.validateSchema(schema);
      assert.ok(isSchemaValid);
    });
  });

  describe('Individual data files', () => {
    let validate;

    before(() => {
      const schema = loadJSON(schemaFile);
      validate = ajv.compile(schema);
    });

    const dataFolder = path.join(__dirname, '..', 'data');
    const contents = fs.readdirSync(dataFolder);
    contents.filter(f => f.endsWith('.json'))
      .forEach(file => {
        describe(file, () => {
          it('has a valid name', () => {
            assert.match(file, /^[\w\-]+\.json$/, `${file} is not a valid shortname`);
          });

          it('respects the JSON schema', () => {
            const desc = loadJSON(path.join(dataFolder, file));
            const isValid = validate(desc, { format: 'full' });
            assert.strictEqual(validate.errors, null);
          });

          it('maps to an entry in browser-specs', () => {
            const shortname = file.replace(/\.json$/, '');
            const spec = browserSpecs.find(spec => spec.series.shortname === shortname);
            assert.ok(spec, `${shortname} is not the shortname of a spec series in browser-specs`);
          });
        });
      });
  });
});
