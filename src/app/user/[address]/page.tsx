"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import PostCard from "@/components/PostCard";
import type { PostCardPost } from "@/components/PostCard";
import { 
  ArrowLeft, 
  Calendar, 
  TrendingDown, 
  MessageSquare,
  Copy,
  Check,
  AlertTriangle
} from "lucide-react";

type PageProps = {
  params: Promise<{ address: string }>;
};

interface ProfileUser {
  address: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  totalLossUsd: number;
  postCount: number;
}

export default function UserProfile({ params }: PageProps) {
  const { address } = use(params);
  const router = useRouter();
  const { user: currentUser } = useWallet();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchProfileData = async () => {
    try {
      const res = await fetch(`/api/users/${address}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setPosts(data.posts || []);
      } else {
        const err = await res.json();
        toast(err.error || "User not found", "error");
      }
    } catch (e) {
      console.error(e);
      toast("Error loading profile", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [address]);

  const handleCopyAddress = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-16">
        <div className="sticky top-0 z-10 bg-binance-dark/80 backdrop-blur-md border-b border-binance-border p-4 flex items-center space-x-4">
          <div className="w-8 h-8 rounded-full bg-binance-border animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-binance-border rounded w-1/4 animate-pulse" />
            <div className="h-3 bg-binance-border rounded w-1/6 animate-pulse" />
          </div>
        </div>
        <div className="h-40 bg-binance-border/30 w-full animate-pulse" />
        <div className="px-4 space-y-4 -mt-10">
          <div className="w-20 h-20 rounded-full bg-binance-border border-4 border-binance-dark animate-pulse" />
          <div className="h-5 bg-binance-border rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-binance-border rounded w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <AlertTriangle className="w-16 h-16 text-binance-red mx-auto" />
        <h2 className="text-2xl font-bold text-white">User Not Found</h2>
        <p className="text-text-muted text-sm">We couldn't find a user registered with address: {address}</p>
        <Link href="/" className="inline-block px-6 py-2.5 bg-binance-yellow text-binance-dark font-bold rounded-lg text-sm transition-all">
          {t("back")}
        </Link>
      </div>
    );
  }

  const joinDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  return (
    <div className="min-h-screen pb-16">
      {/* ═══ Sticky Header ═══ */}
      <div className="sticky top-0 z-10 bg-binance-dark/80 backdrop-blur-md border-b border-binance-border px-4 py-2 flex items-center space-x-6">
        <button 
          onClick={() => router.back()} 
          className="text-text-muted hover:text-white p-2 rounded-full hover:bg-binance-border/40 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">{profile.username}</h1>
          <p className="text-xs text-text-muted">{profile.postCount} {t("postBtn").toLowerCase()}s</p>
        </div>
      </div>

      {/* ═══ Profile Banner ═══ */}
      <div className="h-36 md:h-44 bg-gradient-to-r from-binance-border/50 to-binance-yellow/20 relative" />

      {/* ═══ Profile Info ═══ */}
      <div className="px-4 pb-4 border-b border-binance-border relative">
        {/* Avatar */}
        <div className="absolute -top-12 left-4 w-24 h-24 rounded-full bg-binance-yellow/10 border-4 border-binance-dark flex items-center justify-center font-bold text-binance-yellow uppercase text-2xl shrink-0 shadow-lg">
          {profile.username.slice(0, 2)}
        </div>

        {/* Edit profile placeholder or align-spacing */}
        <div className="h-14 flex justify-end items-center" />

        {/* Details */}
        <div className="space-y-3 mt-1">
          <div>
            <h2 className="text-xl font-extrabold text-white">{profile.username}</h2>
            <button 
              onClick={handleCopyAddress}
              className="flex items-center space-x-1.5 text-xs text-text-muted hover:text-binance-yellow transition-all mt-0.5"
            >
              <span className="font-mono">{profile.address}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-binance-green" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs text-text-muted">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Joined {joinDate}</span>
          </div>

          {/* User Metrics */}
          <div className="flex gap-4 pt-1.5 flex-wrap">
            <div className="glass px-4 py-2.5 rounded-xl border border-binance-border flex items-center space-x-2.5">
              <TrendingDown className="w-4 h-4 text-binance-red" />
              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold block leading-none">Registered Loss</span>
                <span className="text-sm font-extrabold text-binance-red leading-none mt-1 block">
                  -${profile.totalLossUsd.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="glass px-4 py-2.5 rounded-xl border border-binance-border flex items-center space-x-2.5">
              <MessageSquare className="w-4 h-4 text-binance-yellow" />
              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold block leading-none">Posts</span>
                <span className="text-sm font-bold text-gray-200 leading-none mt-1 block">
                  {profile.postCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Feed Tabs ═══ */}
      <div className="flex border-b border-binance-border">
        <button className="flex-1 py-3 text-sm font-bold text-center text-white border-b-2 border-binance-yellow">
          Posts
        </button>
      </div>

      {/* ═══ User Posts Feed ═══ */}
      {posts.length === 0 ? (
        <div className="p-10 text-center text-text-muted text-sm">
          No posts yet from this user.
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <div key={post.id} className="border-b border-binance-border">
              <PostCard 
                post={post} 
                onDelete={(deletedId) => {
                  setPosts((prev) => prev.filter((p) => p.id !== deletedId));
                  setProfile((prev) => prev ? { ...prev, postCount: Math.max(0, prev.postCount - 1) } : null);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
