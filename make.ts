import {
  Build,
  Rebuilder,
  Store,
  Tasks,
  dependencies,
  initializeStoreImpl,
} from "./build";
import { ApplicativeHKT, mapM_ } from "./control";
import { Apply, HKT } from "./hkt";
import {
  MonadState,
  State,
  execState,
  gets,
  modify,
  monadState,
  runState,
} from "./state";

type Time = number;
type MakeInfo<K extends string> = {
  time: Time;
  modificationTime: Record<K, Time>;
};

// make : Build<ApplicativeHKT, MakeInfo<K>, K, V>
function make<K extends string, V>(
  tasks: Tasks<ApplicativeHKT, K, V>,
  key: K,
  store: Store<MakeInfo<K>, K, V>
): Store<MakeInfo<K>, K, V> {
  return topological(modTimeRebuilder<K, V>())(tasks, key, store);
}

function modTimeRebuilder<K extends string, V>(): Rebuilder<
  ApplicativeHKT,
  MakeInfo<K>,
  K,
  V
> {
  return (key, value, task) => ({
    runTask<F extends HKT>(
      monadState: MonadState<MakeInfo<K>, F>,
      fetch: (k: K) => Apply<F, V>
    ): Apply<F, V> {
      return monadState.flatMap(
        monadState.get(),
        ({ time: now, modificationTime }) => {
          const dirty =
            key in modificationTime
              ? dependencies(task).some(
                  (k) => (modificationTime[k] ?? -1) > modificationTime[key]
                )
              : true;
          if (!dirty) {
            console.log("Skipping " + key);
            return monadState.pure(value);
          } else {
            console.log("Computing " + key);
            return monadState.flatMap(
              monadState.put({
                time: now + 1,
                modificationTime: {
                  ...modificationTime,
                  [key]: now,
                },
              }),
              () => task.runTask(monadState, fetch)
            );
          }
        }
      );
    },
  });
}

// topological : Scheduler<ApplicativeHKT, Info, Info, K, V>
function topological<Info, K, V>(
  rebuilder: Rebuilder<ApplicativeHKT, Info, K, V>
): Build<ApplicativeHKT, Info, K, V> {
  return (tasks, target, store) => {
    const ms = monadState<Store<Info, K, V>>();
    const ms1 = monadState<Info>();

    const build = (k: K): State<Store<Info, K, V>, void> => {
      const task = tasks(k);
      if (task === null) {
        return ms.pure(undefined);
      }

      return ms.flatMap(ms.get(), (store) => {
        const value = store.getValue(k);
        const newTask = rebuilder(k, value, task);
        const fetch = (k: K): State<Info, V> => ms1.pure(store.getValue(k));
        return ms.flatMap(liftStore(newTask.runTask(ms1, fetch)), (newValue) =>
          modify((s) => s.putValue(k, newValue))
        );
      });
    };

    const dep = (k: K) => {
      const task = tasks(k);
      if (task === null) {
        return [];
      }
      return dependencies(task);
    };

    const order = topSort<K>(reachable(dep, target));

    return execState(mapM_(ms, build, order), store);
  };
}

type Graph<K> = {
  vertices: K[];
  edges: Map<K, K[]>;
};
function reachable<K>(deps: (k: K) => K[], from: K): Graph<K> {
  const vertices = [from];
  const edges = new Map<K, K[]>();
  const seen = new Set<K>(vertices);

  const visit = (k: K) => {
    const ks = deps(k);
    edges.set(k, ks);
    ks.forEach((k) => {
      if (!seen.has(k)) {
        seen.add(k);
        vertices.push(k);
        visit(k);
      }
    });
  };

  visit(from);
  return { vertices, edges };
}

function topSort<K>(graph: Graph<K>): K[] {
  const { vertices, edges } = graph;
  const sorted: K[] = [];
  const seen = new Set<K>();
  const visit = (k: K) => {
    if (seen.has(k)) {
      return;
    }
    seen.add(k);
    edges.get(k)?.forEach(visit);
    sorted.push(k);
  };
  vertices.forEach(visit);
  return sorted;
}

function liftStore<I, K, V, A>(state: State<I, A>): State<Store<I, K, V>, A> {
  const ms = monadState<Store<I, K, V>>();
  return ms.flatMap(
    gets((s) => runState(state, s.getInfo())),
    ([a, newInfo]) =>
      ms.flatMap(
        modify((s) => s.putInfo(newInfo)),
        () => ms.pure(a)
      )
  );
}

const sprsh1: Tasks<ApplicativeHKT, string, number> = (k: string) => {
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

const store = initializeStoreImpl(
  {
    time: 0,
    modificationTime: {},
  },
  {
    A1: 10,
    A2: 20,
  } as Record<string, number>
);
const newStore = make(sprsh1, "B2", store);
make(sprsh1, "B2", newStore);

const newStore2 = newStore
  .putInfo({
    time: newStore.getInfo().time + 1,
    modificationTime: {
      ...newStore.getInfo().modificationTime,
      B1: newStore.getInfo().time,
    },
  })
  .putValue("B1", 1080);

make(sprsh1, "B2", newStore2);
