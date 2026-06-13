"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, SignupInput } from "@/lib/validators";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const { signup, error, clearError } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => { clearError(); }, [clearError]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupInput) => {
    setLoading(true);
    clearError();
    try {
      await signup(data.name, data.email, data.password, data.phone);
    } catch {
      // Error handled in store
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
        <CardTitle className="text-xl">Create Account</CardTitle>
        <CardDescription>Set up your dairy ledger account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Your full name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input id="signup-email" type="email" placeholder="you@example.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input id="phone" placeholder="+91 98765 43210" {...register("phone")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input id="signup-password" type="password" placeholder="Min 6 characters" {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" type="password" placeholder="Repeat password" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          {error && (
            <div className="error-alert" role="alert" aria-live="assertive">
              <AlertCircle className="w-4 h-4 error-alert-icon" />
              <div>
                <p className="error-alert-title">Account Creation Failed</p>
                <p className="error-alert-desc">
                  {error.includes("Internal server error")
                    ? "Something went wrong on the server. Please try again in a moment."
                    : error.includes("already exists") || error.includes("409")
                    ? "An account with this email already exists. Try signing in instead."
                    : error}
                </p>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Your Account
          </Button>

          <div className="text-center">
            <button type="button" onClick={() => { clearError(); onSwitchToLogin(); }} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              Already have an account? <span className="font-semibold text-emerald-700">Sign in</span>
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
