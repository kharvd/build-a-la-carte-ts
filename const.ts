import { Apply, HKT } from "./hkt";
import { Applicative } from "./control";
import { Functor } from "./control";
import { Monoid } from "./monoid";

type _Const<A, B> = {
  getConst: A;
};

interface ConstHKT<A> extends HKT {
  new: (x: this["_1"]) => _Const<A, typeof x>;
}

export type Const<A, T> = Apply<ConstHKT<A>, T>;

export function makeConst<A, T>(a: A): Const<A, T> {
  return {
    getConst: a,
  };
}

class FunctorConst<A> implements Functor<ConstHKT<A>> {
  fmap<T, U>(f: (t: T) => U, ft: Const<A, T>): Const<A, U> {
    return {
      getConst: ft.getConst,
    };
  }
}

export function applicativeConst<A>(
  monoid: Monoid<A>
): Applicative<ConstHKT<A>> {
  return new (class
    extends FunctorConst<A>
    implements Applicative<ConstHKT<A>>
  {
    pure<T>(t: T): Const<A, T> {
      return {
        getConst: monoid.empty,
      };
    }
    apply<T, U>(fu: Const<A, (t: T) => U>, ft: Const<A, T>): Const<A, U> {
      return {
        getConst: monoid.concat(fu.getConst, ft.getConst),
      };
    }
  })();
}
