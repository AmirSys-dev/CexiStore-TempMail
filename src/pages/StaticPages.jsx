import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function StaticPages({ type }) {
  const content = {
    terms: {
      title: 'Terms of Service',
      version: 'v6.0.2026',
      sections: [
        { id: '1.0', head: 'Acceptance of Terms', body: 'By using Cexistore, you agree to these terms and our basic usage rules.' },
        { id: '2.0', head: 'Service Availability', body: 'We aim for 99.9% uptime. Planned maintenance is announced in advance whenever possible.' },
        { id: '3.0', head: 'Usage Restrictions', body: 'You must not use the service for illegal activity, abuse, spam campaigns, or harmful attacks.' },
        { id: '4.0', head: 'Data Retention', body: 'Temporary email data is short-lived by design. We do not keep message content longer than necessary for service operation.' }
      ]
    },
    legal: {
      title: 'Legal & Compliance',
      version: 'v2.4.1',
      sections: [
        { id: 'A', head: 'Compliance', body: 'Cexistore follows applicable privacy and data-protection regulations in regions where we operate.' },
        { id: 'B', head: 'Liability Limitation', body: 'We provide the platform as-is and are not responsible for losses caused by misuse outside documented use cases.' }
      ]
    }
  };

  const page = content[type] || content.terms;

  return (
    <div className="page-wrapper ios-page">
      <div className="mx-auto px-6" style={{ maxWidth: '860px', paddingTop: '56px', paddingBottom: '80px' }}>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-sub no-underline mb-8 hover:text-main transition-colors focus-visible-ring rounded-xs px-1"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="mb-12">
          <h1 className="font-black tracking-tight mb-3 text-main" style={{ fontSize: '40px' }}>
            {page.title}
          </h1>
          <div className="flex gap-5 text-xs font-bold text-muted">
            <span>VERSION: {page.version}</span>
            <span>LAST UPDATED: APRIL 2026</span>
          </div>
        </div>

        <div className="stack-lg">
          {page.sections.map(s => (
            <div
              key={s.id}
              className="gap-4 pb-6 border-main"
              style={{ display: 'grid', gridTemplateColumns: '56px 1fr', borderBottom: '1px solid var(--gray-border)' }}
            >
              <div className="text-base font-black text-main">
                [{s.id}]
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-main">
                  {s.head}
                </h3>
                <p className="text-base text-sub leading-relaxed">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 bg-gray-bg border border-main rounded-sm text-center" style={{ marginTop: '56px' }}>
          <p className="text-base text-sub">
            Need help with legal requests?{' '}
            <a
              href="#"
              className="text-main font-bold hover:underline focus-visible-ring rounded-xs px-1"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
