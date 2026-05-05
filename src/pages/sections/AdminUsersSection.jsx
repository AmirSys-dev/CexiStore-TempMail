import React from 'react';
import { motion } from 'framer-motion';
import { Search, Edit3, Save } from 'lucide-react';
import FormInput from '../../components/FormInput';
import FormGroup from '../../components/FormGroup';
import Button from '../../components/Button';

export default function AdminUsersSection({
  users,
  searchQuery,
  setSearchQuery,
  editingUser,
  setEditingUser,
  editTokens,
  setEditTokens,
  editPlan,
  setEditPlan,
  onUpdateUser
}) {
  const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      {/* Search Bar */}
      <div className="mb-4 relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <FormInput
          type="text"
          placeholder="Search users by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results Count */}
      <div className="text-xs text-muted font-semibold mb-3">{filteredUsers.length} users found</div>

      {/* Users List */}
      <div className="flex flex-col gap-2">
        {filteredUsers.length === 0 && (
          <div className="text-center py-10 text-muted">
            {users.length === 0 ? 'No users yet' : 'No users matching your search'}
          </div>
        )}

        {filteredUsers.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="card p-4 flex items-center gap-4 flex-wrap"
          >
            {/* Avatar */}
            <div
                className="flex items-center justify-center font-extrabold text-slate-900"
              style={{
                width: '36px',
                height: '36px',
                background: '#f1f5f9',
                borderRadius: '50%',
                fontSize: '14px'
              }}
            >
              {u.email?.[0]?.toUpperCase() || '?'}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-160">
              <div className="font-bold text-xs">{u.email}</div>
              <div className="text-xs text-muted flex gap-3 mt-1 flex-wrap">
                <span>Plan: <strong>{u.plan}</strong></span>
                <span>Tokens: <strong>{u.tokens}</strong></span>
                <span>Emails: <strong>{u.total_emails_generated || 0}</strong></span>
                {u.referral_code && <span>Ref: <strong>{u.referral_code}</strong></span>}
              </div>
            </div>

            {/* Edit/Save Controls */}
            {editingUser === u.id ? (
              <div className="flex gap-2 items-center flex-wrap">
                <FormGroup className="mb-0">
                  <FormInput
                    type="number"
                    placeholder="Tokens"
                    value={editTokens}
                    onChange={(e) => setEditTokens(e.target.value)}
                    style={{ width: '80px' }}
                  />
                </FormGroup>
                <FormGroup className="mb-0">
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    className="form-input"
                    style={{ width: 'auto' }}
                  >
                    {['Free', 'Standard', 'Pro', 'VVIP', 'Owner'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </FormGroup>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onUpdateUser(u.id)}
                  className="flex items-center gap-1"
                >
                  <Save size={12} /> Save
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingUser(u.id);
                  setEditTokens(u.tokens);
                  setEditPlan(u.plan);
                }}
                className="flex items-center gap-1"
              >
                <Edit3 size={12} /> Edit
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
