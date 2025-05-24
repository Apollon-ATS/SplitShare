"use client"

import { useAuth } from "@/context/auth-context"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HeaderWithWallet } from "@/components/header-with-wallet"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { useWallet } from "@/context/wallet-context"

export default function ProfilePage() {
  const { user, isLoading, updateUserProfile } = useAuth();
  const { connected, publicKey, connectWallet } = useWallet();
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">You must be logged in to view your profile.</div>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    if (!username.trim()) {
      setError("Username is required");
      setSaving(false);
      return;
    }
    if (!connected || !publicKey) {
      setError("You must connect your Phantom wallet to update your wallet address.");
      setSaving(false);
      return;
    }
    const ok = await updateUserProfile(username, user.email || undefined);
    let walletOk = true;
    if (user.walletAddress !== publicKey) {
      try {
        const supabase = (await import("@/lib/supabase")).createClientComponentClient();
        const { error: walletError } = await supabase
          .from("users")
          .update({ wallet_address: publicKey })
          .eq("id", user.id);
        if (walletError) {
          setError("Error updating wallet address");
          setSaving(false);
          return;
        }
      } catch (err) {
        setError("Error updating wallet address");
        setSaving(false);
        return;
      }
    }
    if (ok || walletOk) {
      setSuccess("Profile updated successfully");
      setEditMode(false);
    } else {
      setError("Error updating profile");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-tr from-primary/10 via-white to-accent/10">
      <HeaderWithWallet />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md rounded-2xl shadow-xl border border-gray-100 bg-white/95">
          <CardHeader className="flex flex-col items-center gap-2 pb-2">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-primary/30 mb-2">
              <Image
                src={user.avatarUrl || "/images/ats-logo.png"}
                alt="Profile picture"
                fill
                className="object-cover"
                priority
              />
            </div>
            <CardTitle className="text-2xl font-bold ats-accent">{user.username || "No username"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              <form className="flex flex-col gap-4" onSubmit={handleSave}>
                <div>
                  <label className="font-semibold text-gray-700">Username:</label>
                  <Input
                    className="mt-1"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Wallet address:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={connected && publicKey ? publicKey : "Not connected"}
                      readOnly
                      className="flex-1"
                    />
                    <WalletConnectButton />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">You must connect your Phantom wallet to update your wallet address. Manual entry is disabled.</p>
                </div>
                {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                {success && <div className="text-green-600 text-sm text-center">{success}</div>}
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="bg-primary text-white hover:bg-primary/90 w-full" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => { setEditMode(false); setError(""); setSuccess(""); setUsername(user.username || ""); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <div>
                    <span className="font-semibold text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-900">{user.email || "-"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Wallet address:</span>
                    <span className="ml-2 text-gray-900 break-all">{user.walletAddress || <span className="italic text-gray-400">Not linked</span>}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">User ID:</span>
                    <span className="ml-2 text-gray-900 break-all">{user.id}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Created at:</span>
                    <span className="ml-2 text-gray-900">{user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Updated at:</span>
                    <span className="ml-2 text-gray-900">{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "-"}</span>
                  </div>
                </div>
                <div className="pt-4 flex justify-center">
                  <Button className="bg-primary text-white hover:bg-primary/90 w-full max-w-xs" onClick={() => setEditMode(true)}>
                    Edit profile
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 