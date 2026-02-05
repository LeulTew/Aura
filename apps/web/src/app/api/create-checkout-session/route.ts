/**
 * Stripe Checkout Session API Route
 * POST /api/create-checkout-session
 * 
 * Creates a Stripe Checkout Session for subscription signup.
 * Requires: STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO/ENTERPRISE env vars.
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover', // stripe@20.3.0 compatible version
});

// Price IDs from Stripe Dashboard (replace with your actual IDs)
const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_ID_PRO || '',
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, orgId, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!priceId || !orgId) {
      return NextResponse.json(
        { error: 'Missing priceId or orgId' },
        { status: 400 }
      );
    }

    // Resolve internal price key to Stripe price ID
    const stripePriceId = PRICE_IDS[priceId] || priceId;

    if (!stripePriceId) {
      return NextResponse.json(
        { error: 'Invalid price tier' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      // Store org_id in metadata for webhook processing
      metadata: {
        org_id: orgId,
      },
      // After checkout, update org with stripe_customer_id
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/billing?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
