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
// loopEvent : (Event a -> Moment(b, Event a)) -> Moment b
// loopBehavior : (Behavior a -> Moment(b, Behavior a)) -> Moment b

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
    // The currently selected event is a behavior: at each time, it either
    // keeps the previous event or replaces it with the newly emitted one.
    const current = t => {
      if (t <= momentTime) return never;

      const selected = eventOfEvents(t - 1);
      if (selected !== nothing) return selected;
      return current(t - 1);
    };

    return t => current(t)(t);
  };
}

// stepper: initial value and an event stream -> Moment (Behavior a)
// Returns a function that, given a momentTime, yields the behavior function.
function stepper(init, event) {
  return function stepperAt(momentTime) {
    const current = t => {
      if (t <= momentTime) return init;

      const value = event(t - 1);
      return value !== nothing ? value : current(t - 1);
    };

    return current;
  };
}

// loopEvent: ties the returned event back into the event supplied to the
// builder. The feedback event must be sampled after the moment is built.
function loopEvent(build) {
  return function loopEventAt(momentTime) {
    let output;
    const input = t => output(t);
    const [b, event] = build(input)(momentTime);
    output = event;
    return b;
  };
}

// loopBehavior: ties the returned behavior back into the behavior supplied to
// the builder. The feedback behavior must be sampled after the moment is built.
function loopBehavior(build) {
  return function loopBehaviorAt(momentTime) {
    let output;
    const input = t => output(t);
    const [b, behavior] = build(input)(momentTime);
    output = behavior;
    return b;
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
  loopEvent,
  loopBehavior,
};
