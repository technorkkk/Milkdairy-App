"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dairySetupSchema } from "@/lib/validators";
import { useAuthStore } from "@/stores/auth-store";
import { useDairyStore } from "@/stores/dairy-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Settings as SettingsIcon, Building2, User, LogOut, Trash2 } from "lucide-react";

export function SettingsView() {
  const { user, logout } = useAuthStore();
  const { dairy, updateDairy } = useDairyStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(dairySetupSchema),
    defaultValues: {
      name: dairy?.name || "",
      address: dairy?.address || "",
      phone: dairy?.phone || "",
      ownerName: dairy?.ownerName || "",
    },
  });

  const onSaveDairy = async (data: any) => {
    if (!dairy) return;
    setSaving(true);
    try {
      await updateDairy({ id: dairy.id, ...data });
      toast.success("Dairy details updated");
      setEditing(false);
    } catch (error) {
      toast.error("Failed to update dairy details");
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = () => {
    localStorage.clear();
    toast.success("Local data cleared. Refresh the page.");
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-foreground/60">Name</span>
            <span className="font-medium">{user?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/60">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          {user?.phone && (
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Phone</span>
              <span className="font-medium">{user.phone}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dairy Info */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Dairy Details
            </CardTitle>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {editing ? (
            <form onSubmit={handleSubmit(onSaveDairy)} className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Dairy Name</Label>
                <Input {...register("name")} className="text-sm" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Owner Name</Label>
                <Input {...register("ownerName")} className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Address</Label>
                <Input {...register("address")} className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Phone</Label>
                <Input {...register("phone")} className="text-sm" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex-1" size="sm">
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/60">Name</span>
                <span className="font-medium">{dairy?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Owner</span>
                <span className="font-medium">{dairy?.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Address</span>
                <span className="font-medium">{dairy?.address || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Phone</span>
                <span className="font-medium">{dairy?.phone || "—"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-destructive">Danger Zone</CardTitle>
          <CardDescription className="text-xs">These actions are irreversible</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full text-amber-600 border-amber-300 hover:bg-amber-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Local Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Local Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear all locally cached data. You will need to reload data from the server. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData}>Clear Data</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <div className="text-center py-4">
        <p className="text-xs text-foreground/60">Dairy Ledger v1.0.0</p>
        <p className="text-xs text-foreground/60">Offline-first milk delivery management</p>
      </div>
    </div>
  );
}
