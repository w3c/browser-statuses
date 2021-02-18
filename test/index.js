/**
 * Validate the index.json file
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
const schemaFile = path.join(__dirname, '..', 'src', 'schema', 'index.json');

function loadJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

describe('Generated index', () => {
  describe('The JSON schema', () => {
    it('is valid', () => {
      const schema = loadJSON(schemaFile);
      const isSchemaValid = ajv.validateSchema(schema);
      assert.ok(isSchemaValid);
    });
  });

  describe('The index file', () => {
    it('respects the JSON schema', () => {
      const schema = loadJSON(schemaFile);
      const index = loadJSON(path.join(__dirname, '..', 'index.json'));
      const validate = ajv.compile(schema);
      const isValid = validate(index, { format: 'full' });
      assert.strictEqual(validate.errors, null);
    });
  });
});
