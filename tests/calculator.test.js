import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, parseIPv4, formatIPv4, addressAt, addressesForPage } from '../site/calculator.js';

test('requested example: non-contiguous mask produces four ascending addresses', () => {
  const result = calculate('192.168.1.0', '0.0.0.12');
  assert.equal(result.count, 4);
  assert.deepEqual(addressesForPage(result, 0), ['192.168.1.0', '192.168.1.4', '192.168.1.8', '192.168.1.12']);
});

test('fixed host bits are preserved and wildcard bits in input may start at one', () => {
  assert.deepEqual(addressesForPage(calculate('192.168.1.10', '0.0.0.12'), 0), ['192.168.1.2', '192.168.1.6', '192.168.1.10', '192.168.1.14']);
});

test('full subnet includes network and broadcast and respects page boundaries', () => {
  const result = calculate('192.168.1.0', '0.0.0.255');
  assert.equal(result.count, 256);
  assert.equal(addressesForPage(result, 0)[0], '192.168.1.0');
  assert.equal(addressesForPage(result, 0).length, 256);
  assert.equal(addressesForPage(result, 0).at(-1), '192.168.1.255');
  assert.throws(() => addressesForPage(result, 1), RangeError);
  const multiplePages = calculate('192.168.0.0', '0.0.1.255');
  assert.equal(addressesForPage(multiplePages, 0).at(-1), '192.168.0.255');
  assert.equal(addressesForPage(multiplePages, 1)[0], '192.168.1.0');
  assert.equal(addressesForPage(multiplePages, 1).length, 256);
  assert.equal(addressesForPage(multiplePages, 1).at(-1), '192.168.1.255');
  assert.equal(addressesForPage(result, 2, 100).length, 56);
});

test('zero mask returns exactly one address, including upper IPv4 bound', () => {
  assert.deepEqual(addressesForPage(calculate('255.255.255.255', '0.0.0.0'), 0), ['255.255.255.255']);
  assert.deepEqual(addressesForPage(calculate('0.0.0.0', '0.0.0.0'), 0), ['0.0.0.0']);
});

test('all wildcard bits uses unsigned arithmetic without allocating all addresses', () => {
  const result = calculate('0.0.0.0', '255.255.255.255');
  assert.equal(result.count, 4294967296);
  assert.equal(addressAt(result, 2147483648), '128.0.0.0');
  assert.equal(addressAt(result, 4294967295), '255.255.255.255');
  assert.equal(addressesForPage(result, 16777215).at(-1), '255.255.255.255');
});

test('non-contiguous bits across octets and sign bit enumerate in ascending order', () => {
  assert.deepEqual(addressesForPage(calculate('10.0.0.0', '0.1.0.1'), 0), ['10.0.0.0', '10.0.0.1', '10.1.0.0', '10.1.0.1']);
  assert.deepEqual(addressesForPage(calculate('0.0.0.0', '128.0.0.1'), 0), ['0.0.0.0', '0.0.0.1', '128.0.0.0', '128.0.0.1']);
});

test('ACL masks may vary any bits without a CIDR boundary', () => {
  assert.deepEqual(addressesForPage(calculate('192.168.1.0', '0.0.1.0'), 0), ['192.168.0.0', '192.168.1.0']);
  assert.deepEqual(addressesForPage(calculate('192.168.1.128', '0.0.0.128'), 0), ['192.168.1.0', '192.168.1.128']);
  assert.deepEqual(addressesForPage(calculate('192.168.1.1', '0.0.0.1'), 0), ['192.168.1.0', '192.168.1.1']);
  const result = calculate('203.0.113.7', '255.255.255.255');
  assert.equal(result.count, 4294967296);
  assert.equal(addressAt(result, 0), '0.0.0.0');
  assert.equal(addressAt(result, result.count - 1), '255.255.255.255');
});

test('malformed IPv4 and CIDR inputs are rejected', () => {
  for (const value of ['', '256.0.0.1', '-1.0.0.0', '1.2.3', '1.2.3.4.5', '01.2.3.4', '1e2.0.0.0', '1. 2.3.4', '1..3.4', '::1', '<script>']) {
    assert.throws(() => parseIPv4(value));
  }
  for (const value of ['1.2.3.4/24', '1.2.3.4/', '1.2.3.4/33', '1.2.3.4/-1', '1.2.3.4/024', '1.2.3.4/24/0', '1.2.3.4/2.4']) {
    assert.throws(() => calculate(value, '0.0.0.0'));
  }
  assert.throws(() => calculate('192.168.1.0', '0.0.0.256'));
  assert.equal(formatIPv4(parseIPv4(' 192.168.1.0 ')), '192.168.1.0');
});

test('invalid index/page requests fail instead of returning misleading results', () => {
  const result = calculate('192.168.1.0', '0.0.0.12');
  for (const index of [-1, 4, 1.5, NaN]) assert.throws(() => addressAt(result, index), RangeError);
  for (const page of [-1, 1, 0.1]) assert.throws(() => addressesForPage(result, page), RangeError);
  for (const size of [0, -1, 1.5, 65537]) assert.throws(() => addressesForPage(result, 0, size), RangeError);
});

test('all last-octet masks match an independent exhaustive ACL predicate', () => {
  for (let mask = 0; mask < 256; mask += 1) {
    const input = 173;
    const result = calculate(`192.168.1.${input}`, `0.0.0.${mask}`);
    const expected = [];
    for (let candidate = 0; candidate < 256; candidate += 1) {
      if ((candidate & (255 - mask)) === (input & (255 - mask))) expected.push(`192.168.1.${candidate}`);
    }
    assert.deepEqual(addressesForPage(result, 0, 256), expected);
  }
});
