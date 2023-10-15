import { HKT } from "./hkt";
import { Applicative } from "./control";
import { Functor } from "./control";

type FreeAp<A> =
  | {
      kind: "pure";
      value: A;
    }
  | {
      kind: "ap";
      f: FreeAp<(a: any) => A>;
      x: FreeAp<any>;
    };

function pure<A>(value: A): FreeAp<A> {
  return {
    kind: "pure",
    value,
  };
}

function ap<A, B>(f: FreeAp<(a: A) => B>, x: FreeAp<A>): FreeAp<B> {
  return {
    kind: "ap",
    f,
    x,
  };
}

interface FreeApHKT extends HKT {
  new: (x: this["_1"]) => FreeAp<typeof x>;
}

class FunctorFreeAp implements Functor<FreeApHKT> {
  fmap<T, U>(f: (t: T) => U, ft: FreeAp<T>): FreeAp<U> {
    return ap(pure(f), ft);
  }
}

class ApplicativeFreeAp
  extends FunctorFreeAp
  implements Applicative<FreeApHKT>
{
  pure<T>(t: T): FreeAp<T> {
    return pure(t);
  }

  apply<T, U>(fu: FreeAp<(t: T) => U>, ft: FreeAp<T>): FreeAp<U> {
    return ap(fu, ft);
  }
}

export const applicativeFreeAp: Applicative<FreeApHKT> =
  new ApplicativeFreeAp();
