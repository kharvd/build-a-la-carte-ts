// 3.1

type Store<Info, Key, Value> = {
  getInfo(): Info;
  putInfo(i: Info): Store<Info, Key, Value>;
  getValue(k: Key): Value;
  putValue(k: Key, v: Value): Store<Info, Key, Value>;
};

type StoreConstructor<Info, Key, Value> = {
  initialize(info: Info, fetch: (k: Key) => Value): Store<Info, Key, Value>;
};

//#region StoreImpl
class StoreImpl<Info, Key, Value> implements Store<Info, Key, Value> {
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

function initializeStoreImpl<Info, Key, Value>(
  info: Info,
  fetch: (k: Key) => Value
): Store<Info, Key, Value> {
  return new StoreImpl(info, fetch);
}

//#endregion StoreImpl

type Build<Info, Key, Value> = (
  tasks: Tasks<Key, Value>,
  key: Key,
  store: Store<Info, Key, Value>
) => Store<Info, Key, Value>;

// 3.2
type Task<Key, Value> = {
  runTask: (fetch: (k: Key) => Value) => Value;
};

type Tasks<Key, Value> = (k: Key) => Task<Key, Value> | null;

type CellKey = "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3";

//#region sprsh1
const sprsh1: Tasks<CellKey, number> = (k: CellKey) => {
  console.log("Computing " + k);
  if (k === "B1") {
    return {
      runTask: (fetch: (k: CellKey) => number) => fetch("A1") + fetch("A2"),
    };
  }

  if (k === "B2") {
    return {
      runTask: (fetch: (k: CellKey) => number) => fetch("B1") * 2,
    };
  }

  return null;
};
//#endregion sprsh1

// 3.3
// busy<Key, Value> :: Build<void, Key, Value>
function busy<Key, Value>(
  tasks: Tasks<Key, Value>,
  key: Key,
  store: Store<unknown, Key, Value>
): Store<void, Key, Value> {
  let currStore = store;

  const fetch: (k: Key) => Value = (k: Key) => {
    const task = tasks(k);
    if (task === null) {
      return currStore.getValue(k);
    }

    const value = task.runTask(fetch);
    currStore = currStore.putValue(k, value);
    return value;
  };

  fetch(key);
  return currStore;
}

const store = initializeStoreImpl(null, (key: CellKey): number =>
  key === "A1" ? 10 : 20
);
const result = busy(sprsh1, "B2", store);
console.log(result.getValue("B1")); // 30
console.log(result.getValue("B2")); // 60

// 3.5
const sprsh2: Tasks<CellKey, number> = (k: CellKey) => {
  if (k === "B1") {
    return {
      runTask: (fetch: (k: CellKey) => number) => {
        const c1 = fetch("C1");
        if (c1 === 1) {
          return fetch("B2");
        } else {
          return fetch("A2");
        }
      },
    };
  }

  if (k === "B2") {
    return {
      runTask: (fetch: (k: CellKey) => number) => {
        const c1 = fetch("C1");
        if (c1 === 1) {
          return fetch("A1");
        } else {
          return fetch("B1");
        }
      },
    };
  }

  return null;
};

const store2 = initializeStoreImpl(null, (key: CellKey): number =>
  key === "A1" ? 10 : key === "A2" ? 20 : 1
);
const result2 = busy(sprsh2, "B1", store2);
console.log(result2.getValue("B1")); // 10
console.log(result2.getValue("B2")); // 10

// 3.6
function compute<Info, Key, Value>(
  task: Task<Key, Value>,
  store: Store<Info, Key, Value>
): Value {
  return task.runTask((k: Key) => store.getValue(k));
}

console.log(compute(sprsh2("B2")!, result2));

// 3.7
// hard to express without monads

export {};
