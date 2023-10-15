import { HKT, Apply } from "./hkt";

export interface Functor<F extends HKT> {
  fmap<T, U>(f: (t: T) => U, ft: Apply<F, T>): Apply<F, U>;
  _hkt?: F;
}

export interface Applicative<F extends HKT> extends Functor<F> {
  pure<T>(t: T): Apply<F, T>;
  apply<T, U>(fu: Apply<F, (t: T) => U>, ft: Apply<F, T>): Apply<F, U>;
  _hkt?: F;
}

export interface ApplicativeHKT extends HKT {
  new: (x: this["_1"]) => Applicative<typeof x>;
  _1: HKT;
}

export function liftA2<A, B, C, F extends HKT>(
  applicative: Applicative<F>,
  f: (a: A) => (b: B) => C
): (fa: Apply<F, A>) => (fb: Apply<F, B>) => Apply<F, C> {
  return (fa) => (fb) => applicative.apply(applicative.fmap(f, fa), fb);
}

export interface Monad<F extends HKT> extends Applicative<F> {
  flatMap<T, U>(ft: Apply<F, T>, f: (t: T) => Apply<F, U>): Apply<F, U>;
  _hkt?: F;
}

export interface MonadHKT extends HKT {
  new: (x: this["_1"]) => Monad<typeof x>;
  _1: HKT;
}

export function mapM_<F extends HKT, A, B>(
  monad: Monad<F>,
  f: (a: A) => Apply<F, B>,
  as: A[]
): Apply<F, void> {
  return as.reduce(
    (acc, a) => monad.flatMap(acc, () => f(a)),
    monad.pure(undefined)
  );
}
