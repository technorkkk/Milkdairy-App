"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validators";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const { login, error, clearError } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => { clearError(); }, [clearError]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    clearError();
    try {
      await login(data.email, data.password);
    } catch {
      // Error is handled in store
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-2">
          <span className="text-white text-2xl font-bold">D</span>
        </div>
        <CardTitle className="text-xl">Dairy Ledger</CardTitle>
        <CardDescription>Sign in to manage your dairy business</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              {...register("password")}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="error-alert" role="alert" aria-live="assertive">
              <AlertCircle className="w-4 h-4 error-alert-icon" />
              <div>
                <p className="error-alert-title">Sign In Failed</p>
                <p className="error-alert-desc">
                  {error.includes("Invalid") ? "The email or password you entered is incorrect. Please try again." : error}
                </p>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sign In to Your Account
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { clearError(); onSwitchToSignup(); }}
              className="text-sm text-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Don&apos;t have an account? <span className="font-semibold text-emerald-700">Sign up</span>
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
