import { ApplicativeHKT } from "./control";
import { Apply, HKT } from "./hkt";
import { monadState, State, gets, modify, execState } from "./state";

export type Store<Info, Key, Value> = {
  getInfo(): Info;
  putInfo(i: Info): Store<Info, Key, Value>;
  getValue(k: Key): Value;
  putValue(k: Key, v: Value): Store<Info, Key, Value>;
};

type StoreConstructor<Info, Key, Value> = {
  initialize(info: Info, fetch: (k: Key) => Value): Store<Info, Key, Value>;
};

export class StoreImpl<Info, Key, Value> implements Store<Info, Key, Value> {
  constructor(private info: Info, private fetch: (k: Key) => Value) {}

  getInfo(): Info {
    return this.info;
  }

  putInfo(info: Info): Store<Info, Key, Value> {
    return new StoreImpl(info, this.fetch);
  }

  getValue(k: Key): Value {
    return this.fetch(k);
  }

  putValue(k: Key, v: Value): Store<Info, Key, Value> {
    return new StoreImpl(this.info, (key: Key) =>
      key === k ? v : this.fetch(key)
    );
  }
}

export function initializeStoreImpl<Info, Key, Value>(
  info: Info,
  fetch: (k: Key) => Value
): Store<Info, Key, Value> {
  return new StoreImpl(info, fetch);
}

export type Task<C extends HKT, Key, Value> = {
  runTask<F extends HKT>(
    monad: Apply<C, F>,
    fetch: (k: Key) => Apply<F, Value>
  ): Apply<F, Value>;
};

export type Tasks<C extends HKT, Key, Value> = (
  k: Key
) => Task<C, Key, Value> | null;

type Build<C extends HKT, Info, Key, Value> = (
  tasks: Tasks<C, Key, Value>,
  key: Key,
  store: Store<Info, Key, Value>
) => Store<Info, Key, Value>;

// busy: Build<ApplicativeHKT, void, Key, Value>

export function busy<Key, Value>(
  tasks: Tasks<ApplicativeHKT, Key, Value>,
  key: Key,
  store: Store<void, Key, Value>
): Store<void, Key, Value> {
  type S = Store<void, Key, Value>;
  const mState = monadState<S>();
  const fetch = (k: Key): State<S, Value> => {
    const task = tasks(k);
    if (task === null) {
      return gets((s) => s.getValue(k));
    }

    const runTask = task.runTask(mState, fetch);

    return mState.flatMap(runTask, (v) =>
      mState.flatMap(
        modify((s) => s.putValue(k, v)),
        () => mState.pure(v)
      )
    );
  };

  return execState(fetch(key), store);
}
