import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { motion } from 'framer-motion';
import { Server, ArrowLeft, Mail, User, CheckCircle, Loader2, Zap, AlertCircle, Copy } from 'lucide-react';
import FormGroup from '../components/FormGroup';
import FormInput from '../components/FormInput';

const WEB_API = window.location.origin + '/api/web';

export default function HostingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  const [eggs, setEggs] = useState([]);

  const [form, setForm] = useState({
    email: '', username: '', node: '', allocation: 'default', egg: '', sendTo: '',
  });

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/auth'); return; }
      setUser(session.user);

      Promise.all([
        fetch(`${WEB_API}/profile?userId=${session.user.id}&email=${encodeURIComponent(session.user.email || '')}`).then(r => r.json()),
        fetch(`${WEB_API}/hosting/nodes`).then(r => r.json()),
        fetch(`${WEB_API}/hosting/eggs`).then(r => r.json())
      ]).then(([profRes, nodesRes, eggsRes]) => {
        if (profRes.success) {
          setProfile(profRes.profile);
          setForm(f => ({ ...f, email: session.user.email || '', sendTo: session.user.email || '' }));
        }
        if (nodesRes.success && nodesRes.nodes.length > 0) {
          setForm(f => ({ ...f, node: nodesRes.nodes[0].id }));
        }
        if (eggsRes.success) {
          setEggs(eggsRes.eggs);
        }
      }).finally(() => setLoading(false));
    });
  }, [navigate]);

  const updateField = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) validateField(key, val);
  };

  const markTouched = (field) => {
    setTouched(t => ({ ...t, [field]: true }));
  };

  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'email':
        if (!value.trim()) {
          newErrors.email = 'Panel email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Please enter a valid email';
        } else {
          delete newErrors.email;
        }
        break;
      case 'username':
        if (!value.trim()) {
          newErrors.username = 'Username is required';
        } else if (value.length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          newErrors.username = 'Only alphanumeric, underscore, and hyphen allowed';
        } else {
          delete newErrors.username;
        }
        break;
      case 'egg':
        if (!value) {
          newErrors.egg = 'Please select a server type';
        } else {
          delete newErrors.egg;
        }
        break;
      case 'sendTo':
        if (!value.trim()) {
          newErrors.sendTo = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.sendTo = 'Please enter a valid email';
        } else {
          delete newErrors.sendTo;
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return !newErrors[field];
  };

  const handleBlur = (field) => {
    markTouched(field);
    validateField(field, form[field]);
  };

  const handleSubmit = async () => {
    const fieldsToValidate = ['email', 'username', 'egg', 'sendTo'];
    let hasErrors = false;

    fieldsToValidate.forEach(field => {
      if (!validateField(field, form[field])) {
        hasErrors = true;
      }
      markTouched(field);
    });

    if (hasErrors) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if ((profile?.tokens || 0) < 5) {
      toast.error('Need at least 5 tokens for hosting');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${WEB_API}/ptero-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userEmail: user.email, ...form }),
      });
      const json = await res.json();
      if (json.success) {
        setOrderResult(json.order);
        setProfile(p => ({ ...p, tokens: (p?.tokens || 0) - 5 }));
        toast.success('Panel created! Credentials sent to your email.');
      } else {
        toast.error(json.error || 'Order failed');
      }
    } catch { toast.error('Network error'); }
    setSubmitting(false);
  };

  const copyText = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--white)]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="ios-page min-h-screen bg-[var(--white)] text-main">
      <div className="container-sm py-7.5 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <button
            onClick={() => navigate('/app')}
            className="btn btn-ghost btn-sm p-2 focus-visible-ring"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tight">Hosting Panel</h1>
            <p className="text-xs text-muted font-semibold">Pterodactyl game & app hosting</p>
          </div>
          <div className="bg-gray-bg rounded-md px-3 py-1.5 flex items-center gap-1.5">
            <Zap size={12} className="text-primary" />
            <span className="text-xs font-black">{profile?.tokens || 0}</span>
          </div>
        </div>

        {orderResult ? (
          /* Success State */
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle size={32} className="text-[var(--white)]" />
              </div>
              <h2 className="text-xl font-black mb-1">Panel Created!</h2>
              <p className="text-sm text-sub">
                Credentials have been sent to <strong>{orderResult.sentTo}</strong>
              </p>
            </div>

            {/* Credentials Box */}
            <div className="p-5 bg-gray-bg rounded-lg mb-4">
              {[
                ['Server ID', orderResult.serverId],
                ['Panel URL', 'panel.cexistore.com'],
                ['Email', orderResult.email],
                ['Username', orderResult.username],
                ['Password', orderResult.password],
                ['Node', orderResult.node],
                ['Egg', orderResult.egg],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-main last:border-0">
                  <span className="text-xs text-muted font-semibold">{label}</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-bold font-mono">{value}</code>
                    <button
                      onClick={() => copyText(value)}
                      aria-label={`Copy ${label}`}
                      className="p-0.5 text-muted hover:text-main transition-colors focus-visible-ring rounded-xs"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {!orderResult.emailSent && (
              <div className="p-3 bg-warning-bg text-warning rounded-md flex items-center gap-2 mb-4">
                <AlertCircle size={16} />
                <span className="text-xs font-semibold text-warning-text">Email delivery pending. Save your credentials above.</span>
              </div>
            )}

            <button
              className="btn btn-primary w-full flex items-center justify-center gap-2"
              onClick={() => { setOrderResult(null); setForm(f => ({ ...f, username: '', egg: '' })); }}
            >
              <Server size={16} /> Create Another Panel
            </button>
          </motion.div>
        ) : (
          /* Form State */
          <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}>
            {/* Info Card */}
            <div className="p-4 border border-gray-border bg-gray-bg rounded-lg mb-5">
              <div className="flex items-center gap-2.5 mb-2">
                <Server size={20} className="text-primary" />
                <span className="text-base font-black">Pterodactyl Panel</span>
              </div>
              <p className="text-xs text-sub leading-relaxed mb-2">
                Create your own game or application server. Credentials will be emailed to you. Cost: 5 tokens per panel.
              </p>
              {(profile?.tokens || 0) < 5 && (
                <div className="p-2.5 bg-error-bg text-error rounded-md flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span className="text-xs font-semibold text-error-text">Insufficient tokens. You need at least 5 tokens.</span>
                </div>
              )}
            </div>

            {/* Form */}
            <form className="stack-md" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <FormGroup
                label={<span className="flex items-center gap-1.5"><Mail size={14} className="text-muted" /> Panel Email</span>}
                error={touched.email ? errors.email : undefined}
                htmlFor="email"
                required
              >
                <FormInput
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  isInvalid={touched.email && !!errors.email}
                />
              </FormGroup>

              <FormGroup
                label={<span className="flex items-center gap-1.5"><User size={14} className="text-muted" /> Username</span>}
                error={touched.username ? errors.username : undefined}
                htmlFor="username"
                required
              >
                <FormInput
                  id="username"
                  type="text"
                  placeholder="e.g. myserver"
                  value={form.username}
                  onChange={e => updateField('username', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  onBlur={() => handleBlur('username')}
                  isInvalid={touched.username && !!errors.username}
                />
              </FormGroup>

              <FormGroup
                label="Server Type (Egg)"
                error={touched.egg ? errors.egg : undefined}
                htmlFor="egg"
                required
              >
                <select
                  id="egg"
                  value={form.egg}
                  onChange={e => updateField('egg', e.target.value)}
                  onBlur={() => handleBlur('egg')}
                  className={`form-input w-full ${touched.egg && errors.egg ? 'focus-visible-border' : 'focus-visible-ring'}`}
                  aria-invalid={touched.egg && !!errors.egg}
                >
                  <option value="">— Select server type —</option>
                  {eggs.map(egg => (
                    <option key={egg.id} value={egg.id}>{egg.name}</option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup
                label="Send Credentials To"
                error={touched.sendTo ? errors.sendTo : undefined}
                htmlFor="sendTo"
                required
              >
                <FormInput
                  id="sendTo"
                  type="email"
                  placeholder="credentials@email.com"
                  value={form.sendTo}
                  onChange={e => updateField('sendTo', e.target.value)}
                  onBlur={() => handleBlur('sendTo')}
                  isInvalid={touched.sendTo && !!errors.sendTo}
                />
              </FormGroup>

              <button
                type="submit"
                disabled={submitting || (profile?.tokens || 0) < 5}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating Panel...
                  </>
                ) : (
                  <>
                    <Server size={16} />
                    Create Panel ({profile?.tokens || 0} / 5 tokens)
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
