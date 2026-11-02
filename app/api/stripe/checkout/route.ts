import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

/*
 * PREIS HIER ANPASSEN (in Cent). 499 = 4,99 €.
 */

const PRO_PRICE_CENTS = 499;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  /*
   * Wer schon Pro hat, muss nicht nochmal bezahlen können.
   */

  const { data: profile } = await supabase
    .from("players")
    .select("is_pro")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.is_pro) {
    return NextResponse.json({ error: "Bereits Pro." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  /*
   * Optional: Rückkehr zu einem Pong-League-Turnier (Pro-Hinweis in der K.-o.-Phase).
   * Nur Pfade der Form /turniere/<id> sind erlaubt, alles andere führt wie bisher
   * zur Profilseite (kein Open Redirect).
   */

  let returnTo: string | null = null;

  try {
    const body = (await request.json()) as { returnTo?: unknown };

    if (
      typeof body.returnTo === "string" &&
      /^\/turniere\/[A-Za-z0-9-]{1,64}$/.test(body.returnTo)
    ) {
      returnTo = body.returnTo;
    }
  } catch {
    /* Kein oder kein gültiger Body: Standard-Rückkehr zur Profilseite. */
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Pong Stats Pro",
              description:
                "Dauerhafter Zugriff auf deine Statistiken, Match-Historie, die Rangliste und die K.-o.-Phase in Pong League.",
            },
            unit_amount: PRO_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      success_url: returnTo ? `${origin}${returnTo}?pro=success` : `${origin}/spieler?pro=success`,
      cancel_url: returnTo
        ? `${origin}${returnTo}?pro=cancelled`
        : `${origin}/spieler?pro=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout konnte nicht erstellt werden." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Fehler beim Erstellen der Stripe-Checkout-Session:", err);
    return NextResponse.json({ error: "Checkout konnte nicht erstellt werden." }, { status: 500 });
  }
}
