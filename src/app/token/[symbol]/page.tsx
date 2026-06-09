"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { useLanguage } from "@/context/LanguageContext";
import PostCard from "@/components/PostCard";
import type { PostCardPost } from "@/components/PostCard";
import { useToast } from "@/context/ToastContext";
import { 
  ArrowLeft, 
  TrendingDown, 
  ExternalLink, 
  MessageSquare, 
  ShieldAlert, 
  Clock,
  Send,
  AlertTriangle
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
  const [losses, setLosses] = useState<LossReport[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Poll state (stored locally in localstorage for UX mock)
  const [sentiment, setSentiment] = useState({ scam: 65, insider: 25, utility: 10 });
  const [hasVoted, setHasVoted] = useState(false);

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
      const lossesRes = await fetch(`/api/losses?tokenSymbol=${symbol}`);

      if (postsRes.ok && lossesRes.ok) {
        const postsData = await postsRes.json();
        const lossesData = await lossesRes.json();
        setPosts((postsData.posts || []).map((p: any) => ({
          ...p,
          likesCount: p.likesCount || 0,
          repliesCount: p.repliesCount || 0,
          replyToId: p.replyToId || null,
          isLiked: p.isLiked || false,
        })));
        setLosses(lossesData.losses || []);
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

    const voted = localStorage.getItem(`voted_${symbol}`);
    if (voted) setHasVoted(true);
  }, [symbol]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newPostText.trim()) return;

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPostText,
          tokenSymbol: symbol,
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
      } else {
        const err = await res.json();
        toast(err.error || "Failed to post", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = (type: "scam" | "insider" | "utility") => {
    if (hasVoted) return;
    setSentiment((prev) => {
      const copy = { ...prev };
      copy[type] += 1;
      return copy;
    });
    setHasVoted(true);
    localStorage.setItem(`voted_${symbol}`, "true");
  };

  const totalVotes = sentiment.scam + sentiment.insider + sentiment.utility;
  const scamPct = Math.round((sentiment.scam / totalVotes) * 100);
  const insiderPct = Math.round((sentiment.insider / totalVotes) * 100);
  const utilityPct = 100 - scamPct - insiderPct;

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
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Back button */}
      <div>
        <Link href="/" className="inline-flex items-center text-xs text-text-muted hover:text-binance-yellow space-x-1.5 transition-all">
          <ArrowLeft className="w-4 h-4" />
          <span>{t("backToGlobal")}</span>
        </Link>
      </div>

      {/* Token Header Panel */}
      <section className="glass rounded-3xl p-6 md:p-8 border border-binance-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-binance-red/5 rounded-full blur-3xl"></div>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="space-y-3 flex-1">
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-extrabold text-white uppercase">${token.symbol}</span>
              <span className="text-gray-400 font-medium">({token.name})</span>
              {token.binanceUrl && (
                <a href={token.binanceUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-binance-yellow transition-all p-1 bg-binance-border/30 rounded">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">{token.description}</p>
            {token.listedAt && (
              <p className="text-xs text-text-muted flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {t("listedOnBinance")}: {new Date(token.listedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex gap-4 self-stretch md:self-auto">
            <div className="flex-1 md:flex-none glass px-5 py-4 rounded-2xl border border-binance-border text-center md:text-left min-w-[130px]">
              <span className="block text-2xl font-extrabold text-binance-red glow-red">
                ${token.totalLossUsd.toLocaleString()}
              </span>
              <span className="text-[10px] text-text-muted mt-1 uppercase font-bold">{t("totalLoss")}</span>
            </div>
            <div className="flex-1 md:flex-none glass px-5 py-4 rounded-2xl border border-binance-border text-center md:text-left min-w-[130px]">
              <span className="block text-2xl font-bold text-gray-200">
                {token.victimCount}
              </span>
              <span className="text-[10px] text-text-muted mt-1 uppercase font-bold">{t("victims")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid: Forum & Sentiment Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: X-like Feed specific to this Token (8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          <h3 className="font-extrabold text-lg text-white border-b border-binance-border pb-3 flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-binance-yellow" />
            <span>${token.symbol} {t("discussionBoard")}</span>
          </h3>

          {/* Composer */}
          <div className="glass rounded-2xl p-4 border border-binance-border space-y-3">
            {user ? (
              <form onSubmit={handleCreatePost} className="space-y-3">
                <div className="flex space-x-3">
                  <div className="w-10 h-10 rounded-full bg-binance-yellow/20 flex items-center justify-center font-bold text-binance-yellow uppercase text-sm border border-binance-yellow/30 shrink-0">
                    {user.username.slice(0, 2)}
                  </div>
                  <textarea
                    placeholder={`${t("writeWarning")} $${token.symbol}...`}
                    className="w-full bg-transparent border-0 text-sm focus:outline-none resize-none min-h-[80px] text-gray-200 placeholder-gray-500 pt-2"
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    required
                  />
                </div>
                
                <div className="border-t border-binance-border/50 pt-3 flex justify-between items-center">
                  <span className="text-[10px] text-text-muted uppercase">Tag: ${token.symbol}</span>
                  <button
                    type="submit"
                    className="flex items-center space-x-1.5 px-4 py-2 bg-binance-yellow hover:bg-binance-yellow/90 text-binance-dark font-bold rounded-lg text-xs transition-all shadow-md cursor-pointer"
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

        {/* Right Side: Sentiment Poll & Verified Loss Board (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Sentiment Gauge */}
          <div className="glass rounded-2xl p-5 border border-binance-border space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-1.5 uppercase">
              <ShieldAlert className="w-4 h-4 text-binance-yellow" />
              <span>{t("allegationPoll")}</span>
            </h3>
            
            <div className="space-y-3">
              {/* Option 1: Absolute Scam */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-300">{t("insiderDump")}</span>
                  <span className="text-binance-red font-bold">{scamPct}%</span>
                </div>
                <div className="w-full bg-binance-dark h-2 rounded-full overflow-hidden">
                  <div className="bg-binance-red h-full rounded-full transition-all duration-500" style={{ width: `${scamPct}%` }}></div>
                </div>
              </div>

              {/* Option 2: Insider Trading */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-300">{t("listingHype")}</span>
                  <span className="text-binance-yellow font-bold">{insiderPct}%</span>
                </div>
                <div className="w-full bg-binance-dark h-2 rounded-full overflow-hidden">
                  <div className="bg-binance-yellow h-full rounded-full transition-all duration-500" style={{ width: `${insiderPct}%` }}></div>
                </div>
              </div>

              {/* Option 3: Genuine Utility Failure */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-300">{t("retailCapitulation")}</span>
                  <span className="text-gray-400 font-bold">{utilityPct}%</span>
                </div>
                <div className="w-full bg-binance-dark h-2 rounded-full overflow-hidden">
                  <div className="bg-gray-600 h-full rounded-full transition-all duration-500" style={{ width: `${utilityPct}%` }}></div>
                </div>
              </div>
            </div>

            {!hasVoted ? (
              <div className="flex flex-col gap-2 pt-2.5">
                <button onClick={() => handleVote("scam")} className="w-full py-1.5 border border-binance-red/30 hover:bg-binance-red/10 text-binance-red rounded text-xs transition-all font-bold cursor-pointer">
                  {t("voteInsiderDump")}
                </button>
                <button onClick={() => handleVote("insider")} className="w-full py-1.5 border border-binance-yellow/30 hover:bg-binance-yellow/10 text-binance-yellow rounded text-xs transition-all font-bold cursor-pointer">
                  {t("voteListingHype")}
                </button>
                <button onClick={() => handleVote("utility")} className="w-full py-1.5 border border-binance-border hover:bg-binance-gray text-gray-300 rounded text-xs transition-all font-bold cursor-pointer">
                  {t("voteRetailCapitulation")}
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-text-muted text-center pt-2">{t("thankYouVote")}</p>
            )}
          </div>

          {/* Loss Ledger List */}
          <div className="glass rounded-2xl p-5 border border-binance-border space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-1.5 uppercase">
              <TrendingDown className="w-4 h-4 text-binance-red" />
              <span>{t("lossRegistry")}</span>
            </h3>

            {losses.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">{t("noLossReports")}</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {losses.map((loss) => (
                  <div key={loss.id} className="p-3 bg-binance-dark border border-binance-border/60 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-gray-300 truncate max-w-[120px]">
                        {loss.user.username}
                      </span>
                      <span className="text-xs font-extrabold text-binance-red">
                        -${loss.amountUsd.toLocaleString()}
                      </span>
                    </div>
                    {loss.entryPrice && (
                      <div className="flex justify-between text-[10px] text-text-muted">
                        <span>Entry/Exit</span>
                        <span>{loss.entryPrice} → {loss.exitPrice || "N/A"}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
