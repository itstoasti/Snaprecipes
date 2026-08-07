"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser, useProStatus, useSavesThisMonth } from "@/hooks/useDashboardData";
import PaywallModal from "@/components/PaywallModal";
import { 
  User, Crown, ExternalLink, Mail, Shield, FileText, 
  LogOut, Trash2, ChevronRight, Smartphone, Star 
} from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { isPro, loading: proLoading } = useProStatus(user?.id);
  const { count: savesCount, loading: savesLoading, limit } = useSavesThisMonth(user?.id);

  const [managing, setManaging] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleManageSubscription = async () => {
    if (!user) return;
    setManaging(true);
    try {
      const res = await fetch('/api/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    }
    setManaging(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      setIsDeleting(true);
      await supabase.auth.signOut();
      router.push('/');
    }
  };

  if (userLoading || proLoading || savesLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-surface-800 rounded w-32 mb-8"></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-surface-900 rounded-2xl border border-surface-700"></div>
        ))}
      </div>
    );
  }

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-display text-surface-300 font-semibold mb-6">Settings</h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-900 rounded-2xl border border-surface-700 p-6 flex items-center space-x-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg">
          <span className="text-white text-3xl font-bold">{userInitial}</span>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-medium text-surface-300">{user?.email}</h2>
          <div className="mt-2 inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium">
            {isPro ? (
              <span className="bg-accent text-white px-3 py-1 rounded-full flex items-center shadow-sm">
                <Crown size={14} className="mr-1.5" /> Pro Plan
              </span>
            ) : (
              <span className="bg-surface-800 text-surface-400 px-3 py-1 rounded-full">
                Free Plan
              </span>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface-900 rounded-2xl border border-surface-700 p-6">
        <h3 className="text-lg font-medium text-surface-300 mb-4">Subscription</h3>
        {isPro ? (
          <div className="space-y-4">
            <div className="flex items-center text-accent font-medium">
              <Star className="mr-2" size={20} /> You are on the Pro Plan
            </div>
            <p className="text-surface-400 text-sm">Thank you for supporting Snap Recipes. Enjoy unlimited saves and premium features.</p>
            <button 
              onClick={handleManageSubscription}
              disabled={managing}
              className="px-6 py-2 bg-surface-800 hover:bg-surface-700 text-surface-300 font-medium rounded-xl transition-colors"
            >
              {managing ? "Loading..." : "Manage Subscription"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-surface-400 font-medium">Monthly Saves</span>
              <span className="text-surface-300 font-medium">{savesCount} / {limit}</span>
            </div>
            <div className="w-full bg-surface-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-accent h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((savesCount / limit) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-surface-400 mt-2 mb-4">You have {Math.max(limit - savesCount, 0)} saves remaining this month.</p>
            <button 
              onClick={() => setIsPaywallOpen(true)}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-accent to-accent-dark hover:from-accent-light hover:to-accent text-white font-medium rounded-xl shadow-md transition-all flex items-center justify-center"
            >
              <Crown size={18} className="mr-2" /> Upgrade to Pro
            </button>
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-surface-900 rounded-2xl border border-surface-700 overflow-hidden">
        <h3 className="text-lg font-medium text-surface-300 p-6 pb-2">Get the App</h3>
        <div className="p-2 px-4">
          <a href="https://play.google.com/store/apps/details?id=com.deanfieldz.yummy" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 hover:bg-surface-800 rounded-xl transition-colors group">
            <div className="flex items-center text-surface-400 group-hover:text-surface-300 transition-colors">
              <div className="w-10 h-10 bg-surface-800 group-hover:bg-surface-700 rounded-full flex items-center justify-center mr-4 transition-colors">
                <Smartphone size={20} />
              </div>
              <span className="font-medium">Download for Android</span>
            </div>
            <ExternalLink size={18} className="text-surface-500 group-hover:text-surface-300 transition-colors" />
          </a>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-surface-900 rounded-2xl border border-surface-700 overflow-hidden">
        <h3 className="text-lg font-medium text-surface-300 p-6 pb-2">Support</h3>
        <div className="p-2 px-4 space-y-1">
          <a href="mailto:support@snaprecipes.xyz" className="flex items-center justify-between p-4 hover:bg-surface-800 rounded-xl transition-colors group">
            <div className="flex items-center text-surface-400 group-hover:text-surface-300 transition-colors">
              <Mail size={18} className="mr-3" />
              <span>Send Feedback</span>
            </div>
            <ChevronRight size={18} className="text-surface-500 group-hover:text-surface-300 transition-colors" />
          </a>
          <a href="#" className="flex items-center justify-between p-4 hover:bg-surface-800 rounded-xl transition-colors group">
            <div className="flex items-center text-surface-400 group-hover:text-surface-300 transition-colors">
              <Shield size={18} className="mr-3" />
              <span>Privacy Policy</span>
            </div>
            <ExternalLink size={16} className="text-surface-500 group-hover:text-surface-300 transition-colors" />
          </a>
          <a href="#" className="flex items-center justify-between p-4 hover:bg-surface-800 rounded-xl transition-colors group">
            <div className="flex items-center text-surface-400 group-hover:text-surface-300 transition-colors">
              <FileText size={18} className="mr-3" />
              <span>Terms of Service</span>
            </div>
            <ExternalLink size={16} className="text-surface-500 group-hover:text-surface-300 transition-colors" />
          </a>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-surface-900 rounded-2xl border border-red-200 overflow-hidden mb-12">
        <h3 className="text-lg font-medium text-red-600 p-6 pb-2">Account</h3>
        <div className="p-2 px-4 space-y-1">
          <button onClick={handleSignOut} className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-xl transition-colors group">
            <div className="flex items-center text-red-500 group-hover:text-red-600 font-medium transition-colors">
              <LogOut size={18} className="mr-3" />
              <span>Sign Out</span>
            </div>
          </button>
          <button onClick={handleDeleteAccount} className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-xl transition-colors group">
            <div className="flex items-center text-red-500 group-hover:text-red-600 font-medium transition-colors">
              <Trash2 size={18} className="mr-3" />
              <span>{isDeleting ? "Deleting..." : "Delete Account"}</span>
            </div>
          </button>
        </div>
      </motion.div>

      {user && <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} userId={user.id} userEmail={user.email} />}
    </div>
  );
}
