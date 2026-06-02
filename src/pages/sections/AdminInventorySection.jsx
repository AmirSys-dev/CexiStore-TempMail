import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Server, Database, Package, Trash2 } from 'lucide-react';
import FormInput from '../../components/FormInput';
import FormGroup from '../../components/FormGroup';
import CardLayout from '../../components/CardLayout';
import Button from '../../components/Button';

export default function AdminInventorySection({
  nodes,
  newNode,
  setNewNode,
  onAddNode,
  onDeleteNode,
  eggs,
  newEgg,
  setNewEgg,
  onAddEgg,
  onDeleteEgg,
  inventory,
  newInv,
  setNewInv,
  onAddInventory,
  onDeleteInventory
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      
      <CardLayout className="mb-4" header={<div className="flex items-center gap-2"><Server size={16} style={{ color: 'var(--text-main)' }} /> Pterodactyl Nodes</div>}>
        {/* Add Node Form */}
        <div className="flex gap-3 items-center flex-wrap mb-4">
          <FormGroup className="mb-0 flex-1 min-w-120">
            <FormInput
              type="text"
              placeholder="Node Name"
              value={newNode.name}
              onChange={(e) => setNewNode({...newNode, name: e.target.value})}
            />
          </FormGroup>
          <FormGroup className="mb-0 flex-1 min-w-140">
            <FormInput
              type="text"
              placeholder="FQDN (panel.x.com)"
              value={newNode.fqdn}
              onChange={(e) => setNewNode({...newNode, fqdn: e.target.value})}
            />
          </FormGroup>
          <FormGroup className="mb-0 flex-1 min-w-140">
            <FormInput
              type="text"
              placeholder="PLTA Key"
              value={newNode.plta_key}
              onChange={(e) => setNewNode({...newNode, plta_key: e.target.value})}
            />
          </FormGroup>
          <Button variant="primary" onClick={onAddNode} className="flex items-center gap-2 whitespace-nowrap">
            <Plus size={14} /> Add Node
          </Button>
        </div>

        {/* Nodes List */}
        <div className="flex flex-col gap-2">
          {nodes.length === 0 && (
            <div className="text-center py-5 text-muted text-xs">No nodes configured</div>
          )}
          {nodes.map(node => (
            <div key={node.id} className="p-3 bg-gray-bg rounded border border-gray-border flex items-center gap-3">
              <div className="flex-1">
                <div className="font-bold text-xs">{node.name}</div>
                <div className="text-xs text-muted">{node.fqdn}</div>
              </div>
              <span
                className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                style={{ color: '#059669', background: '#ecfdf5' }}
              >
                Online
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteNode(node.id)}
                style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 6px' }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      </CardLayout>

      
      <CardLayout className="mb-4" header={<div className="flex items-center gap-2"><Database size={16} style={{ color: 'var(--text-main)' }} /> Egg Templates</div>}>
        {/* Add Egg Form */}
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <FormGroup className="mb-0">
            <FormInput
              type="text"
              placeholder="Egg Name (e.g. Paper)"
              value={newEgg.name}
              onChange={(e) => setNewEgg({...newEgg, name: e.target.value})}
            />
          </FormGroup>
          <FormGroup className="mb-0">
            <FormInput
              type="text"
              placeholder="Description"
              value={newEgg.description}
              onChange={(e) => setNewEgg({...newEgg, description: e.target.value})}
            />
          </FormGroup>
          <FormGroup className="mb-0">
            <FormInput
              type="number"
              placeholder="Egg ID"
              value={newEgg.egg_id}
              onChange={(e) => setNewEgg({...newEgg, egg_id: e.target.value})}
            />
          </FormGroup>
          <FormGroup className="mb-0">
            <FormInput
              type="number"
              placeholder="Nest ID"
              value={newEgg.nest_id}
              onChange={(e) => setNewEgg({...newEgg, nest_id: e.target.value})}
            />
          </FormGroup>
        </div>
        <Button variant="primary" onClick={onAddEgg} className="w-full flex items-center justify-center gap-2 mb-4">
          <Plus size={14} /> Add Egg Template
        </Button>

        {/* Eggs Grid */}
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {eggs.length === 0 && (
            <div className="col-span-full text-center py-5 text-muted text-xs">No eggs configured</div>
          )}
          {eggs.map(egg => (
              <div
                key={egg.id}
                className="p-3 rounded flex items-center justify-between gap-2"
                style={{
                  border: '1px solid var(--gray-border)',
                  background: '#f8fafc'
                 }}
               >
              <div className="flex items-center gap-2">
                <div
                  style={{
                     width: '8px',
                     height: '8px',
                     borderRadius: '50%',
                     background: 'var(--text-sub)'
                  }}
                />
                <div>
                  <div className="text-xs font-bold text-main">{egg.name}</div>
                  <div className="text-xs text-muted">ID: {egg.egg_id} | Nest: {egg.nest_id}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteEgg(egg.id)}
                 style={{ background: 'transparent', color: '#dc2626', padding: '4px 6px' }}
               >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      </CardLayout>

      
      <CardLayout header={<div className="flex items-center gap-2"><Plus size={15} /> Add Premium Account Stock</div>}>
        {/* Add Inventory Form */}
        <div className="flex gap-3 items-center flex-wrap mb-4">
          <FormGroup className="mb-0">
            <select
              value={newInv.platform}
              onChange={(e) => setNewInv({...newInv, platform: e.target.value})}
              className="form-input"
              style={{ width: 'auto', minWidth: '120px' }}
            >
              <option value="canva">Canva Pro</option>
              <option value="alight">Alight Motion</option>
            </select>
          </FormGroup>
          <FormGroup className="mb-0 flex-1 min-w-150">
            <FormInput
              type="text"
              placeholder="Email"
              value={newInv.email}
              onChange={(e) => setNewInv({...newInv, email: e.target.value})}
            />
          </FormGroup>
          <FormGroup className="mb-0 flex-1 min-w-150">
            <FormInput
              type="text"
              placeholder="Password"
              value={newInv.password}
              onChange={(e) => setNewInv({...newInv, password: e.target.value})}
            />
          </FormGroup>
          <Button variant="primary" onClick={onAddInventory} className="flex items-center gap-2 whitespace-nowrap">
            <Plus size={14} /> Add Stock
          </Button>
        </div>

        {/* Inventory List */}
        <div className="flex flex-col gap-2">
          {inventory.length === 0 && (
            <div className="text-center py-10 text-muted">Inventory is empty</div>
          )}

          {inventory.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-4 flex items-center gap-4 flex-wrap"
            >
              {/* Platform Icon */}
              <div
                className="flex items-center justify-center rounded"
                  style={{
                    width: '36px',
                    height: '36px',
                    background: 'var(--gray-bg)',
                    borderRadius: '10px',
                    color: 'var(--text-main)'
                  }}
              >
                <Package size={16} />
              </div>

              {/* Inventory Info */}
              <div className="flex-1">
                <div className="font-bold text-sm">{inv.email}</div>
                <div className="text-xs text-muted flex gap-3 mt-1 flex-wrap">
                  <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{inv.platform}</span>
                  <span style={{ color: inv.status === 'available' ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                    {inv.status === 'available' ? 'Available' : 'Used'}
                  </span>
                  <span>Added: {new Date(inv.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Delete Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteInventory(inv.id)}
                style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 6px' }}
              >
                <Trash2 size={14} />
              </Button>
            </motion.div>
          ))}
        </div>
      </CardLayout>
    </motion.div>
  );
}
