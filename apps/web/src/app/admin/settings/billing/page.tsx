/**
 * Billing Settings Page - Aura Pro
 * Phase 8A: Commercialization
 * 
 * Displays subscription status, plan details, and Stripe Customer Portal link.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Calendar,
  Building2
} from 'lucide-react';

interface SubscriptionInfo {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  storageUsed: number;
  storageLimit: number;
}

export default function BillingSettingsPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      // TODO: Replace with actual API call to backend
      // For now, mock data that would come from organizations table
      const mockData: SubscriptionInfo = {
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        storageUsed: 45.2,
        storageLimit: 100,
      };
      
      setSubscription(mockData);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      // TODO: Call API to get Stripe Customer Portal link
      // const response = await fetch('/api/create-portal-session', { method: 'POST' });
      // const { url } = await response.json();
      // window.location.href = url;
      
      // For now, redirect to pricing page
      window.location.href = '/pricing';
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'text-green-400 bg-green-400/10';
      case 'past_due':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'canceled':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-zinc-400 bg-zinc-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return <CheckCircle className="w-5 h-5" />;
      case 'past_due':
      case 'canceled':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlanDisplay = (plan: string) => {
    const planMap: Record<string, { name: string; color: string }> = {
      free: { name: 'Free', color: 'text-zinc-400' },
      pro: { name: 'Pro', color: 'text-purple-400' },
      enterprise: { name: 'Enterprise', color: 'text-amber-400' },
    };
    return planMap[plan] || { name: plan, color: 'text-zinc-400' };
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  const planInfo = subscription ? getPlanDisplay(subscription.plan) : null;
  const storagePercent = subscription 
    ? Math.round((subscription.storageUsed / subscription.storageLimit) * 100)
    : 0;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-2">Billing & Subscription</h1>
      <p className="text-zinc-400 mb-8">Manage your subscription and payment details.</p>

      {/* Current Plan Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Current Plan</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${planInfo?.color}`}>
                {planInfo?.name}
              </span>
              {subscription && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${getStatusColor(subscription.status)}`}>
                  {getStatusIcon(subscription.status)}
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            {portalLoading ? 'Loading...' : 'Manage Subscription'}
          </button>
        </div>

        {/* Billing Period */}
        {subscription?.currentPeriodEnd && (
          <div className="flex items-center gap-2 text-zinc-400 mb-4">
            <Calendar className="w-4 h-4" />
            <span>Next billing date: {formatDate(subscription.currentPeriodEnd)}</span>
          </div>
        )}

        {/* Storage Usage */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">Storage Used</span>
            <span className="text-white font-medium">
              {subscription?.storageUsed.toFixed(1)} GB / {subscription?.storageLimit} GB
            </span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                storagePercent > 90 ? 'bg-red-500' : 
                storagePercent > 75 ? 'bg-yellow-500' : 
                'bg-purple-500'
              }`}
              style={{ width: `${Math.min(storagePercent, 100)}%` }}
            />
          </div>
          {storagePercent > 90 && (
            <p className="text-yellow-400 text-sm mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              You&apos;re running low on storage. Consider upgrading your plan.
            </p>
          )}
        </div>
      </div>

      {/* Plan Features */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Plan Features</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 text-zinc-300">
            <CheckCircle className="w-5 h-5 text-green-400" />
            {subscription?.storageLimit} GB storage
          </div>
          <div className="flex items-center gap-3 text-zinc-300">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Unlimited photos
          </div>
          <div className="flex items-center gap-3 text-zinc-300">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Advanced AI search
          </div>
          <div className="flex items-center gap-3 text-zinc-300">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Desktop sync agent
          </div>
        </div>
      </div>

      {/* Payment History Link */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Payment History</h3>
        <p className="text-zinc-400 mb-4">
          View invoices and payment history in the Stripe Customer Portal.
        </p>
        <button
          onClick={handleManageSubscription}
          className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
        >
          View Payment History
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
