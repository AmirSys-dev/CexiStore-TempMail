import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Zap, Mail, Save } from 'lucide-react';
import FormInput from '../../components/FormInput';
import FormGroup from '../../components/FormGroup';
import CardLayout from '../../components/CardLayout';
import Button from '../../components/Button';

export default function AdminSettingsSection({ sysConfig, setSysConfig, onSaveSettings }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex flex-col gap-4">
        {/* System Configuration */}
        <CardLayout header={<div className="flex items-center gap-2"><Settings size={15} /> System Configuration</div>}>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Default Tokens (new users)', key: 'defaultTokens', type: 'number' },
              { label: 'Email TTL (minutes)', key: 'maxEmailTTL', type: 'number' },
              { label: 'Rate Limit (requests/min)', key: 'rateLimit', type: 'number' },
            ].map(field => (
              <FormGroup key={field.key} label={field.label}>
                <FormInput
                  type={field.type}
                  value={sysConfig[field.key]}
                  onChange={(e) => setSysConfig(c => ({ ...c, [field.key]: e.target.value }))}
                  style={{ maxWidth: '200px' }}
                />
              </FormGroup>
            ))}

            {/* Maintenance Mode */}
            <FormGroup label="System Status">
              <label className="flex items-center gap-2 text-xs font-bold text-sub cursor-pointer">
                <input
                  type="checkbox"
                  checked={sysConfig.maintenanceMode}
                  onChange={(e) => setSysConfig(c => ({ ...c, maintenanceMode: e.target.checked }))}
                />
                Maintenance Mode
              </label>
              <p className="text-xs text-muted mt-2">When enabled, non-admin users see a maintenance page</p>
            </FormGroup>
          </div>

          <Button
            variant="primary"
            onClick={onSaveSettings}
            className="mt-6 flex items-center gap-2"
          >
            <Save size={14} /> Save Settings
          </Button>
        </CardLayout>

        {/* Token Pricing */}
        <CardLayout header={<div className="flex items-center gap-2"><Zap size={15} style={{ color: 'var(--text-main)' }} /> Token Pricing</div>}>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {[
               { plan: 'Standard', price: 'RM10', tokens: '100', color: 'var(--text-main)' },
               { plan: 'Pro', price: 'RM25', tokens: '500', color: 'var(--text-main)' },
               { plan: 'VVIP', price: 'RM50', tokens: 'Unlimited', color: 'var(--text-main)' },
            ].map(p => (
              <div
                key={p.plan}
                className="p-3 rounded border"
                style={{
                   borderColor: 'var(--gray-border)',
                   background: 'var(--gray-bg)'
                 }}
               >
                <div className="font-extrabold text-sm mb-1" style={{ color: p.color }}>
                  {p.plan}
                </div>
                <div className="text-xs text-sub">
                  {p.price} = {p.tokens} tokens
                </div>
              </div>
            ))}
          </div>
        </CardLayout>

        {/* Email Provider */}
         <CardLayout header={<div className="flex items-center gap-2"><Mail size={15} style={{ color: 'var(--text-main)' }} /> Email Provider</div>}>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs p-2 border-b border-gray-border">
              <span className="text-muted">Provider</span>
              <span className="font-bold">Resend</span>
            </div>
            <div className="flex justify-between text-xs p-2 border-b border-gray-border">
              <span className="text-muted">API Key</span>
              <span className="font-bold" style={{ fontFamily: 'var(--font-mono)' }}>re_Yu...PyTGJ</span>
            </div>
            <div className="flex justify-between text-xs p-2">
              <span className="text-muted">Status</span>
              <span className="font-bold text-success">Connected</span>
            </div>
          </div>
        </CardLayout>
      </div>
    </motion.div>
  );
}
