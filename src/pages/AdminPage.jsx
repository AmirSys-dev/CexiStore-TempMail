import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, BarChart3, Package, Users, Globe, Server, Database, Settings, Lock, RefreshCw } from 'lucide-react';
import AdminStatsSection from './sections/AdminStatsSection';
import AdminOrdersSection from './sections/AdminOrdersSection';
import AdminUsersSection from './sections/AdminUsersSection';
import AdminDomainsSection from './sections/AdminDomainsSection';
import AdminInventorySection from './sections/AdminInventorySection';
import AdminSettingsSection from './sections/AdminSettingsSection';
import TabNav from '../components/TabNav';
import Button from '../components/Button';

const WEB_API = window.location.origin + '/api/web';

export default function AdminPage() {
  const navigate = useNavigate();
  const toast = useToast();

  // Auth State
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // UI State
  const [tab, setTab] = useState('overview');

  // Data State
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [pteroOrders, setPteroOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [eggs, setEggs] = useState([]);

  // User Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editTokens, setEditTokens] = useState('');
  const [editPlan, setEditPlan] = useState('');

  // Domain Form State
  const [newDomain, setNewDomain] = useState('');
  const [newDomainPremium, setNewDomainPremium] = useState(false);

  // Hosting Form State
  const [newNode, setNewNode] = useState({ name: '', fqdn: '', memory: 2048, disk: 10240, plta_key: '' });
  const [newEgg, setNewEgg] = useState({ name: '', description: '', egg_id: '', nest_id: '', color: '#6b7280' });

  // Inventory Form State
  const [newInv, setNewInv] = useState({ platform: 'canva', email: '', password: '' });

  // Settings State
  const [sysConfig, setSysConfig] = useState({
    defaultTokens: 5,
    maxEmailTTL: 30,
    rateLimit: 10,
    maintenanceMode: false,
  });

  // Fetch admin data
  const fetchAdmin = useCallback(async (userId, options = {}) => {
    const { silent = false } = options;
    try {
      const statsRes = await fetch(`${WEB_API}/admin/stats?adminId=${encodeURIComponent(userId)}`);
      const statsJson = await statsRes.json();
      if (!statsJson.success) throw new Error(statsJson.error || 'Failed to fetch admin data');

      const allUsers = statsJson.users || [];
      const allDomains = statsJson.domains || [];
      const allOrders = statsJson.orders || [];
      const allInventory = statsJson.inventory || [];
      const allNodes = statsJson.nodes || [];
      const allEggs = statsJson.eggs || [];

      const totalEmailsFromProfiles = allUsers.reduce((sum, u) => sum + (u.total_emails_generated || 0), 0);
      const totalRevenue = allUsers.reduce((sum, u) => {
        if (u.plan === 'Standard') return sum + 10;
        if (u.plan === 'Pro') return sum + 25;
        if (u.plan === 'VVIP') return sum + 50;
        if (u.plan === 'Owner') return sum + 100;
        return sum;
      }, 0);

      const planCounts = {};
      allUsers.forEach(u => {
        const plan = u.plan || 'Free';
        planCounts[plan] = (planCounts[plan] || 0) + 1;
      });
      const planDistribution = Object.entries(planCounts).map(([name, value]) => ({ name, value }));

      const dayMap = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        dayMap[key] = 0;
      }
      allUsers.forEach(u => {
        if (u.created_at) {
          const d = new Date(u.created_at);
          const key = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
          if (dayMap[key] !== undefined) dayMap[key] += (u.total_emails_generated || 0);
        }
      });
      const emailsByDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

      setStats({
        totalUsers: allUsers.length,
        totalOrders: allOrders.length,
        totalEmails: totalEmailsFromProfiles,
        revenue: totalRevenue,
        planDistribution,
        emailsByDay,
      });

      setUsers(allUsers);
      setOrders(allOrders);
      setDomains(allDomains);
      setPteroOrders(allOrders.filter(o => o.type === 'hosting'));
      setInventory(allInventory);
      setNodes(allNodes);
      setEggs(allEggs);

      if (!silent) toast.success('Data refreshed');
    } catch (err) {
      if (!silent) toast.error(err.message);
    }
  }, [toast]);

  // Initialize auth
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/auth');
          return;
        }
        setUser(session.user);

        const { data } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
        if (data?.is_admin) {
          setIsAdmin(true);
          await fetchAdmin(session.user.id, { silent: true });
        }
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, fetchAdmin]);

  // Domain handlers
  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    try {
      const res = await fetch(`${WEB_API}/admin/add-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, domain: newDomain, isPremium: newDomainPremium }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to add domain');
        return;
      }
      setNewDomain('');
      setNewDomainPremium(false);
      toast.success('Domain added!');
      await fetchAdmin(user.id, { silent: true });
    } catch {
      toast.error('Failed to add domain');
    }
  };

  const handleToggleDomain = async (domainId, isActive) => {
    try {
      const res = await fetch(`${WEB_API}/admin/toggle-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, domainId, isActive: !isActive }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to update domain');
        return;
      }
      await fetchAdmin(user.id, { silent: true });
    } catch {
      toast.error('Failed to update domain');
    }
  };

  const handleDeleteDomain = async (domainId) => {
    try {
      const res = await fetch(`${WEB_API}/admin/delete-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, domainId }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to delete domain');
        return;
      }
      await fetchAdmin(user.id, { silent: true });
    } catch {
      toast.error('Failed to delete domain');
    }
  };

  // Inventory handlers
  const handleAddInventory = async () => {
    if (!newInv.email || !newInv.password) return;
    try {
      const res = await fetch(`${WEB_API}/admin/add-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, ...newInv }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to add account');
        return;
      }
      setNewInv({ platform: 'canva', email: '', password: '' });
      toast.success('Account added!');
      await fetchAdmin(user.id, { silent: true });
    } catch {
      toast.error('Failed to add account');
    }
  };

  const handleDeleteInventory = async (invId) => {
    try {
      const res = await fetch(`${WEB_API}/admin/delete-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, invId }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to delete account');
        return;
      }
      await fetchAdmin(user.id, { silent: true });
    } catch {
      toast.error('Failed to delete account');
    }
  };

  // Node handlers
  const handleAddNode = async () => {
    if (!newNode.name || !newNode.fqdn || !newNode.plta_key) return;
    try {
      const res = await fetch(`${WEB_API}/admin/add-node`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, ...newNode }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to add node');
        return;
      }
      setNewNode({ name: '', fqdn: '', memory: 2048, disk: 10240, plta_key: '' });
      toast.success('Node added!');
      await fetchAdmin(user.id, { silent: true });
    } catch {
      toast.error('Failed to add node');
    }
  };

  const handleDeleteNode = async (nodeId) => {
    try {
      const res = await fetch(`${WEB_API}/admin/delete-node`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, nodeId }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to delete node');
        return;
      }
      await fetchAdmin(user.id, { silent: true });
    } catch {
      toast.error('Failed to delete node');
    }
  };

  // Egg handlers
  const handleAddEgg = async () => {
    if (!newEgg.name || !newEgg.egg_id || !newEgg.nest_id) return;
    try {
      const res = await fetch(`${WEB_API}/admin/add-egg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, ...newEgg }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to add egg');
        return;
      }
      setNewEgg({ name: '', description: '', egg_id: '', nest_id: '', color: '#6b7280' });
      toast.success('Egg added!');
      await fetchAdmin(user.id, { silent: true });
    } catch {
      toast.error('Failed to add egg');
    }
  };

  const handleDeleteEgg = async (eggId) => {
    try {
      const res = await fetch(`${WEB_API}/admin/delete-egg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, eggId }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to delete egg');
        return;
      }
      await fetchAdmin(user.id, { silent: true });
    } catch {
      toast.error('Failed to delete egg');
    }
  };

  // Order handlers
  const handleOrder = async (orderId, action) => {
    try {
      const res = await fetch(`${WEB_API}/admin/approve-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, adminId: user.id, action }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Order ${action}d!`);
        await fetchAdmin(user.id, { silent: true });
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error('Failed');
    }
  };

  // User handlers
  const handleUpdateUser = async (userId) => {
    try {
      const res = await fetch(`${WEB_API}/admin/update-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, targetUserId: userId, tokens: parseInt(editTokens), plan: editPlan }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('User updated!');
        setEditingUser(null);
        await fetchAdmin(user.id, { silent: true });
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error('Failed');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="spinner" />
      </div>
    );
  }

  // Access denied state
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-900">
        <div
          className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200"
        >
          <Lock size={28} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-extrabold mb-2">Access Denied</h2>
        <p className="text-sub text-xs">Admin privileges required.</p>
      </div>
    );
  }

  // Tab definitions
  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'domains', label: 'Domains', icon: Globe },
    { id: 'hosting', label: 'Hosting', icon: Server },
    { id: 'inventory', label: 'Inventory', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="ios-page min-h-screen bg-slate-50 text-slate-900">
      <div className="container mx-auto px-5 py-8 pb-20">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-100">
              <Shield size={20} className="text-slate-700" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold" style={{ letterSpacing: '-0.5px' }}>
                Admin Dashboard
              </h1>
                <p className="text-xs text-slate-500">Manage users, orders, domains, hosting & system</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchAdmin(user.id)}
              className="p-2"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <TabNav
          tabs={TABS}
          activeTab={tab}
          onTabChange={setTab}
          className="mb-6"
          idPrefix="admin"
        />

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <section
            id="admin-overview-panel"
            role="tabpanel"
            aria-labelledby="admin-overview-tab"
            hidden={tab !== 'overview'}
            tabIndex={0}
          >
            {tab === 'overview' && (
              <AdminStatsSection
                key="overview"
                stats={stats}
                domains={domains}
                pteroOrders={pteroOrders}
                users={users}
              />
            )}
          </section>

          <section
            id="admin-orders-panel"
            role="tabpanel"
            aria-labelledby="admin-orders-tab"
            hidden={tab !== 'orders'}
            tabIndex={0}
          >
            {tab === 'orders' && (
              <AdminOrdersSection
                key="orders"
                orders={orders}
                onApproveOrder={(id) => handleOrder(id, 'approve')}
                onRejectOrder={(id) => handleOrder(id, 'reject')}
              />
            )}
          </section>

          <section
            id="admin-users-panel"
            role="tabpanel"
            aria-labelledby="admin-users-tab"
            hidden={tab !== 'users'}
            tabIndex={0}
          >
            {tab === 'users' && (
              <AdminUsersSection
                key="users"
                users={users}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                editingUser={editingUser}
                setEditingUser={setEditingUser}
                editTokens={editTokens}
                setEditTokens={setEditTokens}
                editPlan={editPlan}
                setEditPlan={setEditPlan}
                onUpdateUser={handleUpdateUser}
              />
            )}
          </section>

          <section
            id="admin-domains-panel"
            role="tabpanel"
            aria-labelledby="admin-domains-tab"
            hidden={tab !== 'domains'}
            tabIndex={0}
          >
            {tab === 'domains' && (
              <AdminDomainsSection
                key="domains"
                domains={domains}
                newDomain={newDomain}
                setNewDomain={setNewDomain}
                newDomainPremium={newDomainPremium}
                setNewDomainPremium={setNewDomainPremium}
                onAddDomain={handleAddDomain}
                onToggleDomain={handleToggleDomain}
                onDeleteDomain={handleDeleteDomain}
              />
            )}
          </section>

          <section
            id="admin-hosting-panel"
            role="tabpanel"
            aria-labelledby="admin-hosting-tab"
            hidden={tab !== 'hosting'}
            tabIndex={0}
          >
            {tab === 'hosting' && (
              <AdminInventorySection
                key="hosting"
                nodes={nodes}
                newNode={newNode}
                setNewNode={setNewNode}
                onAddNode={handleAddNode}
                onDeleteNode={handleDeleteNode}
                eggs={eggs}
                newEgg={newEgg}
                setNewEgg={setNewEgg}
                onAddEgg={handleAddEgg}
                onDeleteEgg={handleDeleteEgg}
                inventory={inventory}
                newInv={newInv}
                setNewInv={setNewInv}
                onAddInventory={handleAddInventory}
                onDeleteInventory={handleDeleteInventory}
              />
            )}
          </section>

          <section
            id="admin-inventory-panel"
            role="tabpanel"
            aria-labelledby="admin-inventory-tab"
            hidden={tab !== 'inventory'}
            tabIndex={0}
          >
            {tab === 'inventory' && (
              <AdminInventorySection
                key="inventory"
                nodes={nodes}
                newNode={newNode}
                setNewNode={setNewNode}
                onAddNode={handleAddNode}
                onDeleteNode={handleDeleteNode}
                eggs={eggs}
                newEgg={newEgg}
                setNewEgg={setNewEgg}
                onAddEgg={handleAddEgg}
                onDeleteEgg={handleDeleteEgg}
                inventory={inventory}
                newInv={newInv}
                setNewInv={setNewInv}
                onAddInventory={handleAddInventory}
                onDeleteInventory={handleDeleteInventory}
              />
            )}
          </section>

          <section
            id="admin-settings-panel"
            role="tabpanel"
            aria-labelledby="admin-settings-tab"
            hidden={tab !== 'settings'}
            tabIndex={0}
          >
            {tab === 'settings' && (
              <AdminSettingsSection
                key="settings"
                sysConfig={sysConfig}
                setSysConfig={setSysConfig}
                onSaveSettings={() => toast.success('Settings saved (local only)')}
              />
            )}
          </section>
        </AnimatePresence>
      </div>
    </div>
  );
}
