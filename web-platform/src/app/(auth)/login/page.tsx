"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { api } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!username.trim()) return;
    setError("");
    setLoading(true);

    try {
      // Find user by username from the DB
      const users = await api.user.getAll();
      const user = users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (!user) {
        setError("User not found. Try a username like alice, bob, or carol.");
        setLoading(false);
        return;
      }

      login({ id: String(user.id), name: user.username });
      router.push("/onboarding/personalize");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Continue"}
            </Button>
          </form>
          <div className="text-center">
            <Button variant="link" onClick={() => router.push("/signup")}>
              Create an account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
