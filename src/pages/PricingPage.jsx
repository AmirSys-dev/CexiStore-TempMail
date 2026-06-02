import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Crown, Zap, Shield, CheckCircle, ArrowRight, Star,
  Copy, Smartphone, CreditCard, MessageCircle
} from 'lucide-react';

const WEB_API = window.location.origin + '/api/web';

const PLANS = [
  {
    id: 'standard', name: 'Standard', price: 'RM10', tokens: '100 Tokens',
    icon: Zap,
    features: ['100 email tokens', '2 domains', 'Basic inbox', 'Email support', '30 min TTL'],
  },
  {
    id: 'pro', name: 'Pro', price: 'RM25', tokens: '500 Tokens',
    icon: Crown, badge: 'POPULAR',
    features: ['500 email tokens', 'All domains', 'Priority inbox', 'Advanced tools', 'API access', 'WhatsApp support'],
  },
  {
    id: 'vvip', name: 'VVIP', price: 'RM50', tokens: 'Unlimited',
    icon: Star, badge: 'BEST VALUE',
    features: ['Unlimited tokens', 'All domains', 'Priority inbox', 'All premium tools', 'Unlimited API', 'Priority support', 'Custom domain'],
  },
];

const PAYMENT_METHODS = [
  { id: 'gopay', name: 'GoPay', icon: Smartphone, account: '6285-1413-08851', label: 'GoPay Number' },
  { id: 'tng', name: "Touch 'n Go", icon: CreditCard, account: '011-7134-1399', label: 'TNG Phone Number' },
];

function AnimSection({ children, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay }}>
      {children}
    </motion.div>
  );
}

export default function PricingPage() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setUser(session.user); });
  }, []);

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const handleSubmitOrder = async () => {
    if (!user || !selectedPlan || !selectedPayment || !paymentRef.trim()) {
      toast.error('Please fill in payment reference');
      return;
    }
    setSubmitting(true);
    try {
      const plan = PLANS.find(p => p.id === selectedPlan);
      const res = await fetch(`${WEB_API}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, plan: plan.name,
          userEmail: user.email,
          amount: parseFloat(plan.price.replace('RM', '')),
          paymentMethod: selectedPayment, paymentRef: paymentRef.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Order failed'); setSubmitting(false); return; }
      setStep(3);
      toast.success('Order submitted!');
      const msg = encodeURIComponent(
        `*CEXISTORE ORDER*\n\nPlan: ${plan.name} (${plan.price})\nPayment: ${selectedPayment.toUpperCase()}\nRef: ${paymentRef.trim()}\nEmail: ${user.email}\n\nPlease approve my order. Thank you!`
      );
      setTimeout(() => window.open(`https://wa.me/601171341399?text=${msg}`, '_blank'), 1500);
    } catch { toast.error('Network error'); }
    setSubmitting(false);
  };

  const sv = { enter: { opacity: 0, x: 50 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -50 } };

  return (
    <div className="ios-page min-h-screen bg-[var(--white)] text-main transition-colors px-5 pt-10 pb-20">
      <div className="max-w-3xl mx-auto px-5">
        <AnimSection>
          <div className="text-center mb-4">
            <h1 className="font-black text-main mb-3" style={{ fontSize: 'clamp(28px, 5vw, 42px)', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
              Choose a <span className="gradient-text">plan</span>
            </h1>
            <p className="text-sub text-sm max-w-md mx-auto">
              Upgrade to unlock more tokens, features, and priority support.
            </p>
          </div>
        </AnimSection>

        <div className="flex justify-center gap-2 my-7 items-center">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <motion.div
                animate={{ scale: step === s ? 1.15 : 1 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all`}
                style={step >= s ? { background: 'var(--gradient-primary)', color: '#fff', boxShadow: 'var(--shadow-sm)' } : { background: 'var(--gray-bg)', color: 'var(--text-muted)' }}
              >
                {s}
              </motion.div>
              {s < 3 && <div className={`w-10 h-0.5 transition-all rounded`} style={{ background: step > s ? 'var(--primary)' : 'var(--gray-border)' }} />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PLANS.map((plan, i) => {
                  const Icon = plan.icon;
                  const sel = selectedPlan === plan.id;
                  return (
                    <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }} whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`p-7 rounded-xl cursor-pointer transition-all relative overflow-hidden border-2`}
                      style={sel ? { borderColor: 'var(--primary)', background: 'var(--primary-light)', boxShadow: '0 0 0 3px var(--primary-glow)' } : { borderColor: 'var(--gray-border)', background: 'var(--white)' }}>
                      {plan.badge && (
                        <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '3px 10px', borderRadius: '99px', background: 'var(--primary-light)', border: '1px solid var(--gray-border)', fontSize: '10px', fontWeight: 800, color: 'var(--primary)' }}>{plan.badge}</div>
                      )}
                      <div className="flex items-center justify-center w-11 h-11 rounded-lg mb-4" style={{ background: 'var(--primary-light)', border: '1px solid var(--gray-border)' }}>
                        <Icon size={22} style={{ color: 'var(--primary)' }} />
                      </div>
                      <h3 className="text-lg font-black mb-1">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-4xl font-black" style={{ color: 'var(--primary)' }}>{plan.price}</span>
                        <span className="text-xs text-muted">/one-time</span>
                      </div>
                      <p className="text-xs text-sub mb-4 font-semibold">{plan.tokens}</p>
                      <div className="flex flex-col gap-2">
                        {plan.features.map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs text-sub">
                            <CheckCircle size={14} style={{ color: 'var(--primary)' }} className="flex-shrink-0" /> {f}
                          </div>
                        ))}
                      </div>
                      {sel && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}><CheckCircle size={14} color="#fff" /></motion.div>}
                    </motion.div>
                  );
                })}
              </div>
              <div className="text-center mt-7">
                <button className={`btn btn-primary inline-flex items-center gap-2 px-10 py-3.5 text-sm ${selectedPlan ? 'opacity-100' : 'opacity-50'}`} disabled={!selectedPlan} onClick={() => { if (!user) { toast.error('Please login first'); return; } if (selectedPlan) setStep(2); }}>
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-black mb-5 text-center">Payment Method</h2>
                <div className="flex flex-col gap-3 mb-6">
                  {PAYMENT_METHODS.map(pm => {
                    const Icon = pm.icon;
                    const sel = selectedPayment === pm.id;
                    return (
                      <motion.div key={pm.id} whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedPayment(pm.id)}
                        className={`p-5 rounded-md cursor-pointer transition-all border-2 ${
                          sel ? 'border-main bg-gray-bg' : 'border-gray-border bg-[var(--white)]'
                        }`}>
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-gray-bg border border-gray-border">
                            <Icon size={22} className="text-main" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-sm">{pm.name}</div>
                            <div className="text-xs text-muted">{pm.label}</div>
                          </div>
                          {sel && <CheckCircle size={20} className="text-main" />}
                        </div>
                        <AnimatePresence>
                          {sel && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                              className="mt-4 pt-4 border-t border-gray-border">
                              <div className="flex items-center justify-between p-4 bg-gray-bg rounded-md">
                                <div>
                                  <div className="text-xs text-muted font-semibold mb-1">TRANSFER TO</div>
                                  <div className="text-lg font-black font-mono tracking-wider">{pm.account}</div>
                                </div>
                                <button onClick={e => { e.stopPropagation(); copyText(pm.account.replace(/-/g, '')); }}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold bg-[var(--white)] border border-gray-border cursor-pointer text-main hover:bg-gray-bg transition-colors">
                                  <Copy size={14} /> Copy
                                </button>
                              </div>
                              <p className="text-xs text-muted mt-2.5 text-center">
                                Transfer <strong className="text-main">{PLANS.find(p => p.id === selectedPlan)?.price}</strong> then enter reference below
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>

                {selectedPayment && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
                    <label className="text-xs font-bold block mb-2">Payment Reference / Transaction ID</label>
                    <input className="input-style w-full p-3.5 rounded-md border border-gray-border bg-[var(--white)] text-main text-sm" type="text" placeholder="e.g. TNG-20260411-XXXXX" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} />
                  </motion.div>
                )}

                {selectedPlan && selectedPayment && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-5 bg-gray-bg border border-gray-border rounded-md mb-5">
                    <div className="text-xs font-bold mb-3">Order Summary</div>
                    {[['Plan', PLANS.find(p => p.id === selectedPlan)?.name], ['Tokens', PLANS.find(p => p.id === selectedPlan)?.tokens], ['Payment', PAYMENT_METHODS.find(p => p.id === selectedPayment)?.name]].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs mb-1.5">
                        <span className="text-sub">{k}</span><span className="font-bold">{v}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-border mt-2.5 pt-2.5 flex justify-between text-base">
                      <span className="font-black">Total</span>
                      <span className="font-black text-main">{PLANS.find(p => p.id === selectedPlan)?.price}</span>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-md border border-gray-border bg-[var(--white)] text-main font-bold text-sm cursor-pointer hover:bg-gray-bg transition-colors">Back</button>
                  <button className={`btn btn-primary flex-auto flex items-center justify-center gap-2 py-3.5 text-sm ${(!selectedPayment || !paymentRef.trim()) ? 'opacity-50' : 'opacity-100'}`} disabled={!selectedPayment || !paymentRef.trim() || submitting} onClick={handleSubmitOrder}>
                    {submitting ? 'Submitting...' : <><MessageCircle size={16} /> Submit & WhatsApp Admin</>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <div className="text-center mx-auto max-w-sm my-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                  <div className="w-18 h-18 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', width: '72px', height: '72px', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>
                    <CheckCircle size={36} color="#fff" />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-black mb-2.5">Order Submitted!</h2>
                <p className="text-sub text-sm leading-relaxed mb-6">
                  Pending admin approval. WhatsApp has been opened for confirmation.
                </p>
                <div className="p-4 bg-gray-bg rounded-md mb-5 text-xs">
                  <div className="text-muted mb-1">Admin Contact</div>
                  <div className="font-bold">WhatsApp: +60 11-7134 1399</div>
                  <div className="font-bold">Email: nbcgggh0@gmail.com</div>
                </div>
                <button className="btn btn-primary inline-flex items-center gap-2 py-3.5 px-8 text-sm" onClick={() => {
                  const plan = PLANS.find(p => p.id === selectedPlan);
                  const msg = encodeURIComponent(`*CEXISTORE ORDER*\n\nPlan: ${plan.name} (${plan.price})\nPayment: ${selectedPayment.toUpperCase()}\nRef: ${paymentRef}\nEmail: ${user?.email}\n\nPlease approve my order.`);
                  window.open(`https://wa.me/601171341399?text=${msg}`, '_blank');
                }}>
                  <MessageCircle size={16} /> Open WhatsApp Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimSection delay={0.2}>
          <div className="text-center mt-12 p-6 border-t border-gray-border">
            <p className="text-xs text-muted">
              Questions? Contact <strong>nbcgggh0@gmail.com</strong> or WhatsApp <strong>+60 11-7134 1399</strong>
            </p>
          </div>
        </AnimSection>
      </div>
    </div>
  );
}
