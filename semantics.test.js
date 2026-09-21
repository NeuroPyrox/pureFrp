import * as assert from "assert";
import { nothing, mapE, filter, merge, mapB, apply, mapTag, tag, observeE, switchE, stepper, loopEvent, loopBehavior } from "./semantics.js";

// mapE test
(function test_mapE() {
  // Create input event: fires with 'a' at t=1, 'b' at t=3
  const inEvents = t => {
    if (t === 1) return 'a';
    if (t === 3) return 'b';
    return nothing;
  };

  const out = mapE(s => s.toUpperCase(), inEvents);
  
  // Check specific ticks
  const results = [out(0), out(1), out(2), out(3)];
  const expected = [nothing, 'A', nothing, 'B'];
  assert.deepStrictEqual(results, expected, 'mapE uppercases event values');
})();

// filter test
(function test_filter() {
  // Create input event: fires with 'ok' at t=0, '' at t=1, nothing at t=2, 'x' at t=3
  const inEvents = t => {
    if (t === 0) return 'ok';
    if (t === 1) return '';
    if (t === 2) return nothing;
    if (t === 3) return 'x';
    return nothing;
  };
  
  const out = filter(s => s.length > 0, inEvents);
  
  // Check specific ticks
  const results = [out(0), out(1), out(2), out(3)];
  const expected = ['ok', nothing, nothing, 'x'];
  assert.deepStrictEqual(results, expected, 'filter filters falsy strings');
})();

// merge test
(function test_merge() {
  const a = t => {
    if (t === 1) return 1;
    if (t === 3) return 3;
    return nothing;
  };
  const b = t => {
    if (t === 0) return 10;
    if (t === 2) return 20;
    if (t === 3) return 30;
    return nothing;
  };
  
  const both = (x, y) => `both:${x}:${y}`;
  const left = x => `L:${x}`;
  const right = y => `R:${y}`;
  const out = merge(both, left, right, a, b);
  
  const results = [out(0), out(1), out(2), out(3)];
  const expected = ['R:10', 'L:1', 'R:20', 'both:3:30'];
  assert.deepStrictEqual(results, expected, 'merge combines streams with handlers');
})();

// merge test with mismatched lengths
(function test_merge_mismatched_lengths_left_shorter() {
  const a = t => {
    if (t === 0) return 1;
    if (t === 1) return 2;
    return nothing;
  };
  const b = t => {
    if (t === 0) return 10;
    if (t === 1) return 20;
    if (t === 2) return 30;
    if (t === 3) return 40;
    return nothing;
  };
  
  const both = (x, y) => `both:${x}:${y}`;
  const left = x => `L:${x}`;
  const right = y => `R:${y}`;
  const out = merge(both, left, right, a, b);
  
  const results = [out(0), out(1), out(2), out(3)];
  const expected = ['both:1:10', 'both:2:20', 'R:30', 'R:40'];
  assert.deepStrictEqual(results, expected, 'merge handles left shorter than right');
})();

// merge test with mismatched lengths, reversed
(function test_merge_mismatched_lengths_right_shorter() {
  const a = t => {
    if (t === 0) return 1;
    if (t === 1) return 2;
    if (t === 2) return 3;
    if (t === 3) return 4;
    return nothing;
  };
  const b = t => {
    if (t === 0) return 10;
    if (t === 1) return 20;
    return nothing;
  };
  
  const both = (x, y) => `both:${x}:${y}`;
  const left = x => `L:${x}`;
  const right = y => `R:${y}`;
  const out = merge(both, left, right, a, b);
  
  const results = [out(0), out(1), out(2), out(3)];
  const expected = ['both:1:10', 'both:2:20', 'L:3', 'L:4'];
  assert.deepStrictEqual(results, expected, 'merge handles right shorter than left');
})();

// merge test with undefined values treated as normal values
(function test_merge_undefined_values() {
  const a = t => {
    if (t === 0) return 1;
    if (t === 1) return undefined;
    if (t === 2) return 3;
    return nothing;
  };
  const b = t => {
    if (t === 0) return 10;
    if (t === 1) return 20;
    if (t === 2) return undefined;
    return nothing;
  };
  
  const both = (x, y) => `both:${x}:${y}`;
  const left = x => `L:${x}`;
  const right = y => `R:${y}`;
  const out = merge(both, left, right, a, b);
  
  const results = [out(0), out(1), out(2)];
  const expected = ['both:1:10', 'both:undefined:20', 'both:3:undefined'];
  assert.deepStrictEqual(results, expected, 'merge treats undefined as a normal value');
})();

// mapB test
(function test_mapB() {
  const behavior = t => t + 1; // Behavior: always has a value
  
  const mapped = mapB(x => x * 2, behavior);
  const results = [mapped(0), mapped(1), mapped(2)];
  assert.deepStrictEqual(results, [2, 4, 6], 'mapB mapped numeric behavior');
})();

// apply test
(function test_apply() {
  const bA = t => t + 1; // 1, 2, 3 for t=0,1,2
  const bB = t => (t + 1) * 10; // 10, 20, 30 for t=0,1,2
  const f = (a, b) => a + b;
  
  const applied = apply(f, bA, bB);
  const results = [applied(0), applied(1), applied(2)];
  assert.deepStrictEqual(results, [11, 22, 33], 'apply combines two behaviors with a curried function');
})();

// mapTag basic test
(function test_mapTag_basic() {
  const ev = t => {
    if (t === 1) return 'e';
    if (t === 3) return 'f';
    return nothing;
  };
  const beh = t => t + 1; // 1, 2, 3, 4 for t=0,1,2,3
  
  const out = mapTag((e, b) => `${e}-${b}`, ev, beh);
  const results = [out(0), out(1), out(2), out(3)];
  const expected = [nothing, 'e-2', nothing, 'f-4'];
  assert.deepStrictEqual(results, expected, 'mapTag combines event value and current behavior value');
})();

// mapTag when behavior is shorter than event stream
(function test_mapTag_behavior_shorter() {
  const ev = t => {
    if (t === 0) return 'x';
    if (t === 2) return 'y';
    if (t === 3) return 'z';
    return nothing;
  };
  // Behavior only defined for t=0,1, returns last value (20) for t>=2
  const beh = t => (t === 0 ? 10 : 20);
  
  const out = mapTag((e, b) => `${e}:${b}`, ev, beh);
  const results = [out(0), out(1), out(2), out(3)];
  const expected = ['x:10', nothing, 'y:20', 'z:20'];
  assert.deepStrictEqual(results, expected, 'mapTag uses last behavior value when behavior is shorter than events');
})();

// tag basic test
(function test_tag_basic() {
  const ev = t => {
    if (t === 1) return 1;
    if (t === 3) return 3;
    return nothing;
  };
  const beh = t => {
    if (t === 0) return 'a';
    if (t === 1) return 'b';
    if (t === 2) return 'c';
    return 'd';
  };
  
  const out = tag(ev, beh);
  const results = [out(0), out(1), out(2), out(3)];
  const expected = [nothing, 'b', nothing, 'd'];
  assert.deepStrictEqual(results, expected, 'tag samples behavior at event ticks');
})();

// tag when event stream is shorter than behavior
(function test_tag_event_shorter() {
  const ev = t => {
    if (t === 0) return 1;
    return nothing;
  };
  const beh = t => {
    if (t === 0) return 'A';
    if (t === 1) return 'B';
    return 'C';
  };
  
  const out = tag(ev, beh);
  const results = [out(0), out(1), out(2)];
  const expected = ['A', nothing, nothing];
  assert.deepStrictEqual(results, expected, 'tag treats ticks past event length as nothing');
})();

// observeE test
(function test_observeE() {
  const eventOfMomentFns = t => {
    if (t === 1) return momentTime => `created:${momentTime},observed:${t}`;
    if (t === 3) return momentTime => `created:${momentTime},observed:${t}`;
    return nothing;
  };

  const observed = observeE(eventOfMomentFns);
  const results = [observed(0), observed(1), observed(2), observed(3)];
  const expected = [nothing, 'created:1,observed:1', nothing, 'created:3,observed:3'];
  assert.deepStrictEqual(results, expected, 'observeE observes moments at the current tick');
})();

// observeE does not invoke a moment when its event does not fire
(function test_observeE_no_event() {
  let invoked = false;
  const eventOfMomentFns = t => {
    if (t === 1) {
      return () => {
        invoked = true;
        return 'unexpected';
      };
    }
    return nothing;
  };

  const observed = observeE(eventOfMomentFns);
  assert.strictEqual(observed(0), nothing);
  assert.strictEqual(invoked, false);
  assert.strictEqual(observed(1), 'unexpected');
  assert.strictEqual(invoked, true);
})();

// switchE test
(function test_switchE() {
  const first = t => (t === 1 ? 'first' : nothing);
  const second = t => (t === 3 ? 'second' : nothing);
  const eventOfEvents = t => {
    if (t === 0) return first;
    if (t === 2) return second;
    return nothing;
  };

  const switched = switchE(eventOfEvents)(0);
  const results = [switched(-1), switched(0), switched(1), switched(2), switched(3), switched(4)];
  const expected = [nothing, nothing, 'first', nothing, 'second', nothing];
  assert.deepStrictEqual(results, expected, 'switchE follows the most recently emitted event');
})();

// switchE delays child activation by one tick
(function test_switchE_delayed_activation() {
  const emitsOnSelection = t => (t === 0 ? 'immediate' : nothing);
  const emitsAfterActivation = t => (t === 3 ? 'delayed' : nothing);
  const eventOfEvents = t => {
    if (t === 0) return emitsOnSelection;
    if (t === 2) return emitsAfterActivation;
    return nothing;
  };

  const switched = switchE(eventOfEvents)(0);
  const results = [switched(0), switched(1), switched(2), switched(3)];
  const expected = [nothing, nothing, nothing, 'delayed'];
  assert.deepStrictEqual(
    results,
    expected,
    'switchE does not deliver a child event on the tick it is selected'
  );
})();

// stepper test
(function test_stepper() {
  const ev = t => {
    if (t === 1) return 'x';
    if (t === 3) return 'y';
    return nothing;
  };

  const b = stepper('init', ev)(0);
  const results = [b(0), b(1), b(2), b(3), b(4)];
  const expected = ['init', 'init', 'x', 'x', 'y'];
  assert.deepStrictEqual(results, expected, 'stepper delays event values by one tick');
})();

// stepper delays an event at its moment time
(function test_stepper_delayed_event_at_moment() {
  const ev = t => (t === 2 ? 'at-moment' : nothing);

  const b = stepper('init', ev)(2);
  assert.strictEqual(b(1), 'init');
  assert.strictEqual(b(2), 'init');
  assert.strictEqual(b(3), 'at-moment');
})();

// loopEvent feeds the returned event back into the builder
(function test_loopEvent() {
  const b = loopEvent(input => momentTime => [
    t => input(t),
    t => (t === 2 ? 'event-output' : nothing),
  ])(0);

  assert.strictEqual(b(1), nothing);
  assert.strictEqual(b(2), 'event-output');
})();

// loopBehavior feeds the returned behavior back into the builder
(function test_loopBehavior() {
  const b = loopBehavior(input => momentTime => [
    t => input(t) + 1,
    t => t * 2,
  ])(0);

  assert.strictEqual(b(0), 1);
  assert.strictEqual(b(3), 7);
})();

console.log('All semantic tests passed');
