/*
|--------------------------------------------------------------------------
| PREIS VON PRO
|--------------------------------------------------------------------------
|
| Datei: lib/pricing.ts
|
| Der Preis, der auf den Produktseiten (Pong Stats / Pong League) und in den
| strukturierten Daten für Google steht. Einmalige Zahlung, kein Abo.
|
| WICHTIG: Der Betrag muss zu PRO_PRICE_CENTS in
| app/api/stripe/checkout/route.ts passen (dort wird tatsächlich abgebucht).
| Ändert sich der Preis, hier UND dort anpassen. Wer will, kann die Checkout-
| Route auch direkt diesen Wert importieren lassen:
|
|   import { PRO_PRICE_CENTS } from "@/lib/pricing";
|
*/

export const PRO_PRICE_CENTS = 399;

export const PRO_CURRENCY = "EUR";

/* "3,99 €" bzw. "€3.99" */
export function formatProPrice(locale: "de" | "en"): string {
  const amount = PRO_PRICE_CENTS / 100;

  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-IE", {
    style: "currency",
    currency: PRO_CURRENCY,
  }).format(amount);
}

/* "3.99" für schema.org */
export function proPriceForSchema(): string {
  return (PRO_PRICE_CENTS / 100).toFixed(2);
}
