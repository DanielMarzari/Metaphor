'use client';

import { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) { setError('Invalid password'); return; }
      window.location.href = '/';
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, var(--background) 0%, var(--surface-2) 100%)' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-lg border p-8" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
              <Lock className="w-7 h-7" style={{ color: 'var(--primary)' }} />
            </div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>Metaphor</h1>
            <p style={{ color: 'var(--muted)' }}>Biblical Metaphor Research Tool</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password" disabled={loading} autoFocus
                className="w-full px-4 py-3 border rounded-lg bg-background disabled:opacity-50"
                style={{ borderColor: 'var(--border)' }} />
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--rejected) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--rejected) 30%, transparent)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--rejected)' }} />
                <p className="text-sm" style={{ color: 'var(--rejected)' }}>{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading || !password}
              className="w-full px-4 py-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--primary)' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
