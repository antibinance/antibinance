"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { useLanguage } from "@/context/LanguageContext";
import PostCard from "@/components/PostCard";
import type { PostCardPost } from "@/components/PostCard";
import { useToast } from "@/context/ToastContext";
import { 
  Image as ImageIcon,
  Send,
  Coins,
  ExternalLink,
  TrendingUp,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";

interface Token {
  symbol: string;
  name: string;
  description: string;
  binanceUrl?: string;
  listedAt?: string;
  totalLossUsd: number;
  victimCount: number;
  postCount: number;
}

export default function Home() {
  const { user, login } = useWallet();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [postTokenSymbol, setPostTokenSymbol] = useState("");
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "tokens">("all");

  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTokens = async () => {
    try {
      const res = await fetch("/api/tokens");
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts((data.posts || []).map((p: any) => ({
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
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchTokens();
    fetchPosts();
  }, []);

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
    if (!user) {
      toast(t("connectToPost"), "warning");
      return;
    }
    if (!newPostText.trim() && !mediaUrl) return;

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPostText,
          tokenSymbol: postTokenSymbol || null,
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
        setPostTokenSymbol("");
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

  return (
    <div className="min-h-screen">
      {/* ═══ Sticky Header with Tabs ═══ */}
      <div className="sticky top-0 z-10 bg-binance-dark/80 backdrop-blur-md border-b border-binance-border">
        <div className="px-4 pt-3 pb-0">
          <h1 className="text-xl font-bold text-white mb-3">{t("home")}</h1>
        </div>
        <div className="flex">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-3 text-sm font-medium text-center relative transition-all cursor-pointer ${
              activeTab === "all" ? "text-white" : "text-text-muted hover:text-gray-300 hover:bg-binance-border/20"
            }`}
          >
            {t("communityFeed")}
            {activeTab === "all" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-binance-yellow rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("tokens")}
            className={`flex-1 py-3 text-sm font-medium text-center relative transition-all cursor-pointer ${
              activeTab === "tokens" ? "text-white" : "text-text-muted hover:text-gray-300 hover:bg-binance-border/20"
            }`}
          >
            {t("trackedTokens")}
            {activeTab === "tokens" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-binance-yellow rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* ═══ Tab Content ═══ */}
      {activeTab === "all" ? (
        <>
          {/* ═══ Composer ═══ */}
          <div className="border-b border-binance-border p-4">
            {user ? (
              <form onSubmit={handleCreatePost}>
                <div className="flex space-x-3">
                  <div className="w-10 h-10 rounded-full bg-binance-yellow/20 flex items-center justify-center font-bold text-binance-yellow uppercase text-sm border border-binance-yellow/30 shrink-0">
                    {user.username.slice(0, 2)}
                  </div>
                  <div className="flex-1 space-y-3">
                    <textarea
                      id="composer"
                      placeholder={t("postPlaceholder")}
                      className="w-full bg-transparent border-0 text-base focus:outline-none resize-none min-h-[60px] text-gray-200 placeholder-gray-600 pt-1"
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      rows={2}
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
                    
                    <div className="flex items-center justify-between pt-2 border-t border-binance-border/30">
                      {/* Media Upload and Token Selector */}
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

                        <select
                          className="bg-transparent border border-binance-border/50 rounded-full text-xs px-3 py-1.5 focus:outline-none text-text-muted hover:border-binance-yellow/30 transition-all cursor-pointer"
                          value={postTokenSymbol}
                          onChange={(e) => setPostTokenSymbol(e.target.value)}
                        >
                          <option value="">{t("globalDiscussion")}</option>
                          {tokens.map((tk) => (
                            <option key={tk.symbol} value={tk.symbol}>
                              ${tk.symbol}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isUploading || (!newPostText.trim() && !mediaUrl)}
                        className="px-5 py-2 bg-binance-yellow hover:bg-binance-yellow/90 text-binance-dark font-bold rounded-full text-sm transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t("postBtn")}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between py-3">
                <p className="text-sm text-text-muted">{t("connectToPost")}</p>
                <button
                  onClick={login}
                  className="px-5 py-2 bg-binance-yellow text-binance-dark font-bold text-sm rounded-full hover:bg-binance-yellow/90 transition-all cursor-pointer"
                >
                  {t("connectWallet")}
                </button>
              </div>
            )}
          </div>

          {/* ═══ Posts Feed ═══ */}
          {isLoadingPosts ? (
            <div>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="border-b border-binance-border p-4 animate-pulse">
                  <div className="flex space-x-3">
                    <div className="w-10 h-10 rounded-full bg-binance-border" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-binance-border rounded w-1/3" />
                      <div className="h-3 bg-binance-border rounded w-full" />
                      <div className="h-3 bg-binance-border rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm border-b border-binance-border">
              {t("noDiscussions")}
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <div key={post.id} className="border-b border-binance-border">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ═══ Tokens Tab ═══ */
        <div id="tokens">
          {isLoadingTokens ? (
            <div>
              {[1, 2, 3].map((n) => (
                <div key={n} className="border-b border-binance-border p-4 animate-pulse">
                  <div className="h-5 bg-binance-border rounded w-1/4 mb-2" />
                  <div className="h-3 bg-binance-border rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              No tokens tracked yet.
            </div>
          ) : (
            <div>
              {tokens.map((token, i) => (
                <Link
                  key={token.symbol}
                  href={`/token/${token.symbol}`}
                  className="flex items-center justify-between p-4 border-b border-binance-border hover:bg-binance-border/20 transition-all group"
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-binance-yellow/10 border border-binance-yellow/20 flex items-center justify-center text-binance-yellow font-bold text-xs shrink-0 uppercase">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">${token.symbol}</span>
                        <span className="text-xs text-text-muted">({token.name})</span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{token.description}</p>
                      <div className="flex items-center space-x-4 mt-1.5">
                        <span className="text-[11px] text-text-muted">
                          {token.postCount} {t("postBtn").toLowerCase()}s
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {token.victimCount} {t("victims").toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-binance-yellow transition-all shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
