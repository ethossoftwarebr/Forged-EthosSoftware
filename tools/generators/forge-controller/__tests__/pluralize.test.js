// Smoke test do pluralizer (#11.6): valida que a lib `pluralize@^8` cobre
// regulares + irregulares + sibilantes, preservando case do input.
// Runner: node --test (Node 20+, sem dep extra).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pluralize, resourcePath } from '../utils/case-helpers.js';

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

test('resourcePath: Product → products', () => {
  assert.equal(resourcePath('Product'), 'products');
});

test('resourcePath: Category → categories', () => {
  assert.equal(resourcePath('Category'), 'categories');
});

test('resourcePath: OrderItem → order-items', () => {
  assert.equal(resourcePath('OrderItem'), 'order-items');
});
