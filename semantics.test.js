const assert = require('assert');
const { nothing, mapE, filter, merge, mapB, apply, stepper } = require('./semantics');

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// mapE test
(function test_mapE() {
  const inEvents = [nothing, 'a', nothing, 'b'];
  const out = mapE(inEvents, s => s.toUpperCase());
  const expected = [nothing, 'A', nothing, 'B'];
  assert.ok(arraysEqual(out, expected), 'mapE uppercases event values');
})();

// filter test
(function test_filter() {
  const inEvents = ['ok', '', nothing, 'x'];
  const out = filter(inEvents, s => s.length > 0);
  const expected = ['ok', nothing, nothing, 'x'];
  assert.ok(arraysEqual(out, expected), 'filter filters falsy strings');
})();

// merge test
(function test_merge() {
  const a = [nothing, 1, nothing, 3]; // ticks 0..3
  const b = [10, nothing, 20, 30];
  const both = (x, y) => `both:${x}:${y}`;
  const left = x => `L:${x}`;
  const right = y => `R:${y}`;
  const out = merge(a, b, both, left, right);
  const expected = ['R:10', 'L:1', 'R:20', 'both:3:30'];
  assert.ok(arraysEqual(out, expected), 'merge combines streams with handlers');
})();

// stepper test
(function test_stepper() {
  const ev = [nothing, 'x', nothing, 'y', nothing];
  const b = stepper('init', ev)(0);
  const expected = ['init', 'x', 'x', 'y', 'y'];
  assert.deepStrictEqual(b, expected, 'stepper holds last event value');
})();

// mapB + apply test
(function test_behaviors() {
  const b1 = ['a', 'b', 'c'];
  const b2 = [1, 2, 3];
  const mapped = mapB(b2, x => x * 2);
  assert.deepStrictEqual(mapped, [2, 4, 6], 'mapB mapped numeric behavior');
  const bf = [x => x + 1, x => x + 2, x => x + 3];
  const applied = apply(bf, b2);
  assert.deepStrictEqual(applied, [2, 4, 6], 'apply applies function behavior');
})();

console.log('All semantic tests passed');
