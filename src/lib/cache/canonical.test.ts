import { expect, test } from "vitest";
import { hashCall } from "./canonical.ts";

test("key order does not change the hash", () => {
  expect(hashCall({ a: 1, b: 2 }, {})).toBe(hashCall({ b: 2, a: 1 }, {}));
});

test("nested key order does not change the hash", () => {
  expect(hashCall({ x: { a: 1, b: 2 } }, {})).toBe(
    hashCall({ x: { b: 2, a: 1 } }, {}),
  );
});

test("array order is significant", () => {
  expect(hashCall({ a: [1, 2] }, {})).not.toBe(hashCall({ a: [2, 1] }, {}));
});

test("undefined fields are ignored", () => {
  expect(hashCall({ a: 1, b: undefined }, {})).toBe(hashCall({ a: 1 }, {}));
});

test("opts change the hash", () => {
  expect(hashCall({ a: 1 }, { become: true })).not.toBe(
    hashCall({ a: 1 }, {}),
  );
});
