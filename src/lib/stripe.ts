import Stripe from "stripe";

// Single shared Stripe client, test-mode keys until we're ready to go live.
// Server-only — never import this from a client component.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
