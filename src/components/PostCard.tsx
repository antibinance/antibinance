"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useWallet } from "@/context/WalletContext";
import { Heart, MessageCircle, Share2, BarChart2, X, Trash2 } from "lucide-react";

export interface PostCardPost {
  id: string;
  content: string;
  createdAt: string;
  tokenSymbol: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  likesCount: number;
  repliesCount: number;
  replyToId: string | null;
  isLiked: boolean;
  user: {
    address: string;
    username: string;
    avatarUrl?: string;
  };
  replyToUser?: {
    username: string;
  };
}

interface PostCardProps {
  post: PostCardPost;
  onLikeToggle?: (postId: string, liked: boolean) => void;
  onDelete?: (postId: string) => void;
  compact?: boolean;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export default function PostCard({ post, onLikeToggle, onDelete, compact = false }: PostCardProps) {
  const { t } = useLanguage();
  const { user } = useWallet();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [showCopied, setShowCopied] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const method = isLiked ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method });
      if (res.ok) {
        const newLiked = !isLiked;
        setIsLiked(newLiked);
        setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
        onLikeToggle?.(post.id, newLiked);
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete?.(post.id);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete post");
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
      alert("Error deleting post");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/post/${post.id}`);
  };

  const isOwner = user && user.address.toLowerCase() === post.user.address.toLowerCase();

  return (
    <>
      <article
        onClick={handleCardClick}
        className={`hover:bg-binance-border/10 transition-all cursor-pointer ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
      >
        <div className="flex space-x-3">
          {/* Avatar */}
          <Link
            href={`/user/${post.user.address}`}
            onClick={(e) => e.stopPropagation()}
            className={`rounded-full bg-binance-yellow/10 border border-binance-yellow/20 flex items-center justify-center font-bold text-binance-yellow uppercase shrink-0 hover:bg-binance-yellow/20 transition-all ${
              compact ? "w-8 h-8 text-[10px]" : "w-10 h-10 text-xs"
            }`}
          >
            {post.user.username.slice(0, 2)}
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Reply indicator */}
            {post.replyToUser && (
              <div className="flex items-center space-x-1 text-[12px] text-text-muted mb-0.5">
                <span>{t("replyTo")} <span className="text-binance-yellow">@{post.replyToUser.username}</span></span>
              </div>
            )}

            {/* Header: name · @address · time · token badge */}
            <div className="flex items-center space-x-1.5 flex-wrap">
              <Link
                href={`/user/${post.user.address}`}
                onClick={(e) => e.stopPropagation()}
                className={`font-bold text-white hover:underline ${compact ? "text-xs" : "text-sm"}`}
              >
                {post.user.username}
              </Link>
              <span className="text-text-muted text-xs font-mono">
                {post.user.address.slice(0, 6)}...{post.user.address.slice(-4)}
              </span>
              <span className="text-text-muted text-xs">·</span>
              <span className="text-text-muted text-xs">{timeAgo(post.createdAt)}</span>
              {post.tokenSymbol && (
                <>
                  <span className="text-text-muted text-xs">·</span>
                  <Link
                    href={`/token/${post.tokenSymbol}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] font-bold text-binance-yellow hover:underline"
                  >
                    ${post.tokenSymbol}
                  </Link>
                </>
              )}
            </div>

            {/* Body */}
            <p className={`mt-1 text-gray-200 whitespace-pre-wrap leading-relaxed ${compact ? "text-xs" : "text-[15px]"}`}>
              {post.content}
            </p>

            {/* ═══ Media Attachment ═══ */}
            {post.mediaUrl && post.mediaType === "image" && (
              <div
                className="mt-3 rounded-2xl overflow-hidden border border-binance-border max-w-full cursor-zoom-in"
                onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
              >
                <img
                  src={post.mediaUrl}
                  alt="Post media"
                  className="w-full max-h-[520px] object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {post.mediaUrl && post.mediaType === "video" && (
              <div
                className="mt-3 rounded-2xl overflow-hidden border border-binance-border max-w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <video
                  src={post.mediaUrl}
                  controls
                  preload="metadata"
                  className="w-full max-h-[520px]"
                />
              </div>
            )}

            {/* Action bar - X style */}
            <div className="flex items-center justify-between mt-2 max-w-[420px] -ml-2">
              {/* Reply */}
              <button
                onClick={(e) => { e.stopPropagation(); router.push(`/post/${post.id}`); }}
                className="flex items-center space-x-1 text-text-muted hover:text-binance-yellow transition-all group p-2 rounded-full hover:bg-binance-yellow/10 cursor-pointer"
              >
                <MessageCircle className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" />
                <span className="text-xs">{post.repliesCount > 0 ? post.repliesCount : ""}</span>
              </button>

              {/* Like */}
              <button
                onClick={handleLike}
                className={`flex items-center space-x-1 transition-all group p-2 rounded-full cursor-pointer ${
                  isLiked 
                    ? "text-binance-red hover:bg-binance-red/10" 
                    : "text-text-muted hover:text-binance-red hover:bg-binance-red/10"
                }`}
              >
                <Heart className={`w-[18px] h-[18px] group-hover:scale-110 transition-transform ${isLiked ? "fill-current" : ""}`} />
                <span className="text-xs">{likesCount > 0 ? likesCount : ""}</span>
              </button>

              {/* Views (mock) */}
              <button className="flex items-center space-x-1 text-text-muted hover:text-binance-yellow transition-all group p-2 rounded-full hover:bg-binance-yellow/10 cursor-pointer">
                <BarChart2 className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" />
              </button>

              {/* Share */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  className="flex items-center space-x-1 text-text-muted hover:text-binance-yellow transition-all group p-2 rounded-full hover:bg-binance-yellow/10 cursor-pointer"
                >
                  <Share2 className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" />
                </button>
                {showCopied && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-binance-yellow text-binance-dark px-2 py-0.5 rounded-full whitespace-nowrap font-bold">
                    {t("copiedLink")}
                  </span>
                )}
              </div>

              {/* Delete - Only show if current user is owner */}
              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center space-x-1 text-text-muted hover:text-binance-red transition-all group p-2 rounded-full hover:bg-binance-red/10 cursor-pointer disabled:opacity-50"
                  title="Delete post"
                >
                  <Trash2 className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* ═══ Lightbox ═══ */}
      {lightbox && post.mediaUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-binance-dark/60 rounded-full p-2 transition-all cursor-pointer"
            onClick={() => setLightbox(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={post.mediaUrl}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
