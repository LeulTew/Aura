/**
 * Security Settings Page - Aura Pro
 * Phase 8B: Advanced Security (2FA)
 * 
 * Enables TOTP-based two-factor authentication using Supabase MFA APIs.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Copy,
  Trash2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface MFAFactor {
  id: string;
  factor_type: string;
  friendly_name?: string;
  status: string;
  created_at: string;
}

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchFactors = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;
      
      // Combine verified and unverified factors
      const allFactors = [...(data?.totp || [])];
      setFactors(allFactors);
    } catch (err) {
      console.error('Failed to fetch MFA factors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFactors();
  }, [fetchFactors]);

  const handleEnroll = async () => {
    setEnrolling(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });
      
      if (error) throw error;
      
      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start enrollment');
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || verifyCode.length !== 6) return;
    
    setVerifying(true);
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
        code: verifyCode
      });
      
      if (verifyError) throw verifyError;
      
      setSuccess('Two-factor authentication enabled successfully!');
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setVerifyCode('');
      fetchFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenroll = async (id: string) => {
    if (!confirm('Are you sure you want to remove this authentication method?')) return;
    
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      
      if (error) throw error;
      
      setSuccess('Authentication method removed.');
      fetchFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove factor');
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setSuccess('Secret copied to clipboard!');
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  const cancelEnrollment = () => {
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerifyCode('');
    setError(null);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const hasVerifiedFactor = factors.some(f => f.status === 'verified');

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-2">Security Settings</h1>
      <p className="text-zinc-400 mb-8">Manage your account security and two-factor authentication.</p>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3 text-green-400">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* 2FA Status Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Two-Factor Authentication</h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            hasVerifiedFactor 
              ? 'bg-green-500/10 text-green-400' 
              : 'bg-zinc-700 text-zinc-400'
          }`}>
            {hasVerifiedFactor ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        <p className="text-zinc-400 text-sm mb-6">
          Add an extra layer of security to your account by requiring a verification code 
          from your authenticator app when signing in.
        </p>

        {/* Enrolled Factors */}
        {factors.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-zinc-300 mb-3 uppercase tracking-wider">
              Enrolled Devices
            </h3>
            <div className="space-y-3">
              {factors.map((factor) => (
                <div 
                  key={factor.id}
                  className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">
                        {factor.friendly_name || 'Authenticator App'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Added {new Date(factor.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnenroll(factor.id)}
                    className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR Code Enrollment */}
        {qrCode && secret ? (
          <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700">
            <h3 className="text-lg font-semibold text-white mb-4">Scan QR Code</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            
            {/* QR Code Display */}
            <div className="flex justify-center mb-6">
              <div 
                className="bg-white p-4 rounded-lg"
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
            </div>

            {/* Manual Entry */}
            <div className="mb-6">
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
                Or enter this code manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-zinc-900 px-4 py-3 rounded-lg text-sm font-mono text-purple-400 break-all">
                  {secret}
                </code>
                <button
                  onClick={copySecret}
                  className="p-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                  title="Copy"
                >
                  <Copy className="w-5 h-5 text-zinc-300" />
                </button>
              </div>
            </div>

            {/* Verification Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Enter 6-digit code from your app:
              </label>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-2xl font-mono text-center tracking-[0.5em] text-white focus:border-purple-500 outline-none"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleVerify}
                disabled={verifying || verifyCode.length !== 6}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify & Enable
              </button>
              <button
                onClick={cancelEnrollment}
                className="px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {enrolling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Smartphone className="w-5 h-5" />
                Set up Two-Factor Authentication
              </>
            )}
          </button>
        )}
      </div>

      {/* Security Tips */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-zinc-300 mb-4 uppercase tracking-wider">
          Security Recommendations
        </h3>
        <ul className="space-y-3 text-sm text-zinc-400">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            Use a strong, unique password for your account
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            Enable two-factor authentication for added security
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            Save your backup codes in a secure location
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            Review active sessions regularly
          </li>
        </ul>
      </div>
    </div>
  );
}
