import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, ArrowUpRight } from 'lucide-react';
import Button from '../../components/Button';

const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
};

const SDK_CODE = {
  nodejs: `const cexi = require('cexi-sdk');\nconst client = new cexi.Client('YOUR_API_KEY');\n\n// Generate new email\nconst email = await client.provision();\nconsole.log(email.address);\n\n// Check inbox\nconst msgs = await client.inbox(email.address);`,
  python: `import cexi\n\nclient = cexi.Client('YOUR_API_KEY')\n\n# Generate new email\nemail = client.provision()\nprint(email.address)\n\n# Check inbox\nmsgs = client.inbox(email.address)`,
  go: `client := cexi.New("YOUR_API_KEY")\n\n// Generate new email\nemail, _ := client.Provision()\nfmt.Println(email.Address)\n\n// Check inbox\nmsgs, _ := client.Inbox(email.Address)`
};

export default function ApiSection({
  profile,
  copiedField,
  onCopyToClipboard
}) {
  const [sdkLang, setSdkLang] = useState('nodejs');

  return (
    <motion.div
      key="api"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
      className="p-5"
    >
      <h2 className="text-xl font-black mb-5">Developer API</h2>

      {/* Language Tabs */}
      <div className="flex gap-1.5 mb-4">
        {['nodejs', 'python', 'go'].map(lang => (
          <button
            key={lang}
            onClick={() => setSdkLang(lang)}
            className={`btn-gh flex-1 justify-center border text-[11px] uppercase ${
              sdkLang === lang
                ? 'border-slate-900 bg-slate-900 text-slate-50'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
            aria-label={`Select ${lang} SDK`}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Code Block */}
      <div className="relative mb-4">
        <pre className="overflow-x-auto rounded-md border border-slate-300 bg-slate-100 p-5 font-mono text-xs leading-relaxed text-slate-900">
          {SDK_CODE[sdkLang]}
        </pre>
        <button
          onClick={() => onCopyToClipboard(SDK_CODE[sdkLang], 'code')}
          className="absolute right-2.5 top-2.5 rounded border border-slate-300 bg-white p-1.5 text-slate-600"
          aria-label="Copy code"
        >
          {copiedField === 'code' ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {/* API Key Section */}
      <div className="card-premium mb-4">
        <div className="section-label">YOUR API KEY</div>
        <div className="flex justify-between items-center gap-2.5">
          <code className="text-xs font-semibold break-all text-sub flex-1 font-mono">
            {profile?.id}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => profile?.id && onCopyToClipboard(profile.id, 'apikey')}
            className="flex-shrink-0"
            aria-label="Copy API key"
          >
            {copiedField === 'apikey' ? (
              <>
                <Check size={12} /> Copied
              </>
            ) : (
              <>
                <Copy size={12} /> Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* API Docs Link */}
      <div className="mt-4 flex items-center gap-2 rounded-sm border border-slate-300 bg-slate-100 p-4 text-sm text-slate-600">
        <ArrowUpRight size={14} className="text-slate-800" />
        <span>
          View full{' '}
          <a href="/api-docs" className="font-bold text-main underline">
            API Documentation
          </a>
        </span>
      </div>
    </motion.div>
  );
}
