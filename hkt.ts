type GenericFunction = (...x: never[]) => unknown;
export abstract class HKT {
  readonly _1: unknown;
  new: GenericFunction;
}
export type Assume<T, U> = T extends U ? T : U;
export type Apply<F extends HKT, _1> = ReturnType<
  (F & {
    readonly _1: _1;
  })["new"]
>;
