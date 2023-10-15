export interface Monoid<A> {
  empty: A;
  concat(a1: A, a2: A): A;
}

export class MonoidArray<A> implements Monoid<A[]> {
  empty: A[] = [];
  concat(a1: A[], a2: A[]): A[] {
    return a1.concat(a2);
  }
}
