"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useToast } from "@/context/ToastContext";

interface User {
  address: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
}

interface WalletContextType {
  user: User | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setAddress(data.user.address);
      } else {
        setUser(null);
        setAddress(null);
      }
    } catch (err) {
      console.error("Failed to check auth session", err);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      toast("MetaMask is not installed. Please install MetaMask to login.", "error");
      return;
    }

    setIsConnecting(true);
    try {
      const ethereum = (window as any).ethereum;

      // 1. Request address
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const walletAddress = accounts[0];
      if (!walletAddress) throw new Error("No address found");

      // 2. Fetch challenge nonce from backend
      const nonceRes = await fetch("/api/auth/nonce");
      if (!nonceRes.ok) throw new Error("Failed to fetch login nonce");
      const { nonce } = await nonceRes.json();

      // 3. Sign the challenge message via MetaMask
      // We use personal_sign since it displays readable text to the user
      const signature = await ethereum.request({
        method: "personal_sign",
        params: [nonce, walletAddress],
      });

      // 4. Submit signature to verification backend
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress, signature }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData.error || "Login failed");
      }

      setUser(loginData.user);
      setAddress(loginData.user.address);
    } catch (err: any) {
      console.error(err);
      toast(err.message || "MetaMask authentication failed", "error");
    } finally {
      setIsConnecting(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setAddress(null);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        user,
        address,
        isConnected: !!user,
        isConnecting,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
