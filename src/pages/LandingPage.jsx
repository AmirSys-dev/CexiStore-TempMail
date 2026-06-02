import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Mail, Shield, Server, Globe, Clock, Zap, Lock, Sparkles } from 'lucide-react';

function AnimSection({ children, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

const FEATURES = [
  { icon: Mail, title: 'Instant Temporary Email', desc: 'Create and use disposable email addresses immediately. No registration overhead.' },
  { icon: Shield, title: 'Privacy First', desc: 'Minimal logs and strong defaults designed to protect your identity.' },
  { icon: Server, title: 'Service Console', desc: 'Manage your accounts, tools, and tokens from a single dashboard.' },
  { icon: Globe, title: 'Global Domains', desc: 'Access multiple premium domains for better delivery and flexibility.' },
  { icon: Lock, title: 'Encrypted Inbox', desc: 'Your temporary inbox is secured and automatically expires.' },
  { icon: Zap, title: 'Lightning Fast', desc: 'Inboxes ready in under 2 seconds. Built for speed and reliability.' },
];

const STATS = [
  { value: '1M+', label: 'Emails Generated' },
  { value: '50K+', label: 'Active Users' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '30+', label: 'Premium Domains' },
];

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session));
  }, []);

  return (
    <div className="ios-page min-h-screen" style={{ background: 'var(--white)' }}>
      
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Gradient mesh background */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 90%, rgba(99,102,241,0.06) 0%, transparent 40%)',
        }} />
        <div style={{
          position: 'absolute', top: '-30%', right: '-10%', width: '500px', height: '500px', zIndex: 0,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1120px', margin: '0 auto', padding: '100px 24px 80px' }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ maxWidth: '760px' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '99px', background: 'var(--primary-light)', border: '1px solid var(--gray-border)', marginBottom: '20px' }}>
              <Sparkles size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px' }}>CEXISTORE PRIVACY CLOUD</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 56px)',
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: '-2px',
              marginBottom: '20px',
              color: 'var(--text-main)',
            }}>
              Temporary email{' '}
              <span style={{
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                that just works.
              </span>
            </h1>

            <p style={{ fontSize: '18px', color: 'var(--text-sub)', lineHeight: 1.7, marginBottom: '32px', maxWidth: '620px' }}>
              Create disposable inboxes instantly, protect your identity, and manage privacy tools — all in one sleek dashboard. No noise, no hassle.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <Link
                to={isLoggedIn ? '/app' : '/auth'}
                className="btn btn-primary btn-lg"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', fontSize: '15px', borderRadius: '14px' }}
              >
                {isLoggedIn ? 'Go to Console' : 'Start Free'} <ArrowRight size={18} />
              </Link>
              <Link
                to="/pricing"
                className="btn btn-secondary btn-lg"
                style={{ textDecoration: 'none', padding: '14px 28px', fontSize: '15px', borderRadius: '14px' }}
              >
                View Pricing
              </Link>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px' }}>
              {[
                { icon: Shield, text: 'No tracking logs' },
                { icon: Clock, text: 'Inbox in seconds' },
                { icon: Globe, text: 'Premium domains' },
              ].map(item => (
                <span key={item.text} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <item.icon size={14} style={{ color: 'var(--primary)' }} /> {item.text}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      
      <AnimSection>
        <section style={{
          borderTop: '1px solid var(--gray-border)',
          borderBottom: '1px solid var(--gray-border)',
          background: 'var(--gray-bg)',
        }}>
          <div style={{
            maxWidth: '1120px', margin: '0 auto', padding: '36px 24px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '24px', textAlign: 'center',
          }}>
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <p style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary)', marginBottom: '4px', letterSpacing: '-1px' }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </AnimSection>

      
      <section style={{ maxWidth: '1120px', margin: '0 auto', padding: '80px 24px' }}>
        <AnimSection>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '12px', color: 'var(--text-main)' }}>
              Everything you need
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-sub)', maxWidth: '480px', margin: '0 auto' }}>
              Privacy tools built for the modern web. Simple, fast, and reliable.
            </p>
          </div>
        </AnimSection>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {FEATURES.map((feature, i) => (
            <AnimSection key={feature.title} delay={i * 0.08}>
              <motion.article
                whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(99, 102, 241, 0.12)' }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '16px',
                  padding: '24px',
                  background: 'var(--white)',
                  border: '1px solid var(--gray-border)',
                  borderRadius: '16px',
                  cursor: 'default',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray-border)'}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'var(--primary-light)',
                  border: '1px solid var(--gray-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <feature.icon size={20} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-main)' }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-sub)', lineHeight: 1.6 }}>
                    {feature.desc}
                  </p>
                </div>
              </motion.article>
            </AnimSection>
          ))}
        </div>
      </section>

      
      <AnimSection>
        <section style={{
          maxWidth: '720px', margin: '0 auto', padding: '0 24px 100px', textAlign: 'center',
        }}>
          <div style={{
            padding: '48px 32px',
            borderRadius: '24px',
            background: 'var(--primary-light)',
            border: '1px solid var(--gray-border)',
          }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '12px', color: 'var(--text-main)' }}>
              Ready to get started?
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-sub)', marginBottom: '24px' }}>
              Sign in and start using your privacy tools in under a minute.
            </p>
            <Link
              to={isLoggedIn ? '/app' : '/auth'}
              className="btn btn-primary btn-lg"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', fontSize: '15px', borderRadius: '14px' }}
            >
              {isLoggedIn ? 'Open Console' : 'Create Free Account'} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </AnimSection>

      
      <footer style={{
        borderTop: '1px solid var(--gray-border)',
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
            © 2026 Cexistore. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link to="/terms" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>Terms</Link>
            <Link to="/legal" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>Privacy</Link>
            <Link to="/api-docs" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>API</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
