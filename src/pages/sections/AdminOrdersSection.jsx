import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import Button from '../../components/Button';

export default function AdminOrdersSection({ orders, onApproveOrder, onRejectOrder }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex flex-col gap-2">
        {orders.length === 0 && (
          <div className="text-center py-10 text-muted">No orders yet</div>
        )}

        {orders.map((order, i) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-4 flex items-center gap-4 flex-wrap"
          >
            {/* Order Info */}
            <div className="flex-1 min-w-200">
              <div className="font-bold text-sm">{order.user_email || 'Unknown'}</div>
              <div className="text-xs text-muted flex gap-3 mt-1 flex-wrap">
                <span><strong>Plan:</strong> {order.plan}</span>
                <span><strong>Amount:</strong> RM{order.amount}</span>
                <span><strong>Via:</strong> {order.payment_method?.toUpperCase()}</span>
                <span><strong>Ref:</strong> {order.payment_ref}</span>
              </div>
              <div className="text-xs text-muted mt-2 flex items-center gap-1">
                <Clock size={10} /> {new Date(order.created_at).toLocaleString()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {order.status === 'pending' ? (
                <>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => onApproveOrder(order.id)}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle size={14} /> Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onRejectOrder(order.id)}
                    className="flex items-center gap-2"
                  >
                    <XCircle size={14} /> Reject
                  </Button>
                </>
              ) : (
                <span
                  className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{
                    background: order.status === 'approved' ? '#10b98115' : '#ef444415',
                    color: order.status === 'approved' ? '#10b981' : '#ef4444'
                  }}
                >
                  {order.status?.toUpperCase()}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
