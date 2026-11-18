import { useCallback, useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/db';
import { formatReadableFirestoreError } from '../../firebase/errors';
import type { Notification } from '../../types/domain';
import { formatDateTime } from '../../utils/format';

export function StudentNotifications() {
  const { refreshUnreadCount } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await db.getNotifications();
      setItems(res.items);
      setError(null);
      await refreshUnreadCount();
    } catch (err) {
      setError(formatReadableFirestoreError(err, 'Unable to load notifications.'));
    } finally {
      setLoading(false);
    }
  }, [refreshUnreadCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkRead = async (id: string) => {
    await db.markNotificationRead(id);
    await load();
  };

  const handleMarkAllRead = async () => {
    await db.markAllNotificationsRead();
    await load();
  };

  const unreadItems = items.filter((n) => !n.isRead);
  const visible = filter === 'unread' ? unreadItems : items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dbe4de] pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[#17221c] sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-[#5a6a61] tabular-nums">
            {unreadItems.length} unread {unreadItems.length === 1 ? 'notification' : 'notifications'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-[#dbe4de] bg-white p-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#eef6f0] text-[#185a39]'
                  : 'text-[#5a6a61] hover:text-[#17221c]'
              }`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-[#eef6f0] text-[#185a39]'
                  : 'text-[#5a6a61] hover:text-[#17221c]'
              }`}
            >
              Unread ({unreadItems.length})
            </button>
          </div>

          {unreadItems.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe4de] bg-white px-3.5 py-2 text-xs font-medium text-[#185a39] hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl border border-[#dbe4de] bg-white" aria-busy="true" />
      ) : error ? (
        <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm text-[#b91c1c]">
          {error}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-[#dbe4de] bg-white p-8 text-center">
          <p className="text-sm font-medium text-[#17221c]">
            {filter === 'unread' ? 'All notifications have been read.' : 'No notifications yet.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#dbe4de] rounded-xl border border-[#dbe4de] bg-white">
          {visible.map((notif) => (
            <li key={notif.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Bell
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    !notif.isRead ? 'text-[#b88a2e]' : 'text-[#5a6a61]/45'
                  }`}
                  aria-label={!notif.isRead ? 'Unread' : 'Read'}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm text-[#17221c] ${
                      !notif.isRead ? 'font-semibold' : 'font-normal'
                    }`}
                  >
                    {notif.title}
                  </p>
                  <p className="mt-1 text-sm text-[#5a6a61]">{notif.body}</p>
                  <p className="mt-2 text-xs text-[#5a6a61] tabular-nums">
                    {notif.category} · {formatDateTime(notif.createdAt)}
                  </p>
                </div>
              </div>

              {!notif.isRead && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(notif.id)}
                  className="rounded-lg border border-[#dbe4de] bg-[#f8faf7] px-3 py-1.5 text-xs font-medium text-[#185a39] hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
                >
                  Mark as read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
