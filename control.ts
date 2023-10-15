import { HKT, Apply } from "./hkt";
import { Assume } from "./hkt";

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
  new: (x: Assume<this["_1"], HKT>) => Applicative<typeof x>;
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
  new: (x: Assume<this["_1"], HKT>) => Monad<typeof x>;
}
