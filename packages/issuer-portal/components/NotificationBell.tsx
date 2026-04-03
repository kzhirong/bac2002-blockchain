'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import type { Notification } from '../lib/types';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  const markRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    const supabase    = createClient();
    const unreadIds   = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        style={bellBtn}
        title="Notifications"
        aria-label="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={badge}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={dropdown}>
          <div style={dropdownHeader}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={markAllBtn}>Mark all read</button>
            )}
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p style={{ padding: '1.25rem 1rem', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
                No notifications
              </p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: n.is_read ? 'white' : '#eff6ff',
                  }}
                >
                  {!n.is_read && (
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#2563eb', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                  )}
                  <span style={{ fontSize: '0.8rem', color: '#374151', lineHeight: 1.5 }}>{n.message}</span>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const bellBtn: React.CSSProperties = {
  position: 'relative',
  background: 'none',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  padding: '0.375rem 0.625rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  color: '#374151',
};

const badge: React.CSSProperties = {
  position: 'absolute',
  top: -5,
  right: -5,
  background: '#2563eb',
  color: 'white',
  borderRadius: 9999,
  fontSize: '0.6rem',
  fontWeight: 700,
  padding: '0 0.3rem',
  minWidth: 16,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dropdown: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 6px)',
  width: 320,
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  zIndex: 100,
};

const dropdownHeader: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid #f1f5f9',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const markAllBtn: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#2563eb',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 500,
  padding: 0,
};
