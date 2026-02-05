/**
 * MFA Challenge Page - Aura Pro
 * Phase 8B: Advanced Security (2FA Enforcement)
 * 
 * Shown after password login when user has MFA enabled.
 * Requires 6-digit TOTP code to complete authentication.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, 
  Loader2, 
  AlertCircle, 
  ArrowLeft,
  Smartphone
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Design Tokens (Editorial Dark)
const fontDisplay = "font-sans font-black uppercase leading-[0.85] tracking-[-0.04em]";
const fontMono = "font-mono text-xs uppercase tracking-[0.2em] font-medium";

export default function MFAChallengePage() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect') || '/admin';

  const checkMFARequirement = useCallback(async () => {
    try {
      // Get current session AAL
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aalError) throw aalError;
      
      // If already AAL2, redirect to destination
      if (aalData.currentLevel === 'aal2') {
        window.location.href = redirectTo;
        return;
      }

      // If AAL1 but next level is AAL2, we need MFA verification
      if (aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
        // Get the first TOTP factor
        const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
        
        if (factorError) throw factorError;
        
        const totpFactor = factors?.totp[0];
        if (totpFactor) {
          setFactorId(totpFactor.id);
        } else {
          // No MFA factor enrolled, redirect to admin
          window.location.href = redirectTo;
          return;
        }
      } else {
        // No MFA required, redirect
        window.location.href = redirectTo;
        return;
      }
    } catch (err) {
      console.error('MFA check error:', err);
      setError('Failed to verify authentication status');
    } finally {
      setChecking(false);
    }
  }, [redirectTo]);

  useEffect(() => {
    checkMFARequirement();
  }, [checkMFARequirement]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!factorId || code.length !== 6) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });
      
      if (challengeError) throw challengeError;
      
      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });
      
      if (verifyError) throw verifyError;
      
      // Success - redirect to destination
      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white antialiased selection:bg-[#7C3AED] selection:text-white flex items-center justify-center p-8">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#7C3AED]/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back Link */}
        <Link 
          href="/login" 
          className="inline-flex items-center gap-3 text-white/40 hover:text-white transition-colors group mb-12"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className={fontMono}>Back to Sign In</span>
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-[#7C3AED]" />
            <span className={fontMono} style={{ color: '#7C3AED' }}>Security Verification</span>
          </div>
          <h1 className={`${fontDisplay} text-4xl`}>Two-Factor Authentication</h1>
          <p className="text-white/40 mt-4 font-mono text-sm leading-relaxed">
            Enter the 6-digit code from your authenticator app to complete sign in.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-8">
          <div>
            <label className={`${fontMono} text-white/40 block mb-3`}>
              Verification Code
            </label>
            <div className="flex items-center gap-4">
              <Smartphone className="w-6 h-6 text-white/20" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="flex-1 h-16 px-6 bg-transparent border-[2px] border-white/10 focus:border-[#7C3AED] outline-none transition-all text-2xl font-mono text-center tracking-[0.5em] placeholder:text-white/10"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full h-14 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & Sign In'
            )}
          </button>
        </form>

        {/* Help Text */}
        <p className="text-white/30 text-xs font-mono mt-8 text-center">
          Open your authenticator app (Google Authenticator, Authy, etc.) and enter the current code.
        </p>
      </div>
    </main>
  );
}
