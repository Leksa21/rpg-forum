import { toId } from './utils';

test('returns null for null', () => {
  expect(toId(null)).toBe(null);
});

test('returns null for undefined', () => {
  expect(toId(undefined)).toBe(null);
});

test('returns null for empty string', () => {
  expect(toId('')).toBe(null);
});

test('returns string ID unchanged', () => {
  expect(toId('abc123')).toBe('abc123');
});

test('extracts _id from a populated object', () => {
  expect(toId({ _id: 'abc123', name: 'Rivendell' })).toBe('abc123');
});

test('calls toString on a non-string _id (e.g. ObjectId)', () => {
  const fakeObjectId = { _id: { toString: () => 'deadbeef' } };
  expect(toId(fakeObjectId)).toBe('deadbeef');
});

test('falls back to toString for non-object values', () => {
  expect(toId(42)).toBe('42');
});
