"use client";

import React, { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { useLanguage } from "@/context/LanguageContext";
import PostCard from "@/components/PostCard";
import type { PostCardPost } from "@/components/PostCard";
import { useToast } from "@/context/ToastContext";
import { 
  ArrowLeft, 
  Send,
  AlertTriangle,
  Image as ImageIcon,
  X,
  Loader2
} from "lucide-react";

interface TokenDetails {
  symbol: string;
  name: string;
  description: string;
  binanceUrl?: string;
  listedAt?: string;
  totalLossUsd: number;
  victimCount: number;
  postCount: number;
}

interface LossReport {
  id: string;
  amountUsd: number;
  entryPrice?: string;
  exitPrice?: string;
  createdAt: string;
  user: {
    address: string;
    username: string;
  };
}

type PageProps = {
  params: Promise<{ symbol: string }>;
};

export default function TokenForum({ params }: PageProps) {
  const { symbol } = use(params);
  const { user, login } = useWallet();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [token, setToken] = useState<TokenDetails | null>(null);
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTokenDetails = async () => {
    try {
      const res = await fetch(`/api/tokens/${symbol}`);
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchForumData = async () => {
    try {
      // Fetch posts for this token
      const postsRes = await fetch(`/api/posts?tokenSymbol=${symbol}`);

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts((postsData.posts || []).map((p: any) => ({
          ...p,
          likesCount: p.likesCount || 0,
          repliesCount: p.repliesCount || 0,
          replyToId: p.replyToId || null,
          isLiked: p.isLiked || false,
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenDetails();
    fetchForumData();
  }, [symbol]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setMediaUrl(data.url);
        setMediaType(data.mediaType);
      } else {
        const err = await res.json();
        toast(err.error || "Upload failed", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error uploading file", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newPostText.trim() && !mediaUrl) return;

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPostText,
          tokenSymbol: symbol,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newPost: PostCardPost = {
          ...data.post,
          likesCount: 0,
          repliesCount: 0,
          replyToId: null,
          isLiked: false,
        };
        setPosts([newPost, ...posts]);
        setNewPostText("");
        setMediaUrl("");
        setMediaType("");
      } else {
        const err = await res.json();
        toast(err.error || "Failed to post", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error posting", "error");
    }
  };

  if (isLoading && !token) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-text-muted">
        Loading...
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <AlertTriangle className="w-16 h-16 text-binance-red mx-auto" />
        <h2 className="text-2xl font-bold text-white">{t("tokenSpaceNotFound")}</h2>
        <p className="text-text-muted text-sm">{t("tokenSpaceNotFoundDesc")}</p>
        <Link href="/" className="inline-block px-6 py-2.5 bg-binance-yellow text-binance-dark font-bold rounded-lg text-sm transition-all">
          {t("backToGlobal")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Simple Header */}
      <div className="flex items-center space-x-4 border-b border-binance-border pb-3">
        <Link href="/" className="text-text-muted hover:text-white p-2 rounded-full hover:bg-binance-border/40 transition-all cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white uppercase">${token.symbol}</h1>
          <p className="text-xs text-text-muted">{token.name}</p>
        </div>
      </div>

      {/* Composer */}
      <div className="glass rounded-2xl p-4 border border-binance-border space-y-3">
        {user ? (
          <form onSubmit={handleCreatePost} className="space-y-3">
            <div className="flex space-x-3">
              <div className="w-10 h-10 rounded-full bg-binance-yellow/20 flex items-center justify-center font-bold text-binance-yellow uppercase text-sm border border-binance-yellow/30 shrink-0">
                {user.username.slice(0, 2)}
              </div>
              <div className="flex-1 space-y-3">
                <textarea
                  placeholder={`${t("writeWarning")} $${token.symbol}...`}
                  className="w-full bg-transparent border-0 text-sm focus:outline-none resize-none min-h-[80px] text-gray-200 placeholder-gray-500 pt-2"
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                />

                {/* Media Preview */}
                {mediaUrl && (
                  <div className="relative mt-2 rounded-xl overflow-hidden border border-binance-border group max-w-md bg-binance-dark/40">
                    {mediaType === "image" ? (
                      <img src={mediaUrl} alt="Upload preview" className="w-full max-h-60 object-cover" />
                    ) : (
                      <video src={mediaUrl} controls className="w-full max-h-60 object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => { setMediaUrl(""); setMediaType(""); }}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-binance-border/50 pt-3 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-binance-yellow hover:bg-binance-yellow/10 p-2 rounded-full transition-all cursor-pointer disabled:opacity-40"
                  title="Add Image or Video"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5" />
                  )}
                </button>
                <span className="text-[10px] text-text-muted uppercase">Tag: ${token.symbol}</span>
              </div>
              <button
                type="submit"
                disabled={isUploading || (!newPostText.trim() && !mediaUrl)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-binance-yellow hover:bg-binance-yellow/90 text-binance-dark font-bold rounded-lg text-xs transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t("sendToBoard")}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6">
            <p className="text-xs text-text-muted mb-3">{t("connectToPost")}</p>
            <button
              onClick={login}
              className="px-4 py-2 bg-binance-yellow text-binance-dark font-bold text-xs rounded-lg hover:bg-binance-yellow/90 transition-all cursor-pointer"
            >
              {t("connectWallet")}
            </button>
          </div>
        )}
      </div>

      {/* Token Posts */}
      {posts.length === 0 ? (
        <div className="glass rounded-2xl p-8 border border-binance-border text-center text-text-muted text-sm">
          {t("noSpecificDiscussions")}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={(deletedId) => {
                setPosts((prev) => prev.filter((p) => p.id !== deletedId));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
