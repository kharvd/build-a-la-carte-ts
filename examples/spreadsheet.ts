import { applicativeCompose } from "../compose";
import { applicativeConst, makeConst } from "../const";
import { applicativeFreeAp } from "../free";
import { MonadHKT } from "../control";
import { ApplicativeHKT } from "../control";
import { identityMonad } from "../identity";
import { MonoidArray } from "../monoid";
import { Store } from "../build";
import { initializeStoreImpl } from "../build";
import { Task } from "../build";
import { Tasks } from "../build";
import { busy } from "../build";

type CellKey = "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3";

const sprsh1: Tasks<ApplicativeHKT, CellKey, number> = (k: CellKey) => {
  if (k === "B1") {
    return {
      runTask: (applicative, fetch) =>
        applicative.apply(
          applicative.fmap((x) => (y) => x + y, fetch("A1")),
          fetch("A2")
        ),
    };
  }

  if (k === "B2") {
    return {
      runTask: (applicative, fetch) =>
        applicative.fmap((x) => x * 2, fetch("B1")),
    };
  }

  return null;
};

const store = initializeStoreImpl(undefined, (key: CellKey): number =>
  key === "A1" ? 10 : 20
);
const result = busy(sprsh1, "B2", store);
console.log(result.getValue("B1")); // 30
console.log(result.getValue("B2")); // 60

function compute<Info, Key, Value>(
  task: Task<MonadHKT, Key, Value>,
  store: Store<Info, Key, Value>
): Value {
  return task
    .runTask(identityMonad, (k: Key) => identityMonad.pure(store.getValue(k)))
    .runIdentity();
}

console.log(compute(sprsh1("B1")!, result));

// ======================================================================

function dependencies<Key, Value>(
  task: Task<ApplicativeHKT, Key, Value>
): Key[] {
  const applicative = applicativeConst<Key[]>(new MonoidArray());
  return task.runTask(applicative, (k: Key) => makeConst([k])).getConst;
}

console.log(dependencies(sprsh1("B1")!));

// ======================================================================

function busyDeps<Key, Value>(
  tasks: Tasks<ApplicativeHKT, Key, Value>,
  key: Key
): Store<void, Key, Value> {
  const apConst = applicativeConst<Key[]>(new MonoidArray());
  const ap = applicativeCompose(applicativeFreeAp, apConst);

  const fetch = (k: Key) => {
    const task = tasks(k);
    if (task === null) {
      return applicativeFreeAp.pure(makeConst([k]));
    }

    return task.runTask(ap, fetch);
  };

  return fetch(key);
}

console.dir(busyDeps(sprsh1, "B2"), { depth: null });

// ======================================================================

const sprsh2: Tasks<MonadHKT, CellKey, number> = (k: CellKey) => {
  if (k === "B1") {
    return {
      runTask: (monad, fetch) =>
        monad.flatMap(fetch("C1"), (c1) =>
          c1 === 1 ? fetch("B2") : fetch("A2")
        ),
    };
  }

  if (k === "B2") {
    return {
      runTask: (monad, fetch) =>
        monad.flatMap(fetch("C1"), (c1) =>
          c1 === 1 ? fetch("A1") : fetch("B1")
        ),
    };
  }

  return null;
};

const store2 = initializeStoreImpl(undefined, (key: CellKey): number =>
  key === "A1" ? 10 : key === "A2" ? 20 : 1
);

const result2 = busy(sprsh2, "B1", store2);
console.log(result2.getValue("B1")); // 10
console.log(result2.getValue("B2")); // 10

console.log(compute(sprsh2("B2")!, result2));

export {};
