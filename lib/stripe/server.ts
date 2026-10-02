import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

/*
 * apiVersion wird bewusst NICHT fest angegeben - das SDK nutzt dann
 * automatisch die zur installierten Paketversion passende Stripe-API-
 * Version. Ein hart codiertes Datum würde bei einem späteren
 * `npm update` sonst leicht veralten.
 */

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
