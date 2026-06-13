"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dairySetupSchema, DairySetupInput } from "@/lib/validators";
import { useDairyStore } from "@/stores/dairy-store";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2 } from "lucide-react";

export function DairySetupWizard() {
  const { setupDairy } = useDairyStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DairySetupInput>({
    resolver: zodResolver(dairySetupSchema),
    defaultValues: {
      ownerName: user?.name || "",
    },
  });

  const onSubmit = async (data: DairySetupInput) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      await setupDairy({
        ...data,
        userId: user.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-2">
            <Building2 className="w-8 h-8 text-emerald-600" />
          </div>
          <CardTitle className="text-xl">Setup Your Dairy</CardTitle>
          <CardDescription>
            Tell us about your dairy to get started. You can change these later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Dairy Name *</Label>
              <Input id="name" placeholder="e.g., Sharma Dairy" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner Name *</Label>
              <Input id="ownerName" placeholder="e.g., Ramesh Sharma" {...register("ownerName")} />
              {errors.ownerName && <p className="text-xs text-destructive">{errors.ownerName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dairyAddress">Address</Label>
              <Input id="dairyAddress" placeholder="e.g., Main Road, Village Name" {...register("address")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dairyPhone">Phone</Label>
              <Input id="dairyPhone" placeholder="+91 98765 43210" {...register("phone")} />
            </div>

            {error && (
              <div className="error-alert text-sm">{error}</div>
            )}

            <Button type="submit" className="w-full btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Setup Dairy
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
