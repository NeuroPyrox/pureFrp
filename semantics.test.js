import * as assert from "assert";
import { nothing, mapE, filter, merge, mapB, apply, mapTag, tag, stepper } from "./semantics.js";

// mapE test
(function test_mapE() {
  const inEvents = [nothing, 'a', nothing, 'b'];
  const out = mapE(s => s.toUpperCase(), inEvents);
  const expected = [nothing, 'A', nothing, 'B'];
  assert.deepStrictEqual(out, expected, 'mapE uppercases event values');
})();

// filter test
(function test_filter() {
  const inEvents = ['ok', '', nothing, 'x'];
  const out = filter(s => s.length > 0, inEvents);
  const expected = ['ok', nothing, nothing, 'x'];
  assert.deepStrictEqual(out, expected, 'filter filters falsy strings');
})();

// merge test
(function test_merge() {
  const a = [nothing, 1, nothing, 3]; // ticks 0..3
  const b = [10, nothing, 20, 30];
  const both = (x, y) => `both:${x}:${y}`;
  const left = x => `L:${x}`;
  const right = y => `R:${y}`;
  const out = merge(both, left, right, a, b);
  const expected = ['R:10', 'L:1', 'R:20', 'both:3:30'];
  assert.deepStrictEqual(out, expected, 'merge combines streams with handlers');
})();

// merge test with mismatched lengths
(function test_merge_mismatched_lengths_left_shorter() {
  const a = [1, 2]; // shorter array
  const b = [10, 20, 30, 40]; // longer array
  const both = (x, y) => `both:${x}:${y}`;
  const left = x => `L:${x}`;
  const right = y => `R:${y}`;
  const out = merge(both, left, right, a, b);
  // Expected: ticks 0-1 have both values, ticks 2-3 have only b values
  const expected = ['both:1:10', 'both:2:20', 'R:30', 'R:40'];
  assert.deepStrictEqual(out, expected, 'merge handles left shorter than right');
})();

// merge test with mismatched lengths, reversed
(function test_merge_mismatched_lengths_right_shorter() {
  const a = [1, 2, 3, 4]; // longer array
  const b = [10, 20]; // shorter array
  const both = (x, y) => `both:${x}:${y}`;
  const left = x => `L:${x}`;
  const right = y => `R:${y}`;
  const out = merge(both, left, right, a, b);
  // Expected: ticks 0-1 have both values, ticks 2-3 have only a values
  const expected = ['both:1:10', 'both:2:20', 'L:3', 'L:4'];
  assert.deepStrictEqual(out, expected, 'merge handles right shorter than left');
})();

// merge test with undefined values treated as normal values
(function test_merge_undefined_values() {
  const a = [1, undefined, 3]; // mixed defined and undefined
  const b = [10, 20, undefined]; // mixed defined and undefined
  const both = (x, y) => `both:${x}:${y}`;
  const left = x => `L:${x}`;
  const right = y => `R:${y}`;
  const out = merge(both, left, right, a, b);
  // Expected: undefined is treated as a normal value, not nothing
  // Tick 0: a=1, b=10 -> both
  // Tick 1: a=undefined, b=20 -> both (undefined is a value)
  // Tick 2: a=3, b=undefined -> both (undefined is a value)
  const expected = ['both:1:10', 'both:undefined:20', 'both:3:undefined'];
  assert.deepStrictEqual(out, expected, 'merge treats undefined as a normal value');
})();

// mapB test
(function test_mapB() {
  const b2 = [1, 2, 3];
  const mapped = mapB(x => x * 2, b2);
  assert.deepStrictEqual(mapped, [2, 4, 6], 'mapB mapped numeric behavior');
})();

// apply test
(function test_apply() {
  const bA = [1, 2, 3];
  const bB = [10, 20, 30];
  const f = (a, b) => a + b;
  const applied = apply(f, bA, bB);
  assert.deepStrictEqual(applied, [11, 22, 33], 'apply combines two behaviors with a curried function');
})();

// mapTag basic test
(function test_mapTag_basic() {
  const ev = [nothing, 'e', nothing, 'f'];
  const beh = [1, 2, 3, 4];
  const out = mapTag((e, b) => `${e}-${b}`, ev, beh);
  const expected = [nothing, 'e-2', nothing, 'f-4'];
  assert.deepStrictEqual(out, expected, 'mapTag combines event value and current behavior value');
})();

// mapTag when behavior is shorter than event stream
(function test_mapTag_behavior_shorter() {
  const ev = ['x', nothing, 'y', 'z'];
  const beh = [10, 20]; // shorter behavior -> later ticks use last behavior value
  const out = mapTag((e, b) => `${e}:${b}`, ev, beh);
  const expected = ['x:10', nothing, 'y:20', 'z:20'];
  assert.deepStrictEqual(out, expected, 'mapTag uses last behavior value when behavior is shorter than events');
})();

// tag basic test
(function test_tag_basic() {
  const ev = [nothing, 1, nothing, 3];
  const beh = ['a', 'b', 'c', 'd'];
  const out = tag(ev, beh);
  const expected = [nothing, 'b', nothing, 'd'];
  assert.deepStrictEqual(out, expected, 'tag samples behavior at event ticks');
})();

// tag when event stream is shorter than behavior
(function test_tag_event_shorter() {
  const ev = [1, nothing]; // shorter event stream
  const beh = ['A', 'B', 'C'];
  const out = tag(ev, beh);
  const expected = ['A', nothing, nothing]; // past the end of the event stream events are treated as `nothing`
  assert.deepStrictEqual(out, expected, 'tag treats ticks past event length as nothing');
})();

// stepper test
(function test_stepper() {
  const ev = [nothing, 'x', nothing, 'y', nothing];
  const b = stepper('init', ev)(0);
  const expected = ['init', 'x', 'x', 'y', 'y'];
  assert.deepStrictEqual(b, expected, 'stepper holds last event value');
})();

console.log('All semantic tests passed');
