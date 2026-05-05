import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Globe, Trash2 } from 'lucide-react';
import FormInput from '../../components/FormInput';
import FormGroup from '../../components/FormGroup';
import CardLayout from '../../components/CardLayout';
import Button from '../../components/Button';

export default function AdminDomainsSection({
  domains,
  newDomain,
  setNewDomain,
  newDomainPremium,
  setNewDomainPremium,
  onAddDomain,
  onToggleDomain,
  onDeleteDomain
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      {/* Add Domain Form */}
      <CardLayout className="mb-4" header={<div className="flex items-center gap-2"><Plus size={15} /> Add Domain</div>}>
        <div className="flex gap-3 items-center flex-wrap">
          <FormGroup className="mb-0 flex-1 min-w-200">
            <FormInput
              type="text"
              placeholder="e.g. example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
          </FormGroup>
          <label className="flex items-center gap-2 text-xs font-bold text-sub cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={newDomainPremium}
              onChange={(e) => setNewDomainPremium(e.target.checked)}
            />
            Premium Only
          </label>
          <Button variant="primary" size="md" onClick={onAddDomain} className="flex items-center gap-2 whitespace-nowrap">
            <Plus size={14} /> Add
          </Button>
        </div>
      </CardLayout>

      {/* Domains List */}
      <div className="flex flex-col gap-2">
        {domains.length === 0 && (
          <div className="text-center py-10 text-muted">No domains configured</div>
        )}

        {domains.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-4 flex items-center gap-4 flex-wrap"
          >
            {/* Domain Icon */}
            <div
              className="flex items-center justify-center rounded"
              style={{
                width: '36px',
                height: '36px',
                background: d.is_active ? '#ecfdf5' : '#f1f5f9',
                color: d.is_active ? '#059669' : '#64748b',
                borderRadius: '10px'
              }}
            >
              <Globe size={16} />
            </div>

            {/* Domain Info */}
            <div className="flex-1">
              <div className="font-bold text-sm">{d.domain}</div>
              <div className="text-xs text-muted flex gap-3 mt-1 flex-wrap">
                <span style={{ color: d.is_active ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                  {d.is_active ? 'Active' : 'Inactive'}
                </span>
                {d.is_premium && <span style={{ color: '#f59e0b', fontWeight: 700 }}>Premium</span>}
                <span>Created: {new Date(d.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant={d.is_active ? 'danger' : 'success'}
                size="sm"
                onClick={() => onToggleDomain(d.id, d.is_active)}
              >
                {d.is_active ? 'Disable' : 'Enable'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteDomain(d.id)}
                className="text-danger p-2"
                style={{ background: '#fef2f2' }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
