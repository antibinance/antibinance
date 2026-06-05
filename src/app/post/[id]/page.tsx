"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { useLanguage } from "@/context/LanguageContext";
import PostCard from "@/components/PostCard";
import type { PostCardPost } from "@/components/PostCard";
import { useToast } from "@/context/ToastContext";
import {
  ArrowLeft,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  Send,
  Image as ImageIcon,
  X,
  Loader2,
} from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function PostDetail({ params }: PageProps) {
  const { id } = use(params);
  const { user, login } = useWallet();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [post, setPost] = useState<PostCardPost | null>(null);
  const [replies, setReplies] = useState<PostCardPost[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showCopied, setShowCopied] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  // Media upload state for reply
  const [replyMediaUrl, setReplyMediaUrl] = useState("");
  const [replyMediaType, setReplyMediaType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/posts/${id}`);
      if (res.ok) {
        const data = await res.json();
        const p = data.post;
        setPost(p);
        setIsLiked(p.isLiked);
        setLikesCount(p.likesCount);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReplies = async () => {
    try {
      const res = await fetch(`/api/posts/${id}/replies`);
      if (res.ok) {
        const data = await res.json();
        setReplies(data.posts || data.replies || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchPost(), fetchReplies()]).finally(() =>
      setIsLoading(false)
    );
  }, [id]);

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
        setReplyMediaUrl(data.url);
        setReplyMediaType(data.mediaType);
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

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!replyText.trim() && !replyMediaUrl) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText,
          replyToId: id,
          mediaUrl: replyMediaUrl || null,
          mediaType: replyMediaType || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReplies((prev) => [data.post, ...prev]);
        setReplyText("");
        setReplyMediaUrl("");
        setReplyMediaType("");
      } else {
        const err = await res.json();
        toast(err.error || "Failed to reply", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error submitting reply", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async () => {
    const method = isLiked ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/posts/${id}/like`, { method });
      if (res.ok) {
        setIsLiked(!isLiked);
        setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16">
        <div className="glass rounded-2xl p-6 border border-binance-border animate-pulse h-48" />
        <div className="glass rounded-2xl p-6 border border-binance-border animate-pulse h-32" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <h2 className="text-2xl font-bold text-white">Post not found</h2>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-binance-yellow text-binance-dark font-bold rounded-lg text-sm transition-all"
        >
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center text-xs text-text-muted hover:text-binance-yellow space-x-1.5 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("back")}</span>
        </Link>
      </div>

      {/* Main post - prominent display */}
      <article className="glass rounded-2xl p-5 md:p-6 border border-binance-border">
        {/* Reply-to indicator */}
        {post.replyToUser && (
          <div className="flex items-center space-x-1 text-[11px] text-text-muted mb-3">
            <MessageCircle className="w-3 h-3" />
            <span>
              {t("replyTo")} @{post.replyToUser.username}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full bg-binance-yellow/10 border border-binance-yellow/20 flex items-center justify-center font-bold text-binance-yellow text-sm uppercase shrink-0">
              {post.user.username.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-gray-200">
                  {post.user.username}
                </span>
                <span className="text-[11px] text-text-muted font-mono">
                  {post.user.address.slice(0, 6)}...
                  {post.user.address.slice(-4)}
                </span>
              </div>
              <span className="text-[11px] text-text-muted flex items-center space-x-1 mt-0.5">
                <Clock className="w-3 h-3 mr-0.5" />
                {new Date(post.createdAt).toLocaleDateString()}{" "}
                {new Date(post.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {post.tokenSymbol && (
            <Link
              href={`/token/${post.tokenSymbol}`}
              className="text-[11px] font-bold bg-binance-red/10 border border-binance-red/30 text-binance-red px-2.5 py-1 rounded-full uppercase hover:bg-binance-red/20 transition-all"
            >
              ${post.tokenSymbol}
            </Link>
          )}
        </div>

        {/* Content - larger for detail view */}
        <p className="mt-4 text-base text-gray-200 whitespace-pre-wrap leading-relaxed">
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

        {/* Action bar */}
        <div className="mt-4 pt-3 border-t border-binance-border/30 flex items-center space-x-6">
          {/* Replies count */}
          <div className="flex items-center space-x-1.5 text-text-muted">
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">
              {replies.length} {t("replies")}
            </span>
          </div>

          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1.5 transition-all group cursor-pointer ${
              isLiked
                ? "text-binance-red"
                : "text-text-muted hover:text-binance-red"
            }`}
          >
            <Heart
              className={`w-4 h-4 group-hover:scale-110 transition-transform ${
                isLiked ? "fill-current" : ""
              }`}
            />
            <span className="text-xs">{likesCount > 0 ? likesCount : ""}</span>
          </button>

          {/* Share */}
          <div className="relative">
            <button
              onClick={handleShare}
              className="flex items-center space-x-1.5 text-text-muted hover:text-binance-yellow transition-all group cursor-pointer"
            >
              <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-xs">{t("share")}</span>
            </button>
            {showCopied && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] bg-binance-dark border border-binance-border px-2 py-0.5 rounded text-binance-yellow whitespace-nowrap">
                {t("copiedLink")}
              </span>
            )}
          </div>
        </div>
      </article>

      {/* Reply composer */}
      <div className="glass rounded-2xl p-4 border border-binance-border">
        {user ? (
          <form onSubmit={handleSubmitReply} className="space-y-3">
            <div className="flex space-x-3">
              <div className="w-9 h-9 rounded-full bg-binance-yellow/20 flex items-center justify-center font-bold text-binance-yellow uppercase text-xs border border-binance-yellow/30 shrink-0">
                {user.username.slice(0, 2)}
              </div>
              <div className="flex-1 space-y-3">
                <textarea
                  placeholder={t("writeReply")}
                  className="w-full bg-transparent border-0 text-sm focus:outline-none resize-none min-h-[60px] text-gray-200 placeholder-gray-500 pt-2"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />

                {/* Reply Media Preview */}
                {replyMediaUrl && (
                  <div className="relative mt-2 rounded-xl overflow-hidden border border-binance-border group max-w-md bg-binance-dark/40">
                    {replyMediaType === "image" ? (
                      <img src={replyMediaUrl} alt="Upload preview" className="w-full max-h-60 object-cover" />
                    ) : (
                      <video src={replyMediaUrl} controls className="w-full max-h-60 object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => { setReplyMediaUrl(""); setReplyMediaType(""); }}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="border-t border-binance-border/50 pt-3 flex items-center justify-between">
                  <div className="flex items-center">
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
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading || (!replyText.trim() && !replyMediaUrl)}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-binance-yellow hover:bg-binance-yellow/90 text-binance-dark font-bold rounded-lg text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t("reply")}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-text-muted mb-3">
              {t("connectToPost")}
            </p>
            <button
              onClick={login}
              className="px-4 py-2 bg-binance-yellow text-binance-dark font-bold text-xs rounded-lg hover:bg-binance-yellow/90 transition-all cursor-pointer"
            >
              {t("connectWallet")}
            </button>
          </div>
        )}
      </div>

      {/* Replies section */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-lg text-white border-b border-binance-border pb-3 flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-binance-yellow" />
          <span>
            {t("replies")} ({replies.length})
          </span>
        </h3>

        {replies.length === 0 ? (
          <div className="glass rounded-2xl p-8 border border-binance-border text-center text-text-muted text-sm">
            {t("noReplies")}
          </div>
        ) : (
          <div className="space-y-0">
            {replies.map((reply, index) => (
              <div key={reply.id} className="relative flex">
                {/* Thread connector line */}
                <div className="flex flex-col items-center mr-0 w-8 shrink-0">
                  <div className="w-px bg-binance-border/50 flex-1" />
                  {index < replies.length - 1 && (
                    <div className="w-px bg-binance-border/50 flex-1" />
                  )}
                </div>
                <div className="flex-1 mb-3">
                  <PostCard post={reply} compact />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}
