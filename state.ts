import { Apply, Assume, HKT } from "./hkt";
import { Monad } from "./control";
import { Applicative } from "./control";
import { Functor } from "./control";
import { Identity, IdentityHKT, identityMonad } from "./identity";

// type _State<S, A> = {
//   runState: (s: S) => [A, S];
// };

// export interface StateHKT<S> extends HKT {
//   new: (x: this["_1"]) => _State<S, typeof x>;
// }

// export type State<S, T> = Apply<StateHKT<S>, T>;

// class FunctorStateImpl<S> implements Functor<StateHKT<S>> {
//   fmap<T, U>(f: (t: T) => U, ft: State<S, T>): State<S, U> {
//     return {
//       runState: (s: S) => {
//         const [t, s1] = ft.runState(s);
//         return [f(t), s1];
//       },
//     };
//   }
// }

// class ApplicativeStateImpl<S>
//   extends FunctorStateImpl<S>
//   implements Applicative<StateHKT<S>>
// {
//   pure<T>(t: T): State<S, T> {
//     return {
//       runState: (s: S) => [t, s],
//     };
//   }

//   apply<T, U>(fu: State<S, (t: T) => U>, ft: State<S, T>): State<S, U> {
//     return {
//       runState: (s: S) => {
//         const [f, s1] = fu.runState(s);
//         const [t, s2] = ft.runState(s1);
//         return [f(t), s2];
//       },
//     };
//   }
// }

// class MonadStateImpl<S>
//   extends ApplicativeStateImpl<S>
//   implements Monad<StateHKT<S>>
// {
//   flatMap<T, U>(ft: State<S, T>, f: (t: T) => State<S, U>): State<S, U> {
//     return {
//       runState: (s: S) => {
//         const [t, s1] = ft.runState(s);
//         return f(t).runState(s1);
//       },
//     };
//   }
//   _hkt?: StateHKT<S>;
// }

type StateT<S, F extends HKT, A> = {
  runState: (s: S) => Apply<F, [A, S]>;
};

export interface StateTHKT_1<S, F extends HKT> extends HKT {
  new: (x: this["_1"]) => StateT<S, F, typeof x>;
}

export interface StateTHKT<S> extends HKT {
  new: (x: Assume<this["_1"], HKT>) => StateTHKT_1<S, typeof x>;
}

class FunctorStateT<S, F extends HKT> implements Functor<StateTHKT_1<S, F>> {
  constructor(public monadF: Monad<F>) {}
  fmap<T, U>(f: (t: T) => U, ft: StateT<S, F, T>): StateT<S, F, U> {
    return {
      runState: (s: S) => {
        return this.monadF.fmap(([t, s1]) => [f(t), s1], ft.runState(s));
      },
    };
  }
}

export class ApplicativeStateT<S, F extends HKT>
  extends FunctorStateT<S, F>
  implements Applicative<StateTHKT_1<S, F>>
{
  constructor(monadF: Monad<F>) {
    super(monadF);
  }
  pure<T>(t: T): StateT<S, F, T> {
    return {
      runState: (s: S) => this.monadF.pure([t, s]),
    };
  }
  apply<T, U>(
    mf: StateT<S, F, (t: T) => U>,
    mx: StateT<S, F, T>
  ): StateT<S, F, U> {
    return {
      runState: (s: S) =>
        this.monadF.flatMap(mf.runState(s), ([f, s1]) =>
          this.monadF.flatMap(mx.runState(s1), ([x, s2]) =>
            this.monadF.pure([f(x), s2])
          )
        ),
    };
  }
}

export class MonadStateT<S, F extends HKT>
  extends ApplicativeStateT<S, F>
  implements Monad<StateTHKT_1<S, F>>
{
  constructor(monadF: Monad<F>) {
    super(monadF);
  }
  flatMap<T, U>(
    mx: StateT<S, F, T>,
    f: (t: T) => StateT<S, F, U>
  ): StateT<S, F, U> {
    return {
      runState: (s: S) =>
        this.monadF.flatMap(mx.runState(s), ([x, s1]) => f(x).runState(s1)),
    };
  }
}

export interface MonadState<S, F extends HKT> extends Monad<F> {
  get(): Apply<F, S>;
  put(s: S): Apply<F, void>;
  state<T>(f: (s: S) => [T, S]): Apply<F, T>;
}

export interface MonadStateHKT<S> extends HKT {
  new: (x: Assume<this["_1"], HKT>) => MonadState<S, typeof x>;
}

class MonadStateStateT<S, F extends HKT>
  extends MonadStateT<S, F>
  implements MonadState<S, StateTHKT_1<S, F>>
{
  constructor(public monadF: Monad<F>) {
    super(monadF);
  }

  get(): StateT<S, F, S> {
    return {
      runState: (s: S) => this.monadF.pure([s, s]),
    };
  }

  put(s: S): StateT<S, F, void> {
    return {
      runState: () => this.monadF.pure([undefined, s]),
    };
  }

  state<T>(f: (s: S) => [T, S]): StateT<S, F, T> {
    const monadStateT = new MonadStateT<S, F>(this.monadF);
    return monadStateT.flatMap(this.get(), (s) => {
      const [a, s1] = f(s);
      return monadStateT.flatMap(this.put(s1), () => monadStateT.pure(a));
    });
  }

  _hkt?: StateTHKT_1<S, F>;
}

export type StateHKT<S> = StateTHKT_1<S, IdentityHKT>;
export type State<S, T> = Apply<StateHKT<S>, T>;

export function gets<S, T>(f: (s: S) => T): State<S, T> {
  return new MonadStateStateT<S, IdentityHKT>(identityMonad).state((s) => [
    f(s),
    s,
  ]);
}

export function put<S>(s: S): State<S, void> {
  return new MonadStateStateT<S, IdentityHKT>(identityMonad).put(s);
}

export function modify<S>(f: (s: S) => S): State<S, void> {
  return new MonadStateStateT<S, IdentityHKT>(identityMonad).state((s) => [
    undefined,
    f(s),
  ]);
}

export function runState<S, T>(s: State<S, T>, init: S): [T, S] {
  return s.runState(init).runIdentity();
}

export function execState<S, T>(s: State<S, T>, init: S): S {
  return s.runState(init).runIdentity()[1];
}

export const monadState = <S>() =>
  new MonadStateStateT<S, IdentityHKT>(identityMonad);

// export const monadState = <T>() => new MonadStateImpl<T>();
