import { Apply, HKT } from "./hkt";
import { liftA2 } from "./control";
import { Applicative } from "./control";
import { Functor } from "./control";

type Compose<F extends HKT, G extends HKT, T> = Apply<F, Apply<G, T>>;

interface ComposeHKT<F extends HKT, G extends HKT> extends HKT {
  new: (x: this["_1"]) => Compose<F, G, typeof x>;
}

class FunctorCompose<F extends HKT, G extends HKT>
  implements Functor<ComposeHKT<F, G>>
{
  constructor(private functorF: Functor<F>, private functorG: Functor<G>) {}

  fmap<T, U>(f: (t: T) => U, ft: Compose<F, G, T>): Compose<F, G, U> {
    return this.functorF.fmap((g: Apply<G, T>) => this.functorG.fmap(f, g), ft);
  }
}

class ApplicativeCompose<F extends HKT, G extends HKT>
  extends FunctorCompose<F, G>
  implements Applicative<ComposeHKT<F, G>>
{
  constructor(
    private applicativeF: Applicative<F>,
    private applicativeG: Applicative<G>
  ) {
    super(applicativeF, applicativeG);
  }

  pure<T>(t: T): Compose<F, G, T> {
    return this.applicativeF.pure(this.applicativeG.pure(t));
  }

  apply<T, U>(
    fu: Compose<F, G, (t: T) => U>,
    ft: Compose<F, G, T>
  ): Compose<F, G, U> {
    return liftA2(
      this.applicativeF,
      (g: Apply<G, T>) => (f: Apply<F, T>) => this.applicativeG.apply(g, f)
    )(fu)(ft);
  }
}

export function applicativeCompose<F extends HKT, G extends HKT>(
  applicativeF: Applicative<F>,
  applicativeG: Applicative<G>
): Applicative<ComposeHKT<F, G>> {
  return new ApplicativeCompose(applicativeF, applicativeG);
}
