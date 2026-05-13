// Smoke test do pluralizer (#11.6): valida que a lib `pluralize@^8` cobre
// regulares + irregulares + sibilantes, preservando case do input.
// Runner: node --test (Node 20+, sem dep extra).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pluralize, resourcePath, pluralPascal } from '../utils/case-helpers.js';

test('Product → Products (regular consoante)', () => {
  assert.equal(pluralize('Product'), 'Products');
});

test('Category → Categories (regular -y → -ies)', () => {
  assert.equal(pluralize('Category'), 'Categories');
});

test('Person → People (irregular)', () => {
  assert.equal(pluralize('Person'), 'People');
});

test('Box → Boxes (sibilante -x → -es)', () => {
  assert.equal(pluralize('Box'), 'Boxes');
});

test('Goose → Geese (irregular vowel mutation)', () => {
  assert.equal(pluralize('Goose'), 'Geese');
});

test('pluralPascal: Person → People (preserva case)', () => {
  assert.equal(pluralPascal('Person'), 'People');
});

test('pluralPascal: Category → Categories', () => {
  assert.equal(pluralPascal('Category'), 'Categories');
});

test('resourcePath: OrderItem → order-items', () => {
  assert.equal(resourcePath('OrderItem'), 'order-items');
});
