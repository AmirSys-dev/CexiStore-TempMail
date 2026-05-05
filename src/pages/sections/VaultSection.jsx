import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail, Zap, TrendingUp, Users, Gift, CreditCard, Shield,
  Check, Copy, RefreshCw, BarChart3
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import Button from '../../components/Button';

const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
};

export default function VaultSection({
  profile,
  user,
  usageData,
  referralStats,
  copiedField,
  profileLoadState,
  profileLoadError,
  onRetryProfile,
  onCopyToClipboard
}) {
  const navigate = useNavigate();
  const tokensUsed = Math.max(
    Number(profile?.total_emails_generated || 0),
    Math.max(0, 5 - Number(profile?.tokens || 0))
  );

  if (profileLoadState !== 'ready') {
    return (
      <motion.div
        key="vt"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.25 }}
        className="p-5"
      >
        <div className="card-premium text-center py-6 px-5">
          <div className="text-lg font-bold mb-2">
            {profileLoadState === 'loading' ? 'Loading Vault data...' : 'Vault data unavailable'}
          </div>
          <div className="text-sm text-muted mb-3">
            {profileLoadState === 'loading'
              ? 'Please wait while we sync your profile and activity.'
              : profileLoadError || 'We could not load your profile right now.'}
          </div>
          <Button
            variant="secondary"
            onClick={onRetryProfile}
            disabled={profileLoadState === 'loading'}
          >
            {profileLoadState === 'loading' ? 'Syncing...' : 'Retry'}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="vt"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
      className="p-5"
    >
      {/* Token Balance Card */}
      <div className="identity-card mb-4 border border-slate-300 bg-slate-100 shadow-none">
        <div className="section-label opacity-40">TOKEN BALANCE</div>
        <div className="flex items-baseline gap-2 my-2">
          <motion.span
            key={profile?.tokens}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl font-black text-main font-mono"
          >
            {profile?.tokens || 0}
          </motion.span>
          <span className="text-lg font-semibold opacity-70 text-sub">tokens</span>
        </div>
        <button
          className="btn-gh mt-2 border border-slate-300 bg-white text-slate-800"
          onClick={() => navigate('/pricing')}
          aria-label="Top up tokens"
        >
          <CreditCard size={14} /> Top Up Tokens
        </button>
      </div>

      {/* Usage Chart */}
      <motion.div
        className="card-premium"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="section-label mb-0">
            <BarChart3 size={12} className="inline align-middle mr-1" />
            EMAIL ACTIVITY (7 DAYS)
          </div>
          <span className="text-xs font-bold text-muted">
            {profile?.total_emails_generated || 0} total
          </span>
        </div>
        <div className="w-full" style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={usageData}>
              <defs>
                <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                 tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{
                   background: '#ffffff',
                   border: '1px solid #cbd5e1',
                   borderRadius: '8px',
                   fontSize: '12px'
                 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                 stroke="#0f172a"
                strokeWidth={2}
                fill="url(#emailGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quick Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 gap-2.5 mt-3"
      >
        {[
           { label: 'Emails Created', value: profile?.total_emails_generated || 0, icon: Mail, color: '#0f172a' },
           { label: 'Current Plan', value: profile?.plan || 'Free', icon: Zap, color: '#334155' },
           { label: 'Tokens Used', value: tokensUsed, icon: TrendingUp, color: '#475569' },
           { label: 'Referrals', value: referralStats.referred, icon: Users, color: '#64748b' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
               className="rounded-md border border-slate-300 bg-white p-4"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5"
                style={{ background: `${s.color}12` }}
              >
                <Icon size={14} style={{ color: s.color }} />
              </div>
              <div className="text-2xl font-black mb-0.5">{s.value}</div>
              <div className="text-xs text-muted font-semibold">{s.label}</div>
            </div>
          );
        })}
      </motion.div>

      {/* Referral Section */}
      <motion.div
        className="card-premium mt-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
             style={{ background: '#f1f5f9', border: '1px solid #cbd5e1' }}
          >
              <Gift size={14} style={{ color: 'var(--text-sub)' }} />
            </div>
          <div>
            <div className="text-sm font-bold">Referral Program</div>
            <div className="text-xs text-muted">Earn 2 tokens per referral</div>
          </div>
        </div>
        {referralStats.code ? (
          <>
            <div className="flex items-center gap-2 mb-3">
               <div className="flex-1 rounded-xs bg-slate-100 p-2.5 font-mono text-sm font-bold tracking-wider">
                {referralStats.code}
              </div>
              <button
                className="btn-gh p-2.5 flex-shrink-0"
                onClick={() => onCopyToClipboard(referralStats.code, 'refcode')}
                aria-label="Copy referral code"
              >
                {copiedField === 'refcode' ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                className="btn-gh p-2.5 flex-shrink-0"
                onClick={() => {
                  const url = `${window.location.origin}/auth?ref=${referralStats.code}`;
                  onCopyToClipboard(url, 'reflink');
                }}
                aria-label="Copy referral link"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="flex gap-3">
               <div className="flex-1 rounded-xs bg-slate-100 p-2.5 text-center">
                <div className="text-xl font-black text-main">
                  {referralStats.referred}
                </div>
                <div className="text-xs text-muted font-bold">REFERRED</div>
              </div>
               <div className="flex-1 rounded-xs bg-slate-100 p-2.5 text-center">
                <div className="text-xl font-black text-main">
                  {referralStats.earned}
                </div>
                <div className="text-xs text-muted font-bold">TOKENS EARNED</div>
              </div>
            </div>
          </>
        ) : (
           <div className="rounded-xs bg-slate-100 p-4 text-center">
            <div className="text-sm text-muted">
              No referral code yet. Generate emails to unlock!
            </div>
          </div>
        )}
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        className="card-premium mt-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="section-label">PROGRESS</div>
        <div className="mb-2.5 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min((profile?.total_emails_generated || 0) / 5 * 100, 100)}%`
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
             style={{ background: '#0f172a' }}
          />
        </div>
        <p className="text-sm text-sub">
          Generate 5 identities to unlock rewards. ({profile?.total_emails_generated || 0}/5)
        </p>
      </motion.div>

      {/* Account Info */}
      <motion.div
        className="card-premium mt-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="section-label">ACCOUNT INFO</div>
        <div className="flex flex-col gap-3.5">
          {[
            { label: 'User ID', value: user?.id?.substring(0, 16) + '...', mono: true },
            { label: 'Email', value: user?.email || 'OAuth User' },
            { label: 'Emails Generated', value: profile?.total_emails_generated || 0 },
            { label: 'Plan', value: profile?.plan || 'Free', badge: true },
          ].map(row => (
            <div
              key={row.label}
              className="flex justify-between items-center text-sm"
            >
              <span className="text-muted">{row.label}</span>
              {row.badge ? (
                <span
                   className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                 >
                  {row.value}
                </span>
              ) : (
                <span
                  className="font-bold"
                  style={{
                    fontFamily: row.mono ? 'var(--font-mono)' : 'inherit',
                    fontSize: row.mono ? '11px' : '13px'
                  }}
                >
                  {row.value}
                </span>
              )}
            </div>
          ))}
        </div>

        {profile?.is_admin && (
          <Button
            variant="primary"
            onClick={() => navigate('/admin')}
            className="w-full mt-5 flex items-center justify-center gap-2"
          >
            <Shield size={16} /> Admin Panel
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
