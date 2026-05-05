import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Copy, QrCode, RefreshCw, Plus, Trash2
} from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';

const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
};

export default function EmailSection({
  currentEmail,
  emailCreatedAt,
  timerText,
  timerPercent,
  showQR,
  onToggleQR,
  customName,
  onCustomNameChange,
  selectedDomain,
  onDomainChange,
  domains,
  isGenerating,
  generateSuccess,
  onProvision,
  onCopyToClipboard,
  copiedField,
  fakeIdentity,
  onGenerateFake,
  emailHistory,
  onSwitchEmail,
  onDeleteEmail
}) {
  return (
    <motion.div
      key="id"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="p-5"
    >
      {/* Active Identity Card */}
      <div className="identity-card mb-4 border border-slate-300 bg-slate-100 shadow-none">
        <div className="flex justify-between items-start">
          <div className="section-label opacity-40">ACTIVE IDENTITY</div>
          {emailCreatedAt && (
            <div
              className="timer-ring"
              style={{
                '--progress': `${timerPercent}%`,
                width: '42px',
                height: '42px'
              }}
            >
              <span
               className={`text-xs ${timerPercent < 20 ? 'text-red-600' : 'text-slate-800'}`}
              >
                  {timerText}
                </span>
              </div>
            )}
          </div>
        <div className="text-base font-bold font-mono break-all my-3 text-main">
          {currentEmail || 'No active email'}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            className="btn-gh justify-center border border-slate-300 bg-white text-xs text-slate-800"
            onClick={() => currentEmail && onCopyToClipboard(currentEmail, 'email')}
            aria-label="Copy email"
          >
            {copiedField === 'email' ? (
              <>
                <Check size={14} /> Copied!
              </>
            ) : (
              <>
                <Copy size={14} /> Copy
              </>
            )}
          </button>
          <button
            className={`btn-gh justify-center border border-slate-300 text-xs ${
              showQR ? 'bg-slate-900 text-slate-50' : 'bg-white text-slate-800'
            }`}
            onClick={onToggleQR}
            aria-label="Toggle QR code"
          >
            <QrCode size={14} /> QR Code
          </button>
        </div>

        {/* QR Code Display */}
        <AnimatePresence>
          {showQR && currentEmail && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-md bg-white p-4 text-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentEmail}`}
                  width="120"
                  alt="QR code for email"
                  className="rounded-lg"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generate New Email */}
      <motion.div
        className="card-premium"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="section-label">GENERATE NEW EMAIL</div>
        <div className="grid grid-cols-[1fr_110px] gap-2 mb-3">
          <FormInput
            type="text"
            placeholder="Custom alias (optional)"
            value={customName}
            onChange={e => onCustomNameChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onProvision()}
          />
          <select
            className="input-style text-xs font-bold p-3"
            value={selectedDomain}
            onChange={e => onDomainChange(e.target.value)}
            aria-label="Select email domain"
          >
            {domains.map(d => (
              <option key={d.domain} value={d.domain}>
                {d.domain.split('.')[0]}
              </option>
            ))}
          </select>
        </div>
          <Button
            variant="primary"
            onClick={onProvision}
            disabled={isGenerating}
            className={`w-full justify-center ${generateSuccess ? 'animate-success' : ''}`}
            style={{
              background: generateSuccess ? '#16a34a' : '#0f172a',
              borderColor: generateSuccess ? '#16a34a' : '#0f172a'
            }}
          >
          <span className="flex items-center justify-center gap-2">
            {generateSuccess ? (
              <>
                <Check size={18} /> Generated!
              </>
            ) : isGenerating ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.8,
                    ease: 'linear'
                  }}
                  className="inline-flex"
                >
                  <RefreshCw size={16} />
                </motion.span>
                Generating...
              </>
            ) : (
              <>
                <Plus size={16} /> Generate Email
              </>
            )}
          </span>
        </Button>
      </motion.div>

      {/* Virtual Persona */}
      {fakeIdentity && (
        <motion.div
          className="card-premium border-0 bg-slate-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-center mb-3.5">
            <div className="section-label mb-0">VIRTUAL PERSONA</div>
            <button
              className="btn-gh text-xs p-1.5 px-3"
              onClick={onGenerateFake}
              aria-label="Generate new persona"
            >
              <RefreshCw size={12} /> New
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { label: 'NAME', val: fakeIdentity.name },
              { label: 'PHONE', val: fakeIdentity.phone },
              { label: 'IC NUMBER', val: fakeIdentity.ic },
              { label: 'PASSWORD', val: fakeIdentity.pass, mono: true },
            ].map(f => (
              <button
                key={f.label}
                type="button"
                onClick={() => onCopyToClipboard(f.val, f.label)}
                className="cursor-pointer rounded-xs p-2.5 transition-colors hover:bg-slate-200 bg-none border-0 text-left"
                aria-label={`Copy ${f.label}`}
              >
                <div className="text-xs text-muted font-bold">{f.label}</div>
                <div
                  className="text-sm font-bold mt-0.5"
                  style={{ fontFamily: f.mono ? 'var(--font-mono)' : 'inherit' }}
                >
                  {f.val}
                </div>
              </button>
            ))}
          </div>
          <div className="text-xs text-muted mt-2.5 text-center">
            Tap any field to copy
          </div>
        </motion.div>
      )}

      {/* Email History */}
      {emailHistory.length > 0 && (
        <motion.div
          className="card-premium mt-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="section-label">RECENT EMAILS ({emailHistory.length})</div>
          <div className="flex flex-col gap-1.5">
            {emailHistory.slice(0, 5).map((em, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSwitchEmail(em)}
                  className={`flex flex-1 cursor-pointer items-center justify-between rounded-xs p-2.5 text-xs font-semibold font-mono transition-all ${
                    em === currentEmail
                      ? 'border border-slate-900 bg-white'
                      : 'border border-slate-300 bg-slate-100'
                  }`}
                  aria-pressed={em === currentEmail}
                >
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {em}
                  </span>
                  {em === currentEmail && <span className="live-dot" />}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEmail(em)}
                  className="flex-shrink-0 cursor-pointer border-0 bg-none p-1.5 text-slate-500"
                  aria-label="Delete email"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
