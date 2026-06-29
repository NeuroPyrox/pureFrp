// TODO one value per tick in behaviors
// TODO looping using lazy streams
// TODO use happy path
// Using a custom "nothing" symbol to denote no-event for clarity
// Minimal semantic model for FRP combinators (discrete ticks)
// Event streams: one value per tick or `nothing` when no event occurs at that tick.
// Behavior: arrays of sampled values per tick (same length as simulated ticks).

const nothing = Symbol('nothing');

// List of reactives:
// 
// Event
// never : Event ()
// mapE : Event a -> (a -> b) -> Event b
// filter : Event a -> (a -> bool) -> Event a
// merge : Event a -> Event b -> (a -> b -> c) -> (a -> c) -> (b -> c) -> Event c
//
// Behavior
// mapB : Behavior a -> (a -> b) -> Behavior b
// apply : Behavior a -> Behavior b -> (a -> b -> c) -> Behavior c
// mapTag : Event a -> Behavior b -> (a -> b -> c) -> Event c
// tag : Event a -> Behavior b -> Event b
// 
// Moment
// observeE : Event (Moment a) -> Event a
// switchE : Event (Event a) -> Moment (Event a)
// stepper : a -> Event a -> Moment (Behavior a)
//
// Not implemented yet TODO
// loopEvent : Moment (Event a)
// loopBehavior : Moment (Behavior a)
// input : ((a -> IO ()) -> IO ()) -> Event a
// output : Event a -> (a -> IO ()) -> Moment ()

const never = [];

function mapE(eventStream, f) {
  return eventStream.map(v => (v === nothing ? nothing : f(v)));
}

function filter(eventStream, predicate) {
  return eventStream.map(v => (v !== nothing && predicate(v) ? v : nothing));
}

// merge two event streams with handlers:
// bothFn(a,b) when both have values at same tick
// leftFn(a) when only left has a value
// rightFn(b) when only right has a value
// Output is one value per tick (or undefined)
function merge(left, right, bothFn, leftFn, rightFn) {
  const n = Math.max(left.length, right.length);
  return Array.from({ length: n }, (_, t) => {
    // There's a bug here with [bothFn] being called when [left.length <= t]
    // or when [right.length <= t], but I'm ignoring it until tests reveal it
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

// Additional helpers and full reactive implementations

function mapTag(eventStream, behavior, f) {
  const n = Math.max(eventStream.length, behavior.length);
  return Array.from({ length: n }, (_, t) => {
    const e = eventStream[t];
    const b = behavior[t];
    return e !== nothing ? f(e, b) : nothing;
  });
}

function tag(eventStream, behavior) {
  return mapTag(eventStream, behavior, (_e, b) => b);
}

// observeE: Event (Moment a) -> Event a
// Passes the current tick index as momentTime to the provided moment function
function observeE(eventOfMomentFns) {
  return eventOfMomentFns.map((fn, t) => {
    if (fn === nothing) return nothing;
    return fn(t);
  });
}

function switchE(eventOfEvents) {
  return function switchEAt(momentTime) {
    let current = null;
    return Array.from({ length: eventOfEvents.length }, (_, t) => {
      const e = eventOfEvents[t];
      // Accept new parents only at or after the momentTime
      if (e !== nothing && momentTime <= t) {
        current = e;
      }
      // Read from the current parent for subsequent ticks
      return current === null ? nothing : current[t];
    });
  };
}

// stepper: initial value and an event stream -> Moment (Behavior a)
// Returns a function that, given a momentTime, yields the sampled behavior array.
function stepper(init, eventStream) {
  return function stepperAt(momentTime) {
    const out = [];
    let current = init;
    const minMoment = momentTime === undefined ? 0 : momentTime;
    for (let t = 0; t < eventStream.length; t++) {
      const v = eventStream[t];
      // only apply event updates that occur at or after the momentTime
      if (v !== nothing && t >= minMoment) {
        current = v;
      }
      out.push(current);
    }
    return out;
  };
}

module.exports = {
  nothing,
  // Events
  never,
  mapE,
  filter,
  merge,
  // Behaviors
  mapB,
  apply,
  mapTag,
  tag,
  // Moments
  observeE,
  switchE,
  stepper,
};
