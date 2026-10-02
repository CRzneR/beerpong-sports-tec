import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Webhooks brauchen den UNVERÄNDERTEN Rohtext des Requests für die
 * Signaturprüfung - deshalb request.text() statt request.json().
 */

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET fehlt.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe-Webhook-Signatur ungültig:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? session.metadata?.user_id;

    if (!userId) {
      console.error("Webhook ohne user_id erhalten, Session:", session.id);
      return NextResponse.json({ received: true });
    }

    const supabase = createAdminClient();

    const { error: updateError } = await supabase
      .from("players")
      .update({ is_pro: true })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Fehler beim Freischalten von Pro:", updateError);
    }

    const { error: insertError } = await supabase.from("purchases").insert({
      user_id: userId,
      stripe_session_id: session.id,
      amount_total: session.amount_total ?? 0,
      currency: session.currency ?? "eur",
    });

    if (insertError) {
      console.error("Fehler beim Speichern des Kaufs:", insertError);
    }
  }

  return NextResponse.json({ received: true });
}
