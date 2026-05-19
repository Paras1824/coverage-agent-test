import React, { useState } from 'react';

type NotificationType = 'info' | 'success' | 'warning' | 'deadline';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
}

const typeConfig: Record<NotificationType, { color: string; icon: string }> = {
  info: { color: '#0ea5e9', icon: 'ℹ' },
  success: { color: '#10b981', icon: '✓' },
  warning: { color: '#f59e0b', icon: '⚠' },
  deadline: { color: '#ef4444', icon: '🗓' },
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
}) => {
  const [filter, setFilter] = useState<NotificationType | 'all'>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = notifications.filter((n) => filter === 'all' || n.type === filter);

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <aside
      aria-label="Notification center"
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #13133a 100%)',
        border: '1px solid rgba(124,58,237,0.3)',
        borderRadius: 20,
        overflow: 'hidden',
        width: 360,
        boxShadow: '0 0 40px rgba(124,58,237,0.15)',
      }}
    >
      <header style={{ padding: '16px 20px', borderBottom: '1px solid rgba(124,58,237,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 16, fontWeight: 700 }}>Notifications</h3>
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} unread`}
              style={{ background: '#7c3aed', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            style={{ background: 'transparent', border: 'none', color: '#a78bfa', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            Mark all read
          </button>
        )}
      </header>

      <div style={{ display: 'flex', gap: 0, padding: '10px 16px', borderBottom: '1px solid rgba(124,58,237,0.1)', overflowX: 'auto' }}>
        {(['all', 'info', 'success', 'warning', 'deadline'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            style={{
              padding: '4px 12px',
              background: filter === f ? 'rgba(124,58,237,0.2)' : 'transparent',
              border: 'none',
              borderRadius: 20,
              color: filter === f ? '#a78bfa' : '#64748b',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: filter === f ? 700 : 400,
            }}
          >
            {f === 'all' ? 'All' : typeConfig[f].icon + ' ' + f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <ul
        style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 400, overflowY: 'auto' }}
        aria-label="Notification list"
      >
        {filtered.length === 0 ? (
          <li style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            No notifications here.
          </li>
        ) : (
          filtered.map((notif) => {
            const { color, icon } = typeConfig[notif.type];
            return (
              <li
                key={notif.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(124,58,237,0.1)',
                  background: notif.read ? 'transparent' : 'rgba(124,58,237,0.05)',
                  display: 'flex',
                  gap: 12,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: `${color}22`,
                    color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    flexShrink: 0,
                    fontWeight: 700,
                  }}
                >
                  {icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <strong style={{ color: notif.read ? '#94a3b8' : '#f1f5f9', fontSize: 13, fontWeight: notif.read ? 400 : 700 }}>
                      {notif.title}
                    </strong>
                    <span style={{ color: '#475569', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatTime(notif.timestamp)}
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12, lineHeight: 1.4 }}>{notif.message}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {notif.actionLabel && notif.onAction && (
                      <button
                        onClick={notif.onAction}
                        aria-label={notif.actionLabel}
                        style={{ background: 'transparent', border: `1px solid ${color}55`, borderRadius: 6, color, fontSize: 11, padding: '3px 10px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {notif.actionLabel}
                      </button>
                    )}
                    {!notif.read && (
                      <button
                        onClick={() => onMarkRead(notif.id)}
                        aria-label={`Mark "${notif.title}" as read`}
                        style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: 11, cursor: 'pointer' }}
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => onDismiss(notif.id)}
                      aria-label={`Dismiss "${notif.title}"`}
                      style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: 11, cursor: 'pointer', marginLeft: 'auto' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
};

export default NotificationCenter;
