import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bell, Check, BellOff } from "lucide-react";
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";

interface Notification {
    id: string;
    title: string;
    body: string;
    link: string | null;
    read_at: string | null;
    created_at: string;
}

/**
 * NotificationBell
 * Drop into any authenticated header.
 * Polls every 30s for new notifications (Supabase Realtime would be ideal,
 * but polling avoids the extra subscription setup and works universally).
 */
export function NotificationBell() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    const unread = items.filter(n => !n.read_at).length;

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await (supabase as any)
            .from("notifications")
            .select("id, title, body, link, read_at, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);
        if (data) setItems(data);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        // Poll every 30s while component is mounted
        const iv = setInterval(fetchNotifications, 30_000);
        return () => clearInterval(iv);
    }, [fetchNotifications]);

    const markRead = async (id: string) => {
        await (supabase as any).rpc("mark_notification_read", { p_notification_id: id });
        setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    };

    const markAllRead = async () => {
        await (supabase as any).rpc("mark_all_notifications_read");
        setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    };

    if (!user) return null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
                    <Bell className="w-4.5 h-4.5" />
                    {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white leading-none">
                            {unread > 9 ? "9+" : unread}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-80 p-0 shadow-xl border-gray-200" sideOffset={6}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                    {unread > 0 && (
                        <Button variant="ghost" size="sm" className="h-6 text-[11px] text-blue-600 hover:text-blue-700 px-2" onClick={markAllRead}>
                            <Check className="w-3 h-3 mr-1" /> Mark all read
                        </Button>
                    )}
                </div>

                {/* List */}
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                    {loading && items.length === 0 ? (
                        <div className="py-8 flex justify-center">
                            <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="py-10 flex flex-col items-center gap-2 text-center">
                            <BellOff className="w-8 h-8 text-gray-200" />
                            <p className="text-xs text-gray-400">No notifications yet</p>
                        </div>
                    ) : (
                        items.map(n => (
                            <div
                                key={n.id}
                                className={`group flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read_at ? "bg-blue-50/40" : ""}`}
                            >
                                {/* Unread dot */}
                                <div className="mt-1 flex-shrink-0">
                                    {!n.read_at
                                        ? <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        : <div className="w-2 h-2 rounded-full bg-transparent" />
                                    }
                                </div>

                                <div className="flex-1 min-w-0">
                                    {n.link ? (
                                        <Link
                                            to={n.link}
                                            className="block"
                                            onClick={() => { if (!n.read_at) markRead(n.id); setOpen(false); }}
                                        >
                                            <p className="text-sm font-semibold text-gray-900 leading-tight">{n.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                                        </Link>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 leading-tight">{n.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                    </p>
                                </div>

                                {/* Mark read button */}
                                {!n.read_at && (
                                    <button
                                        onClick={e => { e.stopPropagation(); markRead(n.id); }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 text-gray-300 hover:text-blue-500"
                                        title="Mark as read"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-2.5 text-center">
                        <p className="text-[11px] text-gray-400">Showing last {items.length} notifications</p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
