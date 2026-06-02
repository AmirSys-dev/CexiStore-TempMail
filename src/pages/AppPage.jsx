import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../components/Toast';
import {
  Sparkles, Sun, Moon, LogOut
} from 'lucide-react';
import TabNav from '../components/TabNav';
import EmailSection from './sections/EmailSection';
import InboxSection from './sections/InboxSection';
import VaultSection from './sections/VaultSection';
import ApiSection from './sections/ApiSection';

const DEFAULT_DOMAIN = 'amircexitech.com';
const WEB_API = window.location.origin + '/api/web';
const EMAIL_TTL_MS = 30 * 60 * 1000;

const TAB_CONFIG = [
  { id: 'identity', label: 'Email', icon: null },
  { id: 'inbox', label: 'Inbox', icon: null },
  { id: 'vault', label: 'Vault', icon: null },
  { id: 'api', label: 'API', icon: null },
];

function confetti() {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const colors = ['#0f172a', '#334155', '#475569', '#94a3b8', '#cbd5e1', '#f1f5f9', '#ffffff'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = `${Math.random() * 100}vw`;
    el.style.top = `${Math.random() * -20}vh`;
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = `${Math.random() * 0.5}s`;
    el.style.width = `${6 + Math.random() * 6}px`;
    el.style.height = `${6 + Math.random() * 6}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

function useTimer(expiresAt) {
  const [remaining, setRemaining] = useState('');
  const [percent, setPercent] = useState(100);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const now = Date.now();
      const diff = expiresAt - now;
      if (diff <= 0) {
        setRemaining('Expired');
        setPercent(0);
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${String(s).padStart(2, '0')}`);
      setPercent(Math.round((diff / EMAIL_TTL_MS) * 100));
    };
    tick();
    const itv = setInterval(tick, 1000);
    return () => clearInterval(itv);
  }, [expiresAt]);

  return { remaining, percent };
}

export default function AppPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('identity');
  const [initLoading, setInitLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [domains, setDomains] = useState([]);
  const [emailHistory, setHistory] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [emailCreatedAt, setEmailCreatedAt] = useState(null);

  const [customName, setCustomName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(DEFAULT_DOMAIN);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [fakeIdentity, setFakeIdentity] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const [referralStats, setReferralStats] = useState({ code: '', referred: 0, earned: 0 });
  const [usageData, setUsageData] = useState([]);
  const [profileLoadState, setProfileLoadState] = useState('loading');
  const [profileLoadError, setProfileLoadError] = useState('');
  const modalCloseRef = useRef(null);
  const lastActiveElementRef = useRef(null);

  const { remaining: timerText, percent: timerPercent } = useTimer(
    emailCreatedAt ? emailCreatedAt + EMAIL_TTL_MS : null
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const fetchAll = useCallback(async (u) => {
    setProfileLoadState('loading');
    setProfileLoadError('');
    try {
      const pendingRef = localStorage.getItem('pending_referral_code');
      const qs = new URLSearchParams({ userId: u.id });
      if (u.email) qs.set('email', u.email);
      if (pendingRef) qs.set('ref', pendingRef);

      let p = null;
      let h = [];
      let d = [];
      let loadErrorMessage = '';

      try {
        const profileRes = await fetch(`${WEB_API}/profile?${qs.toString()}`);
        const profileJson = await profileRes.json();
        if (profileJson.success) {
          p = profileJson.profile || null;
          h = profileJson.emails || [];
          d = profileJson.domains || [];
          if (pendingRef) localStorage.removeItem('pending_referral_code');
        } else {
          loadErrorMessage = profileJson.error || 'Profile API returned an error';
        }
      } catch (err) {
        loadErrorMessage = err?.message || 'Profile API fetch failed';
        console.error('Profile API fetch failed:', err);
      }

      if (!p) {
        const profRes = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
        if (profRes.error) loadErrorMessage = profRes.error.message || loadErrorMessage;
        p = profRes.data || null;
        const domRes = await supabase.from('domains').select('domain').eq('is_active', true);
        if (domRes.error && !loadErrorMessage) loadErrorMessage = domRes.error.message;
        d = domRes.data || [];
        const emailRes = await supabase
          .from('active_emails')
          .select('email, created_at')
          .eq('profile_id', u.id)
          .order('created_at', { ascending: false });
        if (emailRes.error && !loadErrorMessage) loadErrorMessage = emailRes.error.message;
        h = emailRes.data || [];
      }

      if (p) {
        setProfile(p);
        if (p.last_used_email) setCurrentEmail(p.last_used_email);
        setProfileLoadState('ready');
      } else {
        setProfile(null);
        setProfileLoadState('error');
        setProfileLoadError(loadErrorMessage || 'Unable to load account profile. Please retry.');
      }

      if (d) setDomains(d);

      if (h) {
        setHistory(h.map(x => x.email));
        if (h.length > 0 && h[0].created_at) setEmailCreatedAt(new Date(h[0].created_at).getTime());

        const dayMap = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('en', { weekday: 'short' });
          dayMap[key] = 0;
        }
        h.forEach(email => {
          const d = new Date(email.created_at);
          const key = d.toLocaleDateString('en', { weekday: 'short' });
          if (dayMap[key] !== undefined) dayMap[key]++;
        });
        setUsageData(Object.entries(dayMap).map(([day, count]) => ({ day, count })));
      } else {
        setHistory([]);
        setUsageData([]);
      }

      if (p?.referral_code) {
        try {
          const res = await fetch(
            `${WEB_API}/user/referrals?code=${encodeURIComponent(p.referral_code)}`
          );
          const json = await res.json();
          if (json.success) {
            setReferralStats({
              code: p.referral_code,
              referred: json.count,
              earned: json.count * 2
            });
          } else {
            setReferralStats({ code: p.referral_code, referred: 0, earned: 0 });
          }
        } catch {
          setReferralStats({ code: p.referral_code, referred: 0, earned: 0 });
        }
      } else {
        setReferralStats({ code: '', referred: 0, earned: 0 });
      }
    } catch (e) {
      console.error(e);
      setProfileLoadState('error');
      setProfileLoadError(e?.message || 'Failed to load account data.');
    }
  }, []);

  const fetchInbox = useCallback(async (addr) => {
    if (!addr) return;
    const { data } = await supabase
      .from('temp_inbox')
      .select('*')
      .eq('recipient', addr)
      .order('received_at', { ascending: false });
    if (data) setInbox(data);
  }, []);

  const handleProvision = async () => {
    if (isGenerating || !user) return;
    if (profileLoadState !== 'ready' || !profile) {
      toast.error('Profile data not ready. Retry in Vault tab.');
      return;
    }
    if ((profile.tokens || 0) <= 0) {
      toast.error('Insufficient tokens! Top up in Pricing.');
      return;
    }
    setIsGenerating(true);
    const name = customName.trim() || Math.random().toString(36).substring(2, 10);
    const addr = `${name}@${selectedDomain}`;

    try {
      await supabase.from('active_emails').insert({ email: addr, profile_id: user.id });
      const { data: updated } = await supabase
        .from('profiles')
        .update({
          tokens: profile.tokens - 1,
          last_used_email: addr,
          total_emails_generated: (profile.total_emails_generated || 0) + 1
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updated) setProfile(updated);
      setCurrentEmail(addr);
      setEmailCreatedAt(Date.now());
      setInbox([]);
      setCustomName('');
      fetchAll(user);
      setGenerateSuccess(true);
      confetti();
      toast.success(`${addr} is now active!`);
      navigator.clipboard.writeText(addr);
      setTimeout(() => setGenerateSuccess(false), 2000);
    } catch {
      toast.error('Failed to provision identity');
    }
    setIsGenerating(false);
  };

  const handleDeleteEmail = async (email) => {
    try {
      await supabase
        .from('active_emails')
        .delete()
        .eq('email', email)
        .eq('profile_id', user.id);
      if (currentEmail === email) {
        setCurrentEmail('');
        setInbox([]);
      }
      fetchAll(user);
      toast.info('Email removed');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const generateFake = useCallback(() => {
    const first = [
      'Amir',
      'Irfan',
      'Sofea',
      'Aisyah',
      'Hafiz',
      'Nurul',
      'Danish',
      'Syahmi',
      'Farah',
      'Aiman'
    ];
    const last = ['Rahman', 'Kassim', 'Ismail', 'Abdullah', 'Hassan', 'Zulkifli', 'Ahmad', 'Ibrahim'];
    setFakeIdentity({
      name: `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`,
      phone: `+60 1${Math.floor(Math.random() * 9)}-${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
      address: `No. ${Math.floor(Math.random() * 200) + 1}, Jalan ${['Ampang', 'Bukit Bintang', 'Cheras', 'Damansara', 'Petaling'][Math.floor(Math.random() * 5)]}, ${['KL', 'Selangor', 'Johor', 'Penang'][Math.floor(Math.random() * 4)]}`,
      ic: `${['85', '90', '95', '00'][Math.floor(Math.random() * 4)]}${String(Math.floor(Math.random() * 1300) + 101).padStart(4, '0')}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      pass: `${Math.random().toString(36).slice(-6)}${Math.floor(Math.random() * 100)}!`
    });
  }, []);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRefreshInbox = async () => {
    if (!currentEmail) return;
    setIsRefreshing(true);
    await fetchInbox(currentEmail);
    setIsRefreshing(false);
  };

  const handleRetryProfile = () => {
    if (!user) return;
    fetchAll(user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/auth');
      setUser(session.user);
      fetchAll(session.user).then(() => {
        generateFake();
        setInitLoading(false);
      });
    });
  }, [navigate, fetchAll, generateFake]);

  useEffect(() => {
    if (!currentEmail) return;
    fetchInbox(currentEmail);
    const itv = setInterval(() => fetchInbox(currentEmail), 5000);
    return () => clearInterval(itv);
  }, [currentEmail, fetchInbox]);

  useEffect(() => {
    if (!selectedEmail) return;

    lastActiveElementRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedEmail(null);
      }

      if (event.key === 'Tab') {
        const modal = document.querySelector('[data-email-modal="true"]');
        if (!modal) return;

        const focusable = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => modalCloseRef.current?.focus());

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (lastActiveElementRef.current && typeof lastActiveElementRef.current.focus === 'function') {
        lastActiveElementRef.current.focus();
      }
    };
  }, [selectedEmail]);

  if (initLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-4 border-slate-200"
          style={{ borderTopColor: 'var(--black)' }}
        />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-semibold text-slate-500"
        >
          Loading Dashboard...
        </motion.span>
      </div>
    );
  }

  return (
    <div className="main-wrapper ios-page">
      {/* Dashboard Header */}
      <header className="border-b border-slate-200 px-5 pb-5 pt-7">
        <div className="flex justify-between items-center mb-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              <Sparkles size={12} /> DASHBOARD
            </span>
          <div className="flex gap-2 items-center">
            <span className="badge badge-green">
              {profileLoadState === 'ready'
                ? `${profile?.tokens ?? 0} Tokens`
                : profileLoadState === 'loading'
                  ? 'Loading...'
                  : 'Unavailable'}
            </span>
              <button
                onClick={() => setDarkMode(!darkMode)}
               className="rounded p-1 text-slate-500 transition-colors duration-200 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
               title="Toggle theme"
               aria-label="Toggle dark mode"
             >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
              <button
                onClick={handleLogout}
               className="rounded p-1 text-slate-500 transition-colors duration-200 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
               title="Logout"
               aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <h1 className="text-3xl font-black tracking-tight">Console</h1>
        {currentEmail && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="live-dot" />
            <span className="text-xs text-muted font-semibold font-mono">
              {currentEmail}
            </span>
          </div>
        )}
      </header>

      {/* Tab Navigation - Desktop Only */}
      <div className="hidden sm:block px-5 pt-0">
        <TabNav
          tabs={TAB_CONFIG}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          idPrefix="app"
        />
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <section
          id="app-identity-panel"
          role="tabpanel"
          aria-labelledby="app-identity-tab"
          hidden={activeTab !== 'identity'}
          tabIndex={0}
        >
          {activeTab === 'identity' && (
            <EmailSection
              currentEmail={currentEmail}
              emailCreatedAt={emailCreatedAt}
              timerText={timerText}
              timerPercent={timerPercent}
              showQR={showQR}
              onToggleQR={() => setShowQR(!showQR)}
              customName={customName}
              onCustomNameChange={setCustomName}
              selectedDomain={selectedDomain}
              onDomainChange={setSelectedDomain}
              domains={domains}
              isGenerating={isGenerating}
              generateSuccess={generateSuccess}
              onProvision={handleProvision}
              onCopyToClipboard={copyToClipboard}
              copiedField={copiedField}
              fakeIdentity={fakeIdentity}
              onGenerateFake={generateFake}
              emailHistory={emailHistory}
              onSwitchEmail={(em) => {
                setCurrentEmail(em);
                setInbox([]);
                toast.info(`Switched to ${em}`);
              }}
              onDeleteEmail={handleDeleteEmail}
            />
          )}
        </section>

        <section
          id="app-inbox-panel"
          role="tabpanel"
          aria-labelledby="app-inbox-tab"
          hidden={activeTab !== 'inbox'}
          tabIndex={0}
        >
          {activeTab === 'inbox' && (
            <InboxSection
              inbox={inbox}
              currentEmail={currentEmail}
              isRefreshing={isRefreshing}
              onRefreshInbox={handleRefreshInbox}
              onSelectEmail={setSelectedEmail}
            />
          )}
        </section>

        <section
          id="app-vault-panel"
          role="tabpanel"
          aria-labelledby="app-vault-tab"
          hidden={activeTab !== 'vault'}
          tabIndex={0}
        >
          {activeTab === 'vault' && (
            <VaultSection
              profile={profile}
              user={user}
              usageData={usageData}
              referralStats={referralStats}
              copiedField={copiedField}
              profileLoadState={profileLoadState}
              profileLoadError={profileLoadError}
              onRetryProfile={handleRetryProfile}
              onCopyToClipboard={copyToClipboard}
              onNavigate={navigate}
            />
          )}
        </section>

        <section
          id="app-api-panel"
          role="tabpanel"
          aria-labelledby="app-api-tab"
          hidden={activeTab !== 'api'}
          tabIndex={0}
        >
          {activeTab === 'api' && (
            <ApiSection
              profile={profile}
              copiedField={copiedField}
              onCopyToClipboard={copyToClipboard}
            />
          )}
        </section>
      </AnimatePresence>

      {/* Bottom Navigation - Mobile Only */}
      <div className="nav-bottom sm:hidden">
        {TAB_CONFIG.map(tab => {
          const inboxCount = tab.id === 'inbox' ? inbox.length : 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              aria-label={`Go to ${tab.label}`}
              aria-selected={activeTab === tab.id}
            >
              <span>{tab.label}</span>
              {inboxCount > 0 && <span className="nav-badge">{inboxCount}</span>}
            </button>
          );
        })}
      </div>

      {/* Email Reader Modal */}
      <AnimatePresence>
        {selectedEmail && (
          <motion.div
            className="modal-overlay"
            onClick={() => setSelectedEmail(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-sheet"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="email-modal-title"
              data-email-modal="true"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="modal-header">
                <div className="flex-1">
                  <h2 id="email-modal-title" className="text-lg font-black">
                    {selectedEmail.subject || '(no subject)'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {selectedEmail.sender}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(selectedEmail.received_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  ref={modalCloseRef}
                  className="modal-close"
                  onClick={() => setSelectedEmail(null)}
                  aria-label="Close email"
                >
                  ✕
                </button>
              </div>
              <div className="bg-gray-bg p-5 rounded-md border border-gray-border">
                {selectedEmail.html_content ? (
                  <iframe
                    srcDoc={selectedEmail.html_content}
                    className="w-full rounded-lg border-0"
                    style={{ minHeight: '400px' }}
                    title="Email content"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono">
                    {selectedEmail.text_content}
                  </pre>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
