import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

const PRO_PRICE_CENTS = 399;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("players")
    .select("is_pro")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.is_pro) {
    return NextResponse.json({ error: "Bereits Pro." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

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
                "Dauerhafter Zugriff auf deine Statistiken, Match-Historie und die Rangliste.",
            },
            unit_amount: PRO_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/spieler?pro=success`,
      cancel_url: `${origin}/spieler?pro=cancelled`,
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
