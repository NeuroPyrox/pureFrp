// Using a custom "nothing" symbol to denote no-event for clarity
// TODO order functions to be in the same order at index.html
// TODO one value per tick in behaviors
// Minimal semantic model for FRP combinators (discrete ticks)
// Event streams: one value per tick or `nothing` when no event occurs at that tick.
// Behavior: arrays of sampled values per tick (same length as simulated ticks).

const nothing = Symbol('nothing');

// List of reactives:
// input : ((a -> IO ()) -> IO ()) -> Event a
// never : Event ()
// mapE : Event a -> (a -> b) -> Event b
// filter : Event a -> (a -> bool) -> Event a
// merge : Event a -> Event b -> (a -> b -> c) -> (a -> c) -> (b -> c) -> Event c
// mapB : Behavior a -> (a -> b) -> Behavior b
// apply : Behavior a -> Behavior b -> (a -> b -> c) -> Behavior c
// mapTag : Event a -> Behavior b -> (a -> b -> c) -> Event c
// tag : Event a -> Behavior b -> Event b
// observeE : Event (Moment a) -> Event a
// output : Event a -> (a -> IO ()) -> Moment ()
// switchE : Event (Event a) -> Moment (Event a)
// stepper : a -> Event a -> Moment (Behavior a)
// mergeBind : Event (Event a) -> (Event a -> Event b) -> Moment (Event b)
// loopEvent : Moment (Event a)
// loopBehavior : Moment (Behavior a)

function mapE(eventStream, f) {
  return eventStream.map(v => (v === nothing ? nothing : f(v)));
}

function filterE(eventStream, pred) {
  return eventStream.map(v => (v !== nothing && pred(v) ? v : nothing));
}

// merge two event streams with handlers:
// bothFn(a,b) when both have values at same tick
// leftFn(a) when only left has a value
// rightFn(b) when only right has a value
// Output is one value per tick (or undefined)
function mergeE(left, right, bothFn, leftFn, rightFn) {
  const n = Math.max(left.length, right.length);
  return Array.from({ length: n }, (_, t) => {
    const l = left[t];
    const r = right[t];
    return l !== nothing && r !== nothing
      ? bothFn(l, r)
      : l !== nothing
      ? leftFn(l)
      : r !== nothing
      ? rightFn(r)
      : nothing;
  });
}

// stepper: initial value and an event stream -> behavior (sampled each tick)
// semantics: behavior[t] is last event value up to and including tick t, starting with init
// TODO don't update value until next tick
// TODO rewrite in a more functional style
function stepper(init, eventStream) {
  const out = [];
  let current = init;
  for (let t = 0; t < eventStream.length; t++) {
    const v = eventStream[t];
    if (v !== nothing) {
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
// TODO rewrite in a more functional style
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

module.exports = { mapE, filterE, mergeE, stepper, mapB, apply, nothing };
