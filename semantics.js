// TODO use null instead of undefined
// TODO order functions to be in the same order at index.html
// TODO one value per tick in behaviors
// Minimal semantic model for FRP combinators (discrete ticks)
// Event streams: one value per tick or undefined when no event occurs at that tick.
// Behavior: arrays of sampled values per tick (same length as simulated ticks).

function mapE(eventStream, f) {
  return eventStream.map(v => (v === undefined ? undefined : f(v)));
}

function filterE(eventStream, pred) {
  return eventStream.map(v => (v !== undefined && pred(v) ? v : undefined));
}

// merge two event streams with handlers:
// bothFn(a,b) when both have values at same tick
// leftFn(a) when only left has a value
// rightFn(b) when only right has a value
// Output is one value per tick (or undefined)
// TODO rewrite in a functional style
function mergeE(left, right, bothFn, leftFn, rightFn) {
  const n = Math.max(left.length, right.length);
  const out = new Array(n);
  for (let t = 0; t < n; t++) {
    const l = left[t];
    const r = right[t];
    if (l !== undefined && r !== undefined) {
      out[t] = bothFn(l, r);
    } else if (l !== undefined) {
      out[t] = leftFn(l);
    } else if (r !== undefined) {
      out[t] = rightFn(r);
    } else {
      out[t] = undefined;
    }
  }
  return out;
}

// stepper: initial value and an event stream -> behavior (sampled each tick)
// semantics: behavior[t] is last event value up to and including tick t, starting with init
// TODO don't update value until next tick
function stepper(init, eventStream) {
  const out = [];
  let current = init;
  for (let t = 0; t < eventStream.length; t++) {
    const v = eventStream[t];
    if (v !== undefined) {
      current = v;
    }
    out.push(current);
  }
  return out;
}

function mapB(behavior, f) {
  return behavior.map(f);
}

// apply: behaviorF (values functions) applied to behaviorA values -> behaviorC
// TODO use type signature defined in index.html
function apply(behaviorF, behaviorA) {
  const n = Math.max(behaviorF.length, behaviorA.length);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const f = i < behaviorF.length ? behaviorF[i] : behaviorF[behaviorF.length - 1];
    const a = i < behaviorA.length ? behaviorA[i] : behaviorA[behaviorA.length - 1];
    out[i] = f(a);
  }
  return out;
}

module.exports = { mapE, filterE, mergeE, stepper, mapB, apply };
