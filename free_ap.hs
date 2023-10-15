{-# OPTIONS_GHC -Wno-unrecognised-pragmas #-}

{-# HLINT ignore "Eta reduce" #-}
import Control.Applicative (Applicative (liftA2), Const (Const))

data FreeAp a = Pure a | forall b c. LiftA2 (b -> c -> a) (FreeAp b) (FreeAp c)

instance Functor FreeAp where
  fmap f (Pure a) = Pure (f a)
  fmap f (LiftA2 g x y) = LiftA2 (\b c -> f (g b c)) x y

instance Applicative FreeAp where
  pure = Pure

  --   f <*> x = LiftA2 (\f x -> f x) f x
  f <*> x = LiftA2 id f x

instance Applicative f => Applicative (Const (f a))

--   liftA2 = LiftA2

-- (<*>) :: FreeAp (a -> b) -> FreeAp a -> FreeAp b
-- f (<*>) x = LiftA2 id f x