import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Phone, Crown, ArrowLeft, Copy, ExternalLink,
  Loader2, Link2, Globe, CheckCircle, AlertCircle, Sparkles,
  Palette, Film, Eye, EyeOff, Zap, Music2, Camera, PlayCircle, Bird
} from 'lucide-react';

const WEB_API = window.location.origin + '/api/web';
const PREMIUM_PLANS = ['Pro', 'VVIP', 'Owner'];

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: Music2 },
  { id: 'instagram', name: 'Instagram', icon: Camera },
  { id: 'youtube', name: 'YouTube', icon: PlayCircle },
  { id: 'twitter', name: 'X / Twitter', icon: Bird },
];

const VIRTUAL_PROVIDERS = [
  { name: 'OnlineSim', url: 'https://onlinesim.io/receive-smss', desc: 'Free virtual numbers for SMS verification' },
  { name: 'Receive-SMS', url: 'https://receive-smss.com', desc: 'Temporary phone numbers worldwide' },
  { name: 'Temp-Number', url: 'https://temp-number.com', desc: 'Disposable phone numbers for verification' },
];

const TABS = [
  { id: 'downloader', label: 'Downloader', icon: Download },
  { id: 'canva', label: 'Canva', icon: Palette },
  { id: 'alight', label: 'Alight Motion', icon: Film },
  { id: 'numbers', label: 'Numbers', icon: Phone },
];

function AccountCard({ account, onCopy }) {
  const [showPass, setShowPass] = useState(false);
  if (!account) return null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="p-5 bg-white border border-main rounded-xl mt-4">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle size={16} className="text-success" />
        <span className="text-base font-bold">Account Generated</span>
        <span className="text-xs text-muted ml-auto font-semibold">{account.type}</span>
      </div>
      {[
        { label: 'Email', value: account.email },
        { label: 'Password', value: account.password, secret: true },
        { label: 'Validity', value: account.validity },
      ].map(row => (
        <div key={row.label} className="flex items-center justify-between py-2-5 border-b border-main">
          <span className="text-xs text-muted font-semibold w-min">{row.label}</span>
          <div className="flex items-center gap-2">
            <code className="text-sm font-bold font-mono">
              {row.secret && !showPass ? '••••••••••' : row.value}
            </code>
            {row.secret && (
              <button onClick={() => setShowPass(!showPass)} className="bg-none border-0 cursor-pointer p-1 text-muted flex">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
            <button onClick={() => onCopy(row.value)} className="bg-gray-bg border-0 rounded-xs p-1 px-2 cursor-pointer flex items-center gap-1 text-xs font-bold text-sub">
              <Copy size={12} /> Copy
            </button>
          </div>
        </div>
      ))}
      {account.note && (
        <p className="text-xs text-muted mt-3 leading-normal italic">{account.note}</p>
      )}
    </motion.div>
  );
}

function PremiumGate({ navigate }) {
  return (
    <div className="text-center py-12 px-5">
      <div className="w-16 h-16 bg-gray-bg rounded-full flex items-center justify-center mx-auto mb-4">
        <Crown size={28} className="text-muted" />
      </div>
      <h3 className="text-xl font-black mb-2">Pro Plan Required</h3>
      <p className="text-sub text-sm mb-6 leading-relaxed max-w-80 mx-auto">
        This feature is available for Pro, VVIP, and Owner plans only.
      </p>
      <button className="btn btn-primary inline-flex items-center gap-2 px-7 py-3" onClick={() => navigate('/pricing')}>
        <Crown size={14} /> Upgrade Plan
      </button>
    </div>
  );
}

export default function ToolsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('downloader');

  const [dlUrl, setDlUrl] = useState('');
  const [dlPlatform, setDlPlatform] = useState('tiktok');
  const [dlLoading, setDlLoading] = useState(false);
  const [dlResult, setDlResult] = useState(null);
  const [dlError, setDlError] = useState('');

  const [genLoading, setGenLoading] = useState(false);
  const [canvaAccount, setCanvaAccount] = useState(null);
  const [alightAccount, setAlightAccount] = useState(null);
  const [genHistory, setGenHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('genHistory') || '[]'); } catch { return []; }
  });

  const refreshProfile = () => {
    if (!user) return;
    fetch(`${WEB_API}/profile?userId=${user.id}&email=${encodeURIComponent(user.email || '')}`)
      .then(r => r.json())
      .then(d => { if (d.success) setProfile(d.profile); });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/auth'); return; }
      setUser(session.user);
      fetch(`${WEB_API}/profile?userId=${session.user.id}&email=${encodeURIComponent(session.user.email || '')}`)
        .then(r => r.json())
        .then(d => { if (d.success) setProfile(d.profile); })
        .finally(() => setLoading(false));
    });
  }, [navigate]);

  const isPremium = PREMIUM_PLANS.includes(profile?.plan);

  const handleDownload = async () => {
    if (!dlUrl.trim()) { toast.error('Please enter a URL'); return; }
    setDlLoading(true); setDlResult(null); setDlError('');
    try {
        const res = await fetch(`${WEB_API}/download`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, userEmail: user.email, url: dlUrl.trim(), platform: dlPlatform }),
        });
      const json = await res.json();
      if (json.success) { setDlResult(json.data); toast.success('Media found!'); }
      else { setDlError(json.error || 'Failed to fetch media'); toast.error(json.error || 'Download failed'); }
    } catch { setDlError('Network error'); toast.error('Network error'); }
    setDlLoading(false);
  };

  const handleGenerate = async (type) => {
    setGenLoading(true);
    try {
      const endpoint = type === 'canva' ? 'generate-canva' : 'generate-alight';
      const res = await fetch(`${WEB_API}/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userEmail: user.email }),
      });
      const json = await res.json();
      if (json.success) {
        if (type === 'canva') setCanvaAccount(json.account);
        else setAlightAccount(json.account);
        const entry = { ...json.account, platform: type, time: new Date().toLocaleString() };
        const updated = [entry, ...genHistory].slice(0, 20);
        setGenHistory(updated);
        localStorage.setItem('genHistory', JSON.stringify(updated));
        toast.success(`${type === 'canva' ? 'Canva' : 'Alight Motion'} account generated! (-2 tokens)`);
        refreshProfile();
      } else {
        toast.error(json.error || 'Generation failed');
      }
    } catch { toast.error('Network error'); }
    setGenLoading(false);
  };

  const copyText = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="ios-page min-h-screen bg-white text-main">
      <div className="max-w-3xl mx-auto p-5 pb-20">

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/app')}
            className="bg-gray-bg border-0 rounded-lg p-2 cursor-pointer flex items-center justify-center">
            <ArrowLeft size={18} className="text-main" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tight">Tools</h1>
            <p className="text-xs text-muted font-semibold">Downloader, generators & virtual numbers</p>
          </div>
          {profile && (
            <div className="bg-gray-bg rounded-md px-3 py-1 flex items-center gap-1.5">
              <Zap size={12} className="text-primary" />
              <span className="text-xs font-black">{profile.tokens}</span>
            </div>
          )}
        </div>

        <div className="tabnav-root mb-6">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`tabnav-item ${active ? 'active' : ''} flex items-center gap-1.5 cursor-pointer`}>
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          
          {activeTab === 'downloader' && (
            <motion.div key="dl" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.2 }}>
              {!isPremium ? <PremiumGate navigate={navigate} /> : (
                <>
                  <div className="p-5 bg-gray-bg border border-gray-border rounded-xl mb-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles size={16} className="text-primary" />
                      <span className="text-base font-bold">Download Media</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {PLATFORMS.map(p => {
                        const PlatformIcon = p.icon;
                        return (
                          <button key={p.id} onClick={() => setDlPlatform(p.id)}
                            className="p-2 rounded-md border-2 flex flex-col items-center gap-1 transition-all"
                            style={{ borderColor: dlPlatform === p.id ? 'var(--text-main)' : 'var(--gray-border)' }}>
                            <PlatformIcon size={20} className={dlPlatform === p.id ? 'text-main' : 'text-muted'} />
                            <span className={`text-xs font-bold ${dlPlatform === p.id ? 'text-main' : 'text-muted'}`}>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input className="input-style w-full py-3 px-3 pl-9 rounded-md border border-main bg-white text-main text-sm box-border" type="url" placeholder="Paste video/image URL here..."
                          value={dlUrl} onChange={e => setDlUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDownload()} />
                      </div>
                      <button className="btn btn-primary px-5 py-3 flex items-center gap-1.5 text-sm whitespace-nowrap" onClick={handleDownload} disabled={dlLoading || !dlUrl.trim()}>
                        {dlLoading ? <><Loader2 size={14} className="spinner-icon" /> Fetching...</> : <><Download size={14} /> Download</>}
                      </button>
                    </div>
                  </div>

                  {dlError && (
                    <motion.div initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-error-bg text-error-color rounded-md mb-4 flex items-center gap-2.5">
                      <AlertCircle size={18} className="text-danger flex-shrink-0" />
                      <span className="text-sm text-error-text font-semibold">{dlError}</span>
                    </motion.div>
                  )}

                  {dlResult && (
                    <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-white border border-main rounded-xl">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle size={16} className="text-success" />
                        <span className="text-base font-bold">Media Found</span>
                      </div>
                      {dlResult.title && <p className="text-sm text-sub mb-3 leading-normal">{dlResult.title}</p>}
                      {dlResult.images && dlResult.images.length > 0 && (
                        <div className="grid-auto-fill-sm gap-2 mb-3">
                          {dlResult.images.map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noopener noreferrer"
                              className="block rounded-md overflow-hidden bg-gray-bg aspect-square">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                      {(dlResult.video || dlResult.url) && (
                        <a href={dlResult.video || dlResult.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary inline-flex items-center gap-2 px-6 py-3 no-underline text-sm">
                          <Download size={14} /> Download Video
                        </a>
                      )}
                      {dlResult.music && (
                        <a href={dlResult.music} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 ml-2 no-underline text-sm text-main font-bold hover:text-sub transition-colors">
                          <Music2 size={14} /> Download Audio
                        </a>
                      )}
                    </motion.div>
                  )}

                  <div className="mt-5 p-4 bg-gray-bg rounded-md">
                    <p className="text-xs text-muted leading-relaxed">
                      Supported: TikTok, Instagram, YouTube, X/Twitter. Rate limited to 10 per minute.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          )}

          
          {activeTab === 'canva' && (
            <motion.div key="canva" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.2 }}>
              {!isPremium ? <PremiumGate navigate={navigate} /> : (
                <>
                  <div className="p-6 rounded-xl border border-gray-border bg-gray-bg mb-4">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-12 h-12 rounded-3xl flex items-center justify-center flex-shrink-0 bg-[var(--white)] border border-gray-border">
                        <Palette size={24} className="text-main" />
                      </div>
                      <div>
                        <h3 className="text-base font-black mb-0.5">Canva Pro Generator</h3>
                        <p className="text-xs text-muted">Auto-generate Canva Pro trial accounts</p>
                      </div>
                    </div>

                      <div className="p-3.5 bg-[var(--white)] border border-gray-border rounded-md mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted">Cost per account</span>
                        <span className="font-bold">2 Tokens</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted">Account type</span>
                          <span className="font-bold">Canva Pro Trial</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Rate limit</span>
                        <span className="font-bold">3 per 5 minutes</span>
                      </div>
                    </div>

                    <button className="btn btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm" onClick={() => handleGenerate('canva')} disabled={genLoading}>
                      {genLoading ? <><Loader2 size={16} className="spinner-icon" /> Generating...</> : <><Sparkles size={16} /> Generate Canva Account</>}
                    </button>
                  </div>

                  {canvaAccount && <AccountCard account={canvaAccount} onCopy={copyText} />}

                  {genHistory.filter(h => h.platform === 'canva').length > 0 && (
                    <div className="mt-5">
                      <div className="text-sm font-bold mb-2.5 text-sub">Recent Generations</div>
                      {genHistory.filter(h => h.platform === 'canva').slice(0, 5).map((h, i) => (
                        <div key={i} className="flex justify-between items-center p-3.5 bg-gray-bg rounded-md mb-1.5 text-xs">
                          <code className="font-semibold font-mono">{h.email}</code>
                          <div className="flex items-center gap-2">
                            <span className="text-muted">{h.time}</span>
                            <button onClick={() => copyText(h.email + ':' + h.password)} className="bg-none border-0 cursor-pointer p-0.5 text-muted flex"><Copy size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          
          {activeTab === 'alight' && (
            <motion.div key="alight" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.2 }}>
              {!isPremium ? <PremiumGate navigate={navigate} /> : (
                <>
                  <div className="p-6 rounded-xl border border-gray-border bg-gray-bg mb-4">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-12 h-12 rounded-3xl flex items-center justify-center flex-shrink-0 bg-[var(--white)] border border-gray-border">
                        <Film size={24} className="text-main" />
                      </div>
                      <div>
                        <h3 className="text-base font-black mb-0.5">Alight Motion Generator</h3>
                        <p className="text-xs text-muted">Auto-generate Alight Motion Premium accounts</p>
                      </div>
                    </div>

                      <div className="p-3.5 bg-[var(--white)] border border-gray-border rounded-md mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted">Cost per account</span>
                        <span className="font-bold">2 Tokens</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted">Account type</span>
                          <span className="font-bold">Alight Motion Premium</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Rate limit</span>
                        <span className="font-bold">3 per 5 minutes</span>
                      </div>
                    </div>

                    <button className="btn btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm" onClick={() => handleGenerate('alight')} disabled={genLoading}>
                      {genLoading ? <><Loader2 size={16} className="spinner-icon" /> Generating...</> : <><Sparkles size={16} /> Generate Alight Motion Account</>}
                    </button>
                  </div>

                  {alightAccount && <AccountCard account={alightAccount} onCopy={copyText} />}

                  {genHistory.filter(h => h.platform === 'alight').length > 0 && (
                    <div className="mt-5">
                      <div className="text-sm font-bold mb-2.5 text-sub">Recent Generations</div>
                      {genHistory.filter(h => h.platform === 'alight').slice(0, 5).map((h, i) => (
                        <div key={i} className="flex justify-between items-center p-3.5 bg-gray-bg rounded-md mb-1.5 text-xs">
                          <code className="font-semibold font-mono">{h.email}</code>
                          <div className="flex items-center gap-2">
                            <span className="text-muted">{h.time}</span>
                            <button onClick={() => copyText(h.email + ':' + h.password)} className="bg-none border-0 cursor-pointer p-0.5 text-muted flex"><Copy size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          
          {activeTab === 'numbers' && (
            <motion.div key="nums" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.2 }}>
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={16} className="text-primary" />
                  <span className="text-base font-bold">Virtual Number Providers</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Get temporary phone numbers for SMS verification. These are third-party services.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {VIRTUAL_PROVIDERS.map((provider, i) => (
                  <motion.a key={provider.name} href={provider.url} target="_blank" rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className="p-5 rounded-xl border border-gray-border bg-[var(--white)] no-underline text-main flex items-center gap-4 transition-all cursor-pointer hover:border-main">
                    <div className="w-12 h-12 rounded-3xl flex items-center justify-center flex-shrink-0 bg-gray-bg border border-gray-border">
                      <Phone size={22} className="text-main" />
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-base mb-1">{provider.name}</div>
                      <div className="text-xs text-sub leading-relaxed">{provider.desc}</div>
                    </div>
                    <ExternalLink size={16} className="text-muted flex-shrink-0" />
                  </motion.a>
                ))}
              </div>

              <div className="mt-6 p-5 bg-gray-bg rounded-xl">
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertCircle size={14} className="text-muted" />
                  <span className="text-sm font-bold">Important Notes</span>
                </div>
                <ul className="text-xs text-sub leading-relaxed pl-4 m-0">
                  <li>Virtual numbers are provided by third-party services</li>
                  <li>Numbers may be shared — don't use for sensitive accounts</li>
                  <li>Availability varies by country and service</li>
                  <li>Free numbers refresh periodically</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
