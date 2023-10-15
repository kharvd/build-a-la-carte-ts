import { Apply, HKT } from "./hkt";
import { Monad } from "./control";
import { Applicative } from "./control";
import { Functor } from "./control";

type _State<S, A> = {
  runState: (s: S) => [A, S];
};

export interface StateHKT<S> extends HKT {
  new: (x: this["_1"]) => _State<S, typeof x>;
}

export type State<S, T> = Apply<StateHKT<S>, T>;

class FunctorState<S> implements Functor<StateHKT<S>> {
  fmap<T, U>(f: (t: T) => U, ft: State<S, T>): State<S, U> {
    return {
      runState: (s: S) => {
        const [t, s1] = ft.runState(s);
        return [f(t), s1];
      },
    };
  }
}

class ApplicativeState<S>
  extends FunctorState<S>
  implements Applicative<StateHKT<S>>
{
  pure<T>(t: T): State<S, T> {
    return {
      runState: (s: S) => [t, s],
    };
  }

  apply<T, U>(fu: State<S, (t: T) => U>, ft: State<S, T>): State<S, U> {
    return {
      runState: (s: S) => {
        const [f, s1] = fu.runState(s);
        const [t, s2] = ft.runState(s1);
        return [f(t), s2];
      },
    };
  }
}

export class MonadState<S>
  extends ApplicativeState<S>
  implements Monad<StateHKT<S>>
{
  flatMap<T, U>(ft: State<S, T>, f: (t: T) => State<S, U>): State<S, U> {
    return {
      runState: (s: S) => {
        const [t, s1] = ft.runState(s);
        return f(t).runState(s1);
      },
    };
  }
  _hkt?: StateHKT<S>;
}

export function get<S>(): State<S, S> {
  return {
    runState: (s: S) => [s, s],
  };
}

export function gets<S, T>(f: (s: S) => T): State<S, T> {
  return {
    runState: (s: S) => [f(s), s],
  };
}

export function put<S>(s: S): State<S, void> {
  return {
    runState: () => [undefined, s],
  };
}

export function modify<S>(f: (s: S) => S): State<S, void> {
  return {
    runState: (s: S) => [undefined, f(s)],
  };
}

export function runState<S, T>(s: State<S, T>, init: S): [T, S] {
  return s.runState(init);
}

export function execState<S, T>(s: State<S, T>, init: S): S {
  return s.runState(init)[1];
}

export const monadState = <T>() => new MonadState<T>();
