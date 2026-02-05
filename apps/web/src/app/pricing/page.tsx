/**
 * Pricing Page - Aura Pro
 * Phase 8A: Commercialization
 * 
 * Displays subscription tiers with Stripe checkout integration.
 */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Building2, Sparkles } from 'lucide-react';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  priceId: string;
  popular?: boolean;
  icon: React.ReactNode;
}

const tiers: PricingTier[] = [
  {
    name: 'Free',
    price: 'Free',
    period: 'forever',
    description: 'Perfect for trying out Aura Pro',
    features: [
      '5 GB storage',
      'Up to 1,000 photos',
      'Basic face search',
      'Single user',
      'Community support',
    ],
    priceId: 'free',
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For growing photo studios',
    features: [
      '100 GB storage',
      'Unlimited photos',
      'Advanced AI search',
      'Up to 5 team members',
      'Priority support',
      'Desktop sync agent',
      'Custom branding',
    ],
    priceId: 'pro',
    popular: true,
    icon: <Zap className="w-6 h-6" />,
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    description: 'For large studios & franchises',
    features: [
      'Unlimited storage',
      'Unlimited photos',
      'On-premise AI option',
      'Unlimited team members',
      'Dedicated support',
      'Multi-location management',
      'SSO & advanced security',
      'SLA guarantee',
    ],
    priceId: 'enterprise',
    icon: <Building2 className="w-6 h-6" />,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    if (priceId === 'free') {
      // Free tier doesn't need checkout
      window.location.href = '/login';
      return;
    }

    setLoading(priceId);
    setError(null);

    try {
      // For demo, we'll use a placeholder org_id
      // In production, this would come from the authenticated user's session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          orgId: 'demo-org-id', // TODO: Replace with actual org_id from session
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Checkout error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <header className="py-8 px-4">
        <nav className="max-w-7xl mx-auto flex justify-between items-center">
          <a href="/" className="text-2xl font-bold text-white">
            Aura<span className="text-purple-500">Pro</span>
          </a>
          <a
            href="/login"
            className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
          >
            Sign In
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-24 px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold text-white mb-6"
        >
          Simple, Transparent Pricing
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-zinc-400 max-w-2xl mx-auto"
        >
          Choose the plan that fits your studio. Upgrade or downgrade anytime.
        </motion.p>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl p-8 ${
                tier.popular
                  ? 'bg-gradient-to-b from-purple-900/50 to-zinc-900 border-2 border-purple-500'
                  : 'bg-zinc-900/80 border border-zinc-800'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 text-white text-sm font-medium rounded-full">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                  {tier.icon}
                </div>
                <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
              </div>

              <div className="mb-4">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                <span className="text-zinc-500">{tier.period}</span>
              </div>

              <p className="text-zinc-400 mb-6">{tier.description}</p>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-zinc-300">
                    <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier.priceId)}
                disabled={loading === tier.priceId}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                  tier.popular
                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === tier.priceId
                  ? 'Loading...'
                  : tier.priceId === 'free'
                  ? 'Get Started'
                  : 'Subscribe'}
              </button>
            </motion.div>
          ))}
        </div>

        {error && (
          <div className="mt-8 text-center text-red-400">
            {error}
          </div>
        )}
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 pb-24">
        <h2 className="text-2xl font-bold text-white text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-2">
              Can I change plans later?
            </h3>
            <p className="text-zinc-400">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we&apos;ll prorate the difference.
            </p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-2">
              What payment methods do you accept?
            </h3>
            <p className="text-zinc-400">
              We accept all major credit cards including Visa, Mastercard, and American Express through our secure Stripe integration.
            </p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-2">
              Is there a free trial?
            </h3>
            <p className="text-zinc-400">
              Our Free tier is available indefinitely. For Pro and Enterprise, contact us for a custom trial period.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-zinc-500 text-sm">
          © 2026 Aura Pro. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
