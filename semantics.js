const nothing = Symbol('nothing');

// List of reactives:
// 
// Event = (int -> Maybe a)
// never : Event ()
// mapE : (a -> b) -> Event a -> Event b
// filter : (a -> bool) -> Event a -> Event a
// merge : (a -> b -> c) -> (a -> c) -> (b -> c) -> Event a -> Event b -> Event c
//
// Behavior = (int -> a)
// mapB : (a -> b) -> Behavior a -> Behavior b
// apply : (a -> b -> c) -> Behavior a -> Behavior b -> Behavior c
// mapTag : (a -> b -> c) -> Event a -> Behavior b -> Event c
// tag : Event a -> Behavior b -> Event b
// 
// Moment = (int -> a)
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

const never = t => nothing;

function mapE(f, event) {
  return t => {
    const v = event(t);
    return v === nothing ? nothing : f(v);
  };
}

function filter(predicate, event) {
  return t => {
    const v = event(t);
    return v !== nothing && predicate(v) ? v : nothing;
  };
}

function merge(bothFn, leftFn, rightFn, left, right) {
  return t => {
    const l = left(t);
    const r = right(t);
    return l !== nothing && r !== nothing
      ? bothFn(l, r)
      : l !== nothing
      ? leftFn(l)
      : r !== nothing
      ? rightFn(r)
      : nothing;
  };
}

// Behaviors

function mapB(f, behavior) {
  return t => f(behavior(t));
}

// apply: (a -> b -> c) -> Behavior a -> Behavior b -> Behavior c
function apply(f, behaviorA, behaviorB) {
  return t => f(behaviorA(t), behaviorB(t));
}


function mapTag(f, event, behavior) {
  return t => {
    const e = event(t);
    return e !== nothing ? f(e, behavior(t)) : nothing;
  };
}

function tag(event, behavior) {
  return mapTag((_e, b) => b, event, behavior);
}

// Moments

// observeE: Event (Moment a) -> Event a
// Passes the current tick index as momentTime to the provided moment function
function observeE(eventOfMomentFns) {
  return t => {
    const fn = eventOfMomentFns(t);
    if (fn === nothing) return nothing;
    return fn(t);
  };
}

function switchE(eventOfEvents) {
  return function switchEAt(momentTime) {
    return t => {
      if (t < momentTime) return nothing;
      let current = null;
      for (let s = momentTime; s <= t; s++) {
        const e = eventOfEvents(s);
        if (e !== nothing) {
          current = e;
        }
      }
      return current === null ? nothing : current(t);
    };
  };
}

// stepper: initial value and an event stream -> Moment (Behavior a)
// Returns a function that, given a momentTime, yields the behavior function.
function stepper(init, event) {
  return function stepperAt(momentTime) {
    return t => {
      let current = init;
      for (let s = momentTime; s <= t; s++) {
        const v = event(s);
        if (v !== nothing) {
          current = v;
        }
      }
      return current;
    };
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
