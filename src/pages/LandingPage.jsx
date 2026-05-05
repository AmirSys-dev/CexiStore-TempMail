import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowRight, Mail, Shield, Server, Globe, Clock } from 'lucide-react';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session));
  }, []);

  return (
    <div className="ios-page bg-white text-main min-h-screen">
      <main className="px-6" style={{ maxWidth: '1120px', margin: '0 auto', paddingTop: '80px', paddingBottom: '80px' }}>
        <section style={{ maxWidth: '720px' }}>
          <p className="text-sm font-bold tracking-wide text-sub mb-4">CEXISTORE PRIVACY CLOUD</p>
          <h1 className="font-black leading-tight tracking-tight mb-6" style={{ fontSize: '48px' }}>
            Temporary email and privacy tools that just work.
          </h1>
          <p className="text-lg text-sub leading-relaxed mb-6" style={{ maxWidth: '680px' }}>
            Create inboxes instantly, protect your identity, and manage services in one simple dashboard.
            No visual noise, no setup hassle.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Link
              to={isLoggedIn ? '/app' : '/auth'}
              className="btn btn-primary btn-lg inline-flex items-center gap-2 no-underline"
            >
              {isLoggedIn ? 'Go to Console' : 'Start Free'} <ArrowRight size={18} />
            </Link>
            <Link to="/pricing" className="btn btn-secondary btn-lg no-underline">
              View Pricing
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-sub">
            <span className="inline-flex items-center gap-2"><Shield size={14} /> No tracking logs</span>
            <span className="inline-flex items-center gap-2"><Clock size={14} /> Inbox ready in seconds</span>
            <span className="inline-flex items-center gap-2"><Globe size={14} /> Rotating premium domains</span>
          </div>
        </section>
      </main>

      <section className="bg-gray-bg" style={{ borderTop: '1px solid var(--gray-border)', borderBottom: '1px solid var(--gray-border)' }}>
        <div
          className="px-6 grid gap-8 text-center"
          style={{ maxWidth: '1120px', margin: '0 auto', paddingTop: '32px', paddingBottom: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
        >
          <div>
            <p className="text-3xl font-black text-main mb-1">1M+</p>
            <p className="text-sm text-sub">Emails generated</p>
          </div>
          <div>
            <p className="text-3xl font-black text-main mb-1">50K+</p>
            <p className="text-sm text-sub">Active users</p>
          </div>
          <div>
            <p className="text-3xl font-black text-main mb-1">99.9%</p>
            <p className="text-sm text-sub">Uptime</p>
          </div>
        </div>
      </section>

      <section className="px-6" style={{ maxWidth: '1120px', margin: '0 auto', paddingTop: '80px', paddingBottom: '80px' }}>
        <h2 className="text-3xl font-black tracking-tight mb-6">Core Features</h2>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {[
            { icon: Mail, title: 'Instant Temporary Email', desc: 'Create and use disposable addresses immediately.' },
            { icon: Shield, title: 'Privacy First', desc: 'Minimal logs and strong defaults for safer daily use.' },
            { icon: Server, title: 'Service Console', desc: 'Manage your account and tools from one clear dashboard.' },
            { icon: Globe, title: 'Global Domain Access', desc: 'Use multiple domains for better delivery and flexibility.' },
          ].map((feature) => (
            <article key={feature.title} className="card flex items-start gap-4">
              <div className="w-10 h-10 rounded-sm border border-main flex items-center justify-center bg-white">
                <feature.icon size={18} className="text-main" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-main mb-1">{feature.title}</h3>
                <p className="text-sm text-sub leading-relaxed">{feature.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 text-center" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '80px' }}>
        <h2 className="text-3xl font-black tracking-tight mb-4">Ready to get started?</h2>
        <p className="text-sub text-lg mb-6">Sign in and start using your privacy tools in under a minute.</p>
        <Link
          to={isLoggedIn ? '/app' : '/auth'}
          className="btn btn-primary btn-lg inline-flex items-center gap-2 no-underline"
        >
          {isLoggedIn ? 'Open Console' : 'Create Free Account'} <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
