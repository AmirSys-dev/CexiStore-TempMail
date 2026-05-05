import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MailOpen, RefreshCw } from 'lucide-react';
import Button from '../../components/Button';

const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
};

export default function InboxSection({
  inbox,
  currentEmail,
  isRefreshing,
  onRefreshInbox,
  onSelectEmail
}) {
  return (
    <motion.div
      key="in"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
      className="p-5"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-black">Inbox</h2>
          {inbox.length > 0 && (
            <span
              className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
            >
              {inbox.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefreshInbox}
          disabled={isRefreshing}
          aria-label="Refresh inbox"
        >
          <RefreshCw
            size={14}
            style={{
              animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none'
            }}
          />
          Refresh
        </Button>
      </div>

      {/* Current Email Display */}
      {currentEmail && (
        <div className="mb-4 flex items-center gap-2 rounded-sm bg-slate-100 p-2.5 text-xs font-semibold font-mono text-slate-600">
          <span className="live-dot" />
          {currentEmail}
        </div>
      )}

      {/* Empty State */}
      {inbox.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <MailOpen size={28} />
          </div>
          <div className="empty-state-title">No messages yet</div>
          <div className="empty-state-text">
            Emails sent to your address will appear here automatically. Auto-refreshes
            every 5 seconds.
          </div>
        </div>
      ) : (
        /* Email List */
        <div className="flex flex-col gap-2">
          {inbox.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelectEmail(m)}
              className="gh-card hover-lift mb-0 cursor-pointer"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-100">
                      <Mail size={14} className="text-slate-700" />
                    </div>
                    <div className="font-bold text-sm">
                      {m.sender?.split('@')[0] || 'Unknown'}
                    </div>
                  </div>
                  <div className="text-xs text-muted font-semibold whitespace-nowrap">
                    {new Date(m.received_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-sm text-main font-semibold ml-10">
                  {m.subject || '(no subject)'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
