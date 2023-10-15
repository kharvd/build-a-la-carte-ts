import { applicativeConst, makeConst } from "./const";
import { ApplicativeHKT } from "./control";
import { Apply, HKT } from "./hkt";
import { MonoidArray } from "./monoid";
import {
  monadState,
  State,
  gets,
  modify,
  execState,
  StateHKT,
  MonadStateHKT,
} from "./state";

export type Store<Info, Key, Value> = {
  getInfo(): Info;
  putInfo(i: Info): Store<Info, Key, Value>;
  getValue(k: Key): Value;
  putValue(k: Key, v: Value): Store<Info, Key, Value>;
};

type StoreConstructor<Info, Key, Value> = {
  initialize(info: Info, fetch: (k: Key) => Value): Store<Info, Key, Value>;
};

export class StoreImpl<Info, Key extends string, Value>
  implements Store<Info, Key, Value>
{
  constructor(private info: Info, private map: Record<Key, Value>) {}

  getInfo(): Info {
    return this.info;
  }

  putInfo(info: Info): Store<Info, Key, Value> {
    return new StoreImpl(info, this.map);
  }

  getValue(k: Key): Value {
    return this.map[k];
  }

  putValue(k: Key, v: Value): Store<Info, Key, Value> {
    return new StoreImpl(this.info, { ...this.map, [k]: v });
  }
}

export function initializeStoreImpl<Info, Key extends string, Value>(
  info: Info,
  map: Record<Key, Value>
): Store<Info, Key, Value> {
  return new StoreImpl(info, map);
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

export type Build<C extends HKT, Info, Key, Value> = (
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

export function dependencies<Key, Value>(
  task: Task<ApplicativeHKT, Key, Value>
): Key[] {
  const applicative = applicativeConst<Key[]>(new MonoidArray());
  return task.runTask(applicative, (k: Key) => makeConst([k])).getConst;
}

export type Scheduler<C extends HKT, Info, InfoR, K, V> = (
  r: Rebuilder<C, InfoR, K, V>
) => Build<C, Info, K, V>;

export type Rebuilder<C extends HKT, InfoR, K, V> = (
  key: K,
  value: V,
  task: Task<C, K, V>
) => Task<MonadStateHKT<InfoR>, K, V>;
