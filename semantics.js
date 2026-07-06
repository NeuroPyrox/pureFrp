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
// mapE : (a -> b) -> Event a -> Event b
// filter : (a -> bool) -> Event a -> Event a
// merge : (a -> b -> c) -> (a -> c) -> (b -> c) -> Event a -> Event b -> Event c
//
// Behavior
// mapB : (a -> b) -> Behavior a -> Behavior b
// apply : (a -> b -> c) -> Behavior a -> Behavior b -> Behavior c
// mapTag : (a -> b -> c) -> Event a -> Behavior b -> Event c
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

// Events

const never = [];

function mapE(f, eventStream) {
  return eventStream.map(v => (v === nothing ? nothing : f(v)));
}

function filter(predicate, eventStream) {
  return eventStream.map(v => (v !== nothing && predicate(v) ? v : nothing));
}

// merge two event streams with handlers:
// bothFn(a,b) when both have values at same tick
// leftFn(a) when only left has a value
// rightFn(b) when only right has a value
// Output is one value per tick (or nothing)
function merge(bothFn, leftFn, rightFn, left, right) {
  const n = Math.max(left.length, right.length);
  return Array.from({ length: n }, (_, t) => {
    const leftHas = t < left.length;
    const rightHas = t < right.length;
    const l = leftHas ? left[t] : nothing;
    const r = rightHas ? right[t] : nothing;
    return l !== nothing && r !== nothing
      ? bothFn(l, r)
      : l !== nothing
      ? leftFn(l)
      : r !== nothing
      ? rightFn(r)
      : nothing;
  });
}

// Behaviors

function mapB(f, behavior) {
  return behavior.map(f);
}

// TODO user Array.from
// apply: (a -> b -> c) -> Behavior a -> Behavior b -> Behavior c
function apply(f, behaviorA, behaviorB) {
  const n = Math.max(behaviorA.length, behaviorB.length);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = i < behaviorA.length ? behaviorA[i] : behaviorA[behaviorA.length - 1];
    const b = i < behaviorB.length ? behaviorB[i] : behaviorB[behaviorB.length - 1];
    out[i] = f(a, b);
  }
  return out;
}


function mapTag(f, eventStream, behavior) {
  const n = Math.max(eventStream.length, behavior.length);
  return Array.from({ length: n }, (_, t) => {
    const e = eventStream[t];
    const b = behavior[t];
    return e !== nothing ? f(e, b) : nothing;
  });
}

function tag(eventStream, behavior) {
  return mapTag((_e, b) => b, eventStream, behavior);
}

// Moments

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

export { 
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
