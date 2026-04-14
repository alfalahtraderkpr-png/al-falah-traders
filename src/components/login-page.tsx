'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, Lock, User, Building2, Shield, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [needsSeed, setNeedsSeed] = useState(false);

  // Typing animation for subtitle
  const [typedText, setTypedText] = useState('');
  const subtitleText = 'Distribution Management System';
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= subtitleText.length) {
        setTypedText(subtitleText.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed');
      if (res.ok) {
        const data = await res.json();
        toast.success('Database initialized successfully!', {
          description: `Created ${data.orderBookers?.length || 0} order bookers and ${data.companies?.length || 0} companies`,
        });
        setNeedsSeed(false);
      } else {
        toast.error('Failed to initialize database');
      }
    } catch {
      toast.error('Failed to connect to server');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }
    setIsLoggingIn(true);
    try {
      const success = await login(username, password);
      if (!success) {
        toast.error('Invalid username or password');
      }
    } catch {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 p-4 relative overflow-hidden">
      {/* Islamic geometric pattern overlay */}
      <div className="absolute inset-0 islamic-pattern pointer-events-none" />

      {/* Decorative floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-300/20 dark:bg-emerald-700/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-200/25 dark:bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/5 w-64 h-64 bg-teal-200/15 dark:bg-teal-800/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-emerald-400/40 rounded-full animate-gentle-pulse" />
        <div className="absolute top-3/4 right-1/3 w-3 h-3 bg-emerald-500/30 rounded-full animate-gentle-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-teal-400/30 rounded-full animate-gentle-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-emerald-300/25 rounded-full animate-gentle-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Logo and Title */}
        <div className="text-center space-y-4 animate-fade-in-up">
          {/* Company logo area */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-2xl shadow-emerald-300/40 dark:shadow-emerald-900/40 ring-4 ring-white/50 dark:ring-emerald-800/30 logo-shimmer">
            <Building2 className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-emerald-900 dark:text-emerald-100 tracking-tight">
              Al-Falah Traders
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{typedText}<span className="typing-cursor" /></p>
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Field Force Automation Platform</p>
          </div>
        </div>

        {/* Seed Button */}
        {needsSeed && (
          <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30 animate-fade-in-up stagger-1 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                  <Database className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Database Not Initialized</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">Click below to set up sample data</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="bg-amber-600 hover:bg-amber-700 btn-glow"
                >
                  {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Initialize'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Login Form */}
        <Card className="shadow-2xl shadow-emerald-200/40 dark:shadow-emerald-900/30 animate-fade-in-up stagger-2 glass-dialog">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              Sign In
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-medium">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11 bg-white/60 dark:bg-black/20 border-emerald-200/50 dark:border-emerald-800/50 focus:border-emerald-400 input-focus-glow"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-white/60 dark:bg-black/20 border-emerald-200/50 dark:border-emerald-800/50 focus:border-emerald-400 input-focus-glow"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-700 hover:via-emerald-600 hover:to-teal-600 h-11 shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/30 btn-glow btn-ripple font-semibold text-base"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-emerald-100 dark:border-emerald-800/50 text-center">
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {isSeeding ? (
                  <span className="flex items-center justify-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Initializing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <Database className="w-3 h-3" /> Initialize Database with Sample Data
                  </span>
                )}
              </button>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-800/50 text-center">
              <p className="text-[10px] text-muted-foreground">
                Default credentials: <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">admin</span> / <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">admin123</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground animate-fade-in-up stagger-3">
          Al-Falah Traders &copy; 2025 — Field Force Automation
        </p>
      </div>
    </div>
  );
}
