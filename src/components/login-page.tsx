'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, Lock, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [needsSeed, setNeedsSeed] = useState(false);

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <Building2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-emerald-900">Al-Falah Traders</h1>
          <p className="text-muted-foreground">Distribution Management System</p>
        </div>

        {/* Seed Button */}
        {needsSeed && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">Database Not Initialized</p>
                  <p className="text-xs text-amber-700">Click below to set up sample data</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Initialize'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Login Form */}
        <Card className="shadow-xl shadow-emerald-100/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t text-center">
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors"
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
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Al-Falah Traders &copy; 2025 — Field Force Automation
        </p>
      </div>
    </div>
  );
}
