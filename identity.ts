import { HKT } from "./hkt";
import { Monad } from "./control";
import { Applicative } from "./control";
import { Functor } from "./control";

export type Identity<T> = {
  runIdentity(): T;
};

export interface IdentityHKT extends HKT {
  new: (x: this["_1"]) => Identity<typeof x>;
}

export class FunctorIdentity implements Functor<IdentityHKT> {
  fmap<T, U>(f: (t: T) => U, ft: Identity<T>): Identity<U> {
    return {
      runIdentity: () => f(ft.runIdentity()),
    };
  }
}

export class ApplicativeIdentity
  extends FunctorIdentity
  implements Applicative<IdentityHKT>
{
  pure<T>(t: T): Identity<T> {
    return {
      runIdentity: () => t,
    };
  }
  apply<T, U>(fu: Identity<(t: T) => U>, ft: Identity<T>): Identity<U> {
    return {
      runIdentity: () => fu.runIdentity()(ft.runIdentity()),
    };
  }
}

export class MonadIdentity
  extends ApplicativeIdentity
  implements Monad<IdentityHKT>
{
  flatMap<T, U>(ft: Identity<T>, f: (t: T) => Identity<U>): Identity<U> {
    return {
      runIdentity: () => f(ft.runIdentity()).runIdentity(),
    };
  }
}

export const identityMonad: Monad<IdentityHKT> = new MonadIdentity();
