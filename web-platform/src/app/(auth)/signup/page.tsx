"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import Input from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { api } from "@/lib/api";

export default function Signup() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e?: React.FormEvent) {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError("");
    setLoading(true);

    try {
      const user = await api.user.create(username.trim(), password);
      login({ id: String(user.id), name: user.username });
      router.push("/onboarding/personalize");
    } catch (err: any) {
      setError(err.message || "Signup failed. Username may already be taken.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-semibold">Create account</h2>
          <p className="text-sm text-muted-foreground">
            Create an account to save your preferences.
          </p>

          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className="text-sm block mb-1">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm block mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-between items-center mt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create account"}
              </Button>
              <Button variant="link" onClick={() => router.push("/login")}>
                Already have an account?
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
