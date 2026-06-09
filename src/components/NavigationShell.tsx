"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { 
  Home, 
  Coins, 
  User as UserIcon, 
  Wallet, 
  LogOut, 
  ShieldAlert, 
  Search,
  Plus, 
  Globe,
  MoreHorizontal,
  Feather
} from "lucide-react";

export default function NavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isConnecting, login, logout } = useWallet();
  const { locale, setLocale, t } = useLanguage();
  const { toast } = useToast();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenForm, setTokenForm] = useState({ symbol: "", name: "", description: "", binanceUrl: "" });

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast(t("connectToPost"), "warning");
      return;
    }
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokenForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      toast(t("createSpace") + " ✓", "success");
      setShowTokenModal(false);
      setTokenForm({ symbol: "", name: "", description: "", binanceUrl: "" });
      window.location.reload();
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  const menuItems = [
    { name: t("home"), href: "/", icon: Home },
    { name: t("tokenForums"), href: "/#tokens", icon: Coins },
  ];
  if (user) {
    menuItems.push({ name: t("profile") || "Profile", href: `/user/${user.address}`, icon: UserIcon });
  }

  return (
    <div className="flex min-h-screen bg-binance-dark text-gray-200">
      {/* ═══ Left Sidebar - X Style ═══ */}
      <aside className="hidden md:flex flex-col w-[72px] xl:w-[260px] border-r border-binance-border fixed h-screen z-20 items-center xl:items-stretch">
        {/* Logo */}
        <div className="p-4 xl:px-5 xl:py-5">
          <Link href="/" className="flex items-center xl:space-x-3 justify-center xl:justify-start group">
            <ShieldAlert className="w-8 h-8 text-binance-yellow group-hover:scale-110 transition-transform" />
            <span className="hidden xl:block font-extrabold text-xl tracking-wider text-binance-yellow glow-yellow">
              {t("brand")}
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 xl:px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === "/" && pathname === "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-center xl:justify-start space-x-0 xl:space-x-4 px-3 py-3 rounded-full font-medium transition-all hover:bg-binance-border/40 ${
                  isActive ? "text-white font-bold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="hidden xl:block text-lg">{item.name}</span>
              </Link>
            );
          })}

          {/* Post Button */}
          <button
            onClick={() => {
              if (!user) {
                toast(t("connectToPost"), "warning");
                return;
              }
              // Scroll to composer on home page or navigate
              if (pathname !== "/") {
                window.location.href = "/";
              } else {
                document.getElementById("composer")?.focus();
              }
            }}
            className="w-full mt-4 flex items-center justify-center xl:justify-center space-x-2 px-3 py-3 bg-binance-yellow hover:bg-binance-yellow/90 text-binance-dark font-bold rounded-full shadow-lg hover:shadow-binance-yellow/20 transition-all cursor-pointer"
          >
            <Feather className="w-5 h-5 xl:hidden" />
            <span className="hidden xl:block text-base">{t("postBtn")}</span>
          </button>
        </nav>

        {/* Language Switcher */}
        <div className="px-2 xl:px-3 pb-2">
          <div className="flex items-center justify-center xl:justify-start xl:px-3 py-2">
            <div className="flex items-center bg-binance-dark border border-binance-border rounded-full overflow-hidden">
              <button
                onClick={() => setLocale("zh")}
                className={`px-2.5 py-1 text-xs transition-all ${locale === "zh" ? "bg-binance-yellow text-binance-dark font-bold" : "hover:text-gray-200 text-gray-500"}`}
              >
                中
              </button>
              <button
                onClick={() => setLocale("en")}
                className={`px-2.5 py-1 text-xs transition-all ${locale === "en" ? "bg-binance-yellow text-binance-dark font-bold" : "hover:text-gray-200 text-gray-500"}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* User Card at Bottom - X Style */}
        <div className="p-3 xl:px-3 pb-5">
          {user ? (
            <div className="flex items-center justify-center xl:justify-between xl:px-3 py-2 rounded-full hover:bg-binance-border/30 transition-all cursor-pointer group"
              onClick={() => router.push(`/user/${user.address}`)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-binance-yellow/20 border border-binance-yellow/40 flex items-center justify-center text-binance-yellow font-bold uppercase text-sm shrink-0">
                  {user.username.slice(0, 2)}
                </div>
                <div className="hidden xl:block overflow-hidden">
                  <p className="font-bold text-sm text-white truncate">{user.username}</p>
                  <p className="text-xs text-text-muted truncate">{user.address.slice(0, 6)}...{user.address.slice(-4)}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
                className="hidden xl:block p-1 text-text-muted hover:text-binance-red rounded-full transition-all cursor-pointer"
                title={t("disconnect") || "Disconnect"}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              disabled={isConnecting}
              className="w-full flex items-center justify-center xl:justify-center space-x-2 px-3 py-3 bg-binance-yellow hover:bg-binance-yellow/90 text-binance-dark font-bold rounded-full shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              <Wallet className="w-5 h-5" />
              <span className="hidden xl:block text-sm">{isConnecting ? t("connecting") : t("connectWallet")}</span>
            </button>
          )}
        </div>
      </aside>

      {/* ═══ Main Content Area ═══ */}
      <div className="flex-1 flex flex-col md:ml-[72px] xl:ml-[260px]">
        <div className="flex-1 flex flex-col lg:flex-row max-w-[1200px]">
          {/* Center Column - Main Feed */}
          <main className="flex-1 min-w-0 border-r border-binance-border/50 max-w-[680px]">
            {children}
          </main>

          {/* Right Sidebar - Desktop Only */}
          <aside className="hidden lg:block w-[350px] p-5 space-y-5 shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder={t("search") || "Search"}
                className="w-full bg-binance-gray border border-binance-border rounded-full pl-11 pr-4 py-2.5 text-sm text-gray-200 placeholder-text-muted focus:outline-none focus:border-binance-yellow/50 transition-all"
              />
            </div>

            {/* Add Token Card */}
            <div className="bg-binance-gray border border-binance-border rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-base text-white">{t("trackTokenTitle")}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{t("trackTokenDesc") || "Track a new token that Binance listed."}</p>
              <button
                onClick={() => {
                  if (!user) {
                    toast(t("connectToPost"), "warning");
                    return;
                  }
                  setShowTokenModal(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-binance-yellow hover:bg-binance-yellow/90 text-binance-dark font-bold rounded-full text-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t("trackToken")}</span>
              </button>
            </div>

            {/* Disclaimer */}
            <div className="p-4 rounded-2xl border border-binance-border bg-binance-gray text-xs text-text-muted leading-relaxed space-y-2">
              <h4 className="font-bold text-gray-300 flex items-center space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-binance-red" />
                <span>{t("disclaimerTitle")}</span>
              </h4>
              <p>{t("disclaimerDesc")}</p>
            </div>

            {/* Footer links */}
            <div className="text-[11px] text-text-muted leading-loose px-1">
              <span>Terms of Service</span> · <span>Privacy Policy</span> · <span>Cookie Policy</span>
              <br />
              <span>© 2024 AntiBinance</span>
            </div>
          </aside>
        </div>
      </div>

      {/* ═══ Bottom Nav - Mobile ═══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 border-t border-binance-border bg-binance-dark/95 backdrop-blur-md z-20 flex justify-around items-center">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center space-y-0.5 text-[10px] p-2 ${
                isActive ? "text-binance-yellow" : "text-gray-500"
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
        <button
          onClick={() => {
            if (!user) { login(); return; }
            if (pathname !== "/") { window.location.href = "/"; }
          }}
          className="bg-binance-yellow text-binance-dark rounded-full p-2.5 -mt-4 shadow-lg"
        >
          <Feather className="w-5 h-5" />
        </button>
        {user ? (
          <button onClick={logout} className="flex flex-col items-center p-2 text-gray-500">
            <LogOut className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={login} className="flex flex-col items-center p-2 text-binance-yellow">
            <Wallet className="w-5 h-5" />
          </button>
        )}
      </nav>

      {/* ═══ Add Token Modal ═══ */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4">
          <div className="bg-binance-gray border border-binance-border w-full max-w-lg rounded-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-binance-border">
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-gray-400 hover:text-white transition-all text-lg font-light cursor-pointer"
              >
                ✕
              </button>
              <h3 className="font-bold text-base text-white">{t("trackTokenTitle")}</h3>
              <div className="w-6" />
            </div>
            {/* Modal Body */}
            <form onSubmit={handleTokenSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5 font-bold">{t("tokenSymbolLabel")}</label>
                <input
                  type="text"
                  required
                  placeholder="PEPE"
                  className="w-full bg-binance-dark border border-binance-border rounded-xl p-3 text-sm focus:outline-none focus:border-binance-yellow/50 uppercase"
                  value={tokenForm.symbol}
                  onChange={(e) => setTokenForm({ ...tokenForm, symbol: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5 font-bold">{t("tokenFullNameLabel")}</label>
                <input
                  type="text"
                  required
                  placeholder="Pepe Coin"
                  className="w-full bg-binance-dark border border-binance-border rounded-xl p-3 text-sm focus:outline-none focus:border-binance-yellow/50"
                  value={tokenForm.name}
                  onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5 font-bold">{t("listingStoryLabel")}</label>
                <textarea
                  placeholder="Binance listed at the top..."
                  className="w-full bg-binance-dark border border-binance-border rounded-xl p-3 text-sm focus:outline-none focus:border-binance-yellow/50 h-20 resize-none"
                  value={tokenForm.description}
                  onChange={(e) => setTokenForm({ ...tokenForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5 font-bold">{t("binanceUrlLabel")}</label>
                <input
                  type="url"
                  placeholder="https://www.binance.com/en/trade/PEPE_USDT"
                  className="w-full bg-binance-dark border border-binance-border rounded-xl p-3 text-sm focus:outline-none focus:border-binance-yellow/50"
                  value={tokenForm.binanceUrl}
                  onChange={(e) => setTokenForm({ ...tokenForm, binanceUrl: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-binance-yellow hover:bg-binance-yellow/90 text-binance-dark font-bold rounded-full text-sm transition-all cursor-pointer"
              >
                {t("createSpace")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
