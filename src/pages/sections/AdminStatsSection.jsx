import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users, Package, Mail, DollarSign, Activity, Crown, Globe, Server, Database } from 'lucide-react';

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8'];

export default function AdminStatsSection({ stats, domains, pteroOrders, users }) {
  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers || 0, icon: Users, color: '#0f172a' },
    { label: 'Total Orders', value: stats.totalOrders || 0, icon: Package, color: '#334155' },
    { label: 'Emails Generated', value: stats.totalEmails || 0, icon: Mail, color: '#475569' },
    { label: 'Revenue', value: `RM${stats.revenue || 0}`, icon: DollarSign, color: '#64748b' },
  ] : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      {/* Primary Stats Cards Grid */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card p-6 gap-4"
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex items-center justify-center rounded"
                  style={{
                    width: '36px',
                    height: '36px',
                    background: `${s.color}12`,
                    borderRadius: '10px'
                  }}
                >
                  <Icon size={18} style={{ color: s.color }} />
                </div>
              </div>
              <div>
                <div className="text-4xl font-extrabold mb-1">{s.value}</div>
                <div className="text-xs text-muted font-semibold">{s.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* Area Chart - Emails Over Time */}
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold mb-4">
            <Activity size={15} style={{ color: 'var(--text-main)' }} />
            Emails Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats?.emailsByDay || []}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--gray-border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} tickLine={false} axisLine={false} dy={10} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip
                contentStyle={{ background: 'var(--white)', border: '1px solid var(--gray-border)', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}
                itemStyle={{ color: 'var(--text-main)', fontWeight: 900 }}
                 cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                 stroke="#0f172a"
                fill="url(#grad1)"
                strokeWidth={3}
                 activeDot={{ r: 5, fill: '#0f172a', stroke: 'var(--white)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Plan Distribution */}
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold mb-4">
            <Crown size={15} style={{ color: 'var(--text-main)' }} />
            Plan Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats?.planDistribution || []} cx="50%" cy="50%" outerRadius={75} innerRadius={50} dataKey="value" paddingAngle={5} stroke="none">
                {(stats?.planDistribution || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--white)', border: '1px solid var(--gray-border)', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}
                itemStyle={{ color: 'var(--text-main)', fontWeight: 900 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
            {(stats?.planDistribution || []).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs text-secondary">
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: COLORS[i % COLORS.length]
                  }}
                />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={14} style={{ color: 'var(--text-sub)' }} />
            <span className="text-xs font-bold">Active Domains</span>
          </div>
          <div className="text-3xl font-extrabold">{domains.filter(d => d.is_active).length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server size={14} style={{ color: 'var(--text-sub)' }} />
            <span className="text-xs font-bold">Hosting Orders</span>
          </div>
          <div className="text-3xl font-extrabold">{pteroOrders.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database size={14} style={{ color: 'var(--text-sub)' }} />
            <span className="text-xs font-bold">Total Tokens</span>
          </div>
          <div className="text-3xl font-extrabold">{users.reduce((a, u) => a + (u.tokens || 0), 0).toLocaleString()}</div>
        </div>
      </div>
    </motion.div>
  );
}
