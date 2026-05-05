import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import CodeBlock from '../components/CodeBlock';
import {
  Terminal, Book, Zap, CheckCircle,
  AlertCircle, Clock, Globe, Key, Play, ArrowLeft, Shield, FileJson
} from 'lucide-react';

function Anim({ children, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

const ENDPOINTS = [
  {
    method: 'POST', path: '/api/web/provision', title: 'Generate Email',
    desc: 'Create a new disposable email address and deduct 1 token from user balance.',
    body: '{\n  "userId": "uuid-here",\n  "email": "myalias@amircexitech.com"\n}',
    response: '{\n  "success": true,\n  "profile": {\n    "id": "uuid",\n    "email": "user@gmail.com",\n    "tokens": 4,\n    "plan": "Free"\n  },\n  "email": "myalias@amircexitech.com"\n}',
    errors: [
      { code: 400, msg: 'Missing userId or email' },
      { code: 403, msg: 'Insufficient tokens' },
      { code: 409, msg: 'Email already exists' },
    ],
  },
  {
    method: 'GET', path: '/api/web/profile', title: 'Get Profile',
    desc: 'Retrieve user profile, available domains, active emails, and inbox for the last used email.',
    params: 'userId (required) — User UUID',
    response: '{\n  "success": true,\n  "profile": {\n    "id": "uuid",\n    "email": "user@gmail.com",\n    "tokens": 5,\n    "plan": "Free",\n    "total_emails_generated": 10\n  },\n  "domains": [\n    { "domain": "amircexitech.com" },\n    { "domain": "amirtech.my.id" }\n  ],\n  "emails": [\n    { "email": "test@amircexitech.com", "created_at": "..." }\n  ],\n  "inbox": []\n}',
  },
  {
    method: 'GET', path: '/api/web/inbox', title: 'Get Inbox',
    desc: 'Fetch all received emails for a specific disposable email address.',
    params: 'email (required) — The disposable email address',
    response: '{\n  "success": true,\n  "inbox": [\n    {\n      "id": "uuid",\n      "sender": "noreply@example.com",\n      "subject": "Your OTP Code",\n      "body": "Your code is 123456",\n      "received_at": "2026-04-11T10:00:00Z"\n    }\n  ]\n}',
  },
  {
    method: 'DELETE', path: '/api/web/email', title: 'Delete Email',
    desc: 'Remove an active disposable email address from the user account.',
    body: '{\n  "userId": "uuid-here",\n  "email": "myalias@amircexitech.com"\n}',
    response: '{\n  "success": true\n}',
  },
  {
    method: 'POST', path: '/api/web/order', title: 'Create Order',
    desc: 'Submit a new plan upgrade order. Payment must be completed via GoPay or TNG first.',
    body: '{\n  "userId": "uuid-here",\n  "plan": "Pro",\n  "amount": 25,\n  "paymentMethod": "tng",\n  "paymentRef": "TNG-20260411-12345"\n}',
    response: '{\n  "success": true\n}',
  },
];

const RATE_LIMITS = [
  { plan: 'Free', limit: '10 req/min', emails: '5 tokens', api: 'Limited' },
  { plan: 'Pro', limit: '60 req/min', emails: '500 tokens', api: 'Full access' },
  { plan: 'VVIP', limit: 'Unlimited', emails: 'Unlimited', api: 'Priority' },
];

const SDK = {
  nodejs: `const axios = require('axios');
const API_BASE = 'https://your-domain.com/api/web';

// Generate new email
const { data } = await axios.post(\`\${API_BASE}/provision\`, {
  userId: 'your-user-id',
  email: \`\${Date.now()}@amircexitech.com\`
});
console.log('Created:', data.email);
console.log('Tokens left:', data.profile.tokens);

// Check inbox
const inbox = await axios.get(\`\${API_BASE}/inbox\`, {
  params: { email: data.email }
});
inbox.data.inbox.forEach(msg => {
  console.log(\`From: \${msg.sender} — \${msg.subject}\`);
});`,
  python: `import requests

API_BASE = 'https://your-domain.com/api/web'

# Generate new email
resp = requests.post(f'{API_BASE}/provision', json={
    'userId': 'your-user-id',
    'email': f'test123@amircexitech.com'
})
data = resp.json()
print(f"Created: {data['email']}")
print(f"Tokens left: {data['profile']['tokens']}")

# Check inbox
inbox = requests.get(f'{API_BASE}/inbox', params={
    'email': data['email']
})
for msg in inbox.json()['inbox']:
    print(f"From: {msg['sender']} — {msg['subject']}")`,
  go: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    apiBase := "https://your-domain.com/api/web"

    // Generate new email
    body, _ := json.Marshal(map[string]string{
        "userId": "your-user-id",
        "email":  "test123@amircexitech.com",
    })
    resp, _ := http.Post(apiBase+"/provision",
        "application/json", bytes.NewBuffer(body))

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Println("Created:", result["email"])
}`,
};

const ERROR_CODES = [
  { code: '200', desc: 'Success', color: 'var(--success)' },
  { code: '400', desc: 'Bad Request — Missing or invalid parameters', color: 'var(--warning)' },
  { code: '403', desc: 'Forbidden — Insufficient tokens or not authorized', color: 'var(--danger)' },
  { code: '404', desc: 'Not Found — Resource does not exist', color: 'var(--danger)' },
  { code: '429', desc: 'Rate Limited — Too many requests', color: 'var(--warning)' },
  { code: '500', desc: 'Server Error — Internal server error', color: 'var(--danger)' },
];

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState('quickstart');
  const [sdkLang, setSdkLang] = useState('nodejs');
  const [tryEndpoint, setTryEndpoint] = useState(null);
  const [tryInput, setTryInput] = useState('');
  const [tryResult, setTryResult] = useState('');

  const sections = [
    { id: 'quickstart', label: 'Quick Start', icon: Zap },
    { id: 'auth', label: 'Authentication', icon: Key },
    { id: 'endpoints', label: 'Endpoints', icon: Globe },
    { id: 'sdk', label: 'SDK Examples', icon: Terminal },
    { id: 'ratelimits', label: 'Rate Limits', icon: Clock },
    { id: 'errors', label: 'Error Codes', icon: AlertCircle },
  ];

  const handleTry = async (ep) => {
    try {
      const url = window.location.origin + ep.path + (ep.method === 'GET' && tryInput ? `?${tryInput}` : '');
      const opts = ep.method === 'GET' ? {} : {
        method: ep.method, headers: { 'Content-Type': 'application/json' },
        body: tryInput || ep.body,
      };
      const res = await fetch(url, opts);
      const json = await res.json();
      setTryResult(JSON.stringify(json, null, 2));
    } catch (e) { setTryResult(`Error: ${e.message}`); }
  };

  return (
    <div className="ios-page min-h-screen bg-[var(--white)] text-text-main transition-colors">
      <div className="max-w-2xl mx-auto px-5 py-8 pb-20">
        {/* Back Link */}
        <Anim>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-text-muted no-underline text-xs font-bold mb-5 hover:text-text-sub transition-colors"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-gray-bg border border-gray-border rounded-md flex items-center justify-center">
              <Book size={22} className="text-main" />
            </div>
            <div>
              <h1 className="text-2xl font-black -tracking-wide">API Documentation</h1>
              <p className="text-xs text-text-muted">Cexistore REST API v1.0</p>
            </div>
          </div>
        </Anim>

        {/* Navigation */}
        <Anim delay={0.1}>
          <div className="flex gap-1.5 overflow-auto py-4 px-0 border-b border-gray-border mb-8">
            {sections.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSection(s.id);
                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`px-3.5 py-2 rounded-full border-none cursor-pointer whitespace-nowrap font-bold text-xs flex items-center gap-1.5 transition-all ${
                    activeSection === s.id
                      ? 'bg-main text-[var(--white)]'
                      : 'bg-gray-bg text-text-sub hover:bg-[var(--gray-border)]'
                  }`}
                >
                  <Icon size={13} /> {s.label}
                </button>
              );
            })}
          </div>
        </Anim>

        {/* Quick Start Section */}
        <section id="quickstart">
          <Anim>
            <h2 className="text-xl font-extrabold mb-3 flex items-center gap-2">
              <Zap size={18} className="text-main" /> Quick Start
            </h2>
            <p className="text-text-sub text-sm leading-relaxed mb-4">
              The Cexistore API lets you programmatically create disposable emails, check inboxes, and manage your account. All endpoints are REST-based and return JSON.
            </p>
            <div className="px-5 py-4 bg-gray-bg border border-gray-border rounded-md mb-6 text-sm flex items-center gap-2.5">
              <Globe size={16} className="text-main flex-shrink-0" />
              <div>
                <strong>Base URL:</strong>{' '}
                <code className="font-mono bg-[var(--white)] px-2 py-1 rounded border border-gray-border text-xs">
                  https://your-domain.com/api/web
                </code>
              </div>
            </div>
            <CodeBlock
              lang="bash"
              code={`# Generate a new email
curl -X POST https://your-domain.com/api/web/provision \\
  -H "Content-Type: application/json" \\
  -d '{"userId": "your-uuid", "email": "test@amircexitech.com"}'

# Check inbox
curl "https://your-domain.com/api/web/inbox?email=test@amircexitech.com"`}
            />
          </Anim>
        </section>

        {/* Authentication Section */}
        <section id="auth" className="mt-12">
          <Anim>
            <h2 className="text-xl font-extrabold mb-3 flex items-center gap-2">
              <Key size={18} className="text-warning" /> Authentication
            </h2>
            <p className="text-text-sub text-sm leading-relaxed mb-4">
              All API requests require a <code className="font-mono bg-gray-bg px-1 py-1 rounded text-xs">userId</code> parameter. This is the UUID from your Supabase auth session. The frontend obtains this automatically via <code className="font-mono bg-gray-bg px-1 py-1 rounded text-xs">supabase.auth.getSession()</code>.
            </p>
            <div className="px-5 py-3.5 bg-warning-light border border-warning border-opacity-30 rounded-md text-sm flex gap-2.5 text-warning-text">
              <Shield size={16} className="flex-shrink-0 mt-0.5" />
              <div>Keep your userId private. Never expose it in client-side code that is publicly accessible. Use server-side proxying for production applications.</div>
            </div>
          </Anim>
        </section>

        {/* Endpoints Section */}
        <section id="endpoints" className="mt-12">
          <Anim>
            <h2 className="text-xl font-extrabold mb-5 flex items-center gap-2">
              <Globe size={18} className="text-main" /> Endpoints
            </h2>
          </Anim>
          {ENDPOINTS.map((ep, i) => (
            <Anim key={ep.path + ep.method} delay={i * 0.05}>
              <EndpointCardCompact endpoint={ep} onTry={() => setTryEndpoint(tryEndpoint === ep.path ? null : ep.path)} />
              {tryEndpoint === ep.path && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 mb-4 pt-3 border-t border-gray-border">
                  <textarea
                    value={tryInput}
                    onChange={e => setTryInput(e.target.value)}
                    placeholder={ep.method === 'GET' ? 'userId=xxx' : ep.body}
                    className="w-full px-3 py-2-5 h-20 rounded-lg border border-gray-border font-mono text-xs resize-vertical bg-[var(--white)] text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-main"
                  />
                  <button
                    onClick={() => handleTry(ep)}
                    className="mt-2 btn btn-primary px-5 py-2 text-xs"
                  >
                    Send Request
                  </button>
                  {tryResult && <CodeBlock code={tryResult} />}
                </motion.div>
              )}
            </Anim>
          ))}
        </section>

        {/* SDK Section */}
        <section id="sdk" className="mt-12">
          <Anim>
            <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">
              <Terminal size={18} className="text-main" /> SDK Examples
            </h2>
            <div className="flex gap-1 mb-3 bg-gray-bg rounded-lg p-1 w-fit">
              {Object.keys(SDK).map(l => (
                <button
                  key={l}
                  onClick={() => setSdkLang(l)}
                    className={`px-3.5 py-1.5 rounded font-bold text-xs border-none cursor-pointer transition-all ${
                      sdkLang === l
                        ? 'bg-[var(--white)] text-main border border-gray-border'
                        : 'bg-transparent text-text-muted hover:text-text-sub'
                    }`}
                >
                  {l === 'nodejs' ? 'Node.js' : l === 'python' ? 'Python' : 'Go'}
                </button>
              ))}
            </div>
            <CodeBlock code={SDK[sdkLang]} lang={sdkLang} />
          </Anim>
        </section>

        {/* Rate Limits Section */}
        <section id="ratelimits" className="mt-12">
          <Anim>
            <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">
              <Clock size={18} className="text-danger" /> Rate Limits
            </h2>
            <div className="rounded-md border border-gray-border overflow-hidden">
              <div className="grid grid-cols-4 px-4 py-2-5 bg-gray-bg text-xs font-bold text-text-muted gap-4">
                <span>PLAN</span>
                <span>RATE LIMIT</span>
                <span>EMAILS</span>
                <span>API</span>
              </div>
              {RATE_LIMITS.map(r => (
                <div key={r.plan} className="grid grid-cols-4 px-4 py-3 border-t border-gray-border text-sm gap-4">
                  <span className="font-bold">{r.plan}</span>
                  <span className="text-text-sub">{r.limit}</span>
                  <span className="text-text-sub">{r.emails}</span>
                  <span className="text-text-sub">{r.api}</span>
                </div>
              ))}
            </div>
          </Anim>
        </section>

        {/* Error Codes Section */}
        <section id="errors" className="mt-12">
          <Anim>
            <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-danger" /> Error Codes
            </h2>
            <div className="rounded-md border border-gray-border overflow-hidden">
              {ERROR_CODES.map(e => (
                <div
                  key={e.code}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-border text-sm last:border-b-0"
                >
                  <span className="font-mono font-extrabold text-sm" style={{ color: e.color }}>
                    {e.code}
                  </span>
                  <span className="text-text-sub">{e.desc}</span>
                </div>
              ))}
            </div>
          </Anim>
        </section>

        {/* Changelog Section */}
        <section className="mt-12">
          <Anim>
            <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">
              <FileJson size={18} className="text-main" /> Changelog
            </h2>
            <div className="flex flex-col gap-3">
              {[
                { ver: 'v1.2', date: '2026-04-11', changes: ['Added order API endpoint', 'Admin dashboard API', 'Rate limiting & spam protection'] },
                { ver: 'v1.1', date: '2026-04-10', changes: ['Backend API migration (bypass RLS)', 'Auto-profile creation on signup', 'Token deduction fix'] },
                { ver: 'v1.0', date: '2026-03-08', changes: ['Initial release', 'Email provisioning', 'Inbox & profile endpoints'] },
              ].map(c => (
                <div key={c.ver} className="px-5 py-4 rounded-md border border-gray-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-extrabold text-base">{c.ver}</span>
                    <span className="text-xs text-text-muted">{c.date}</span>
                  </div>
                  {c.changes.map(ch => (
                    <div key={ch} className="flex items-center gap-2 text-sm text-text-sub mb-1">
                      <CheckCircle size={12} className="text-success flex-shrink-0" /> {ch}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Anim>
        </section>
      </div>
    </div>
  );
}

// Compact inline endpoint card (without the try functionality)
function EndpointCardCompact({ endpoint, onTry }) {
  return (
    <div className="mb-5 border border-gray-border rounded-md overflow-hidden hover:border-gray-300 transition-colors">
      <div className="px-5 py-3 bg-gray-bg flex items-center gap-3 flex-wrap">
        <span className="px-2 py-1 text-[10px] font-bold rounded border border-gray-border bg-[var(--white)] text-main">
          {endpoint.method}
        </span>
        <code className="font-mono text-sm font-bold">{endpoint.path}</code>
        <span className="text-sm text-text-muted ml-auto">{endpoint.title}</span>
      </div>

      <div className="px-5 py-4">
        <p className="text-sm text-text-sub leading-relaxed mb-3">{endpoint.desc}</p>

        {endpoint.params && (
          <div className="mb-3">
            <div className="text-xs font-bold mb-2 text-text-muted uppercase tracking-wide">Parameters</div>
            <code className="text-xs font-mono text-text-sub bg-gray-bg px-3 py-2 rounded block">{endpoint.params}</code>
          </div>
        )}

        {endpoint.body && (
          <div className="mb-3">
            <div className="text-xs font-bold mb-2 text-text-muted uppercase tracking-wide">Request Body</div>
            <CodeBlock code={endpoint.body} lang="json" />
          </div>
        )}

        <div className="mb-3">
          <div className="text-xs font-bold mb-2 text-text-muted uppercase tracking-wide">Response</div>
          <CodeBlock code={endpoint.response} lang="json" />
        </div>

        {endpoint.errors && (
          <div className="mb-3">
            <div className="text-xs font-bold mb-2 text-text-muted uppercase tracking-wide">Error Codes</div>
            <div className="space-y-1">
              {endpoint.errors.map(e => (
                <div key={e.code} className="text-xs text-text-sub flex gap-2">
                  <span className="font-bold font-mono text-danger">{e.code}</span>
                  <span>{e.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onTry} className="mt-3 px-4 py-2 bg-gray-bg hover:bg-gray-200 border border-gray-border rounded-lg cursor-pointer flex items-center gap-2 font-bold text-xs text-main transition-colors">
          <Play size={12} /> Try It
        </button>
      </div>
    </div>
  );
}
