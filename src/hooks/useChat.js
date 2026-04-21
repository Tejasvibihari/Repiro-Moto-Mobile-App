// hooks/useChat.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import axiosClient from '../services/axiosClient';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.repairomoto.in';

export default function useChat(orderId) {
    const token = useSelector((s) => s.auth.token);

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [adminTyping, setAdminTyping] = useState(false);

    const socketRef = useRef(null);
    const joinedRef = useRef(false);
    const pendingTempIds = useRef(new Set()); // tracks temp IDs that are in-flight
    const adminTypingTimer = useRef(null);
    const typingTimer = useRef(null);

    // ── Fetch history ────────────────────────────────────────────────────────
    const fetchHistory = useCallback(async (pageNum = 1) => {
        if (!orderId) return;
        try {
            setLoading(true);
            const res = await axiosClient.get(
                `/api/chat/${orderId}/messages?page=${pageNum}&limit=50`
            );
            const incoming = res.data.messages ?? [];
            const pagination = res.data.pagination ?? {};

            setMessages((prev) =>
                pageNum === 1 ? incoming : [...incoming, ...prev]
            );
            setHasMore(pageNum < (pagination.pages ?? 1));
            setPage(pageNum);
        } catch (err) {
            setError(err?.response?.data?.message ?? err.message);
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    const loadMore = useCallback(() => {
        if (hasMore && !loading) fetchHistory(page + 1);
    }, [hasMore, loading, page, fetchHistory]);

    // ── Socket setup ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!orderId || !token) return;

        fetchHistory(1);

        const socket = io(`${SOCKET_URL}/chat`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            setError(null);
            if (!joinedRef.current) {
                joinedRef.current = true;
                socket.emit('join-order', orderId.toString(), (ack) => {
                    if (ack?.error) {
                        setError(ack.error);
                        joinedRef.current = false;
                    }
                });
            }
        });

        socket.on('disconnect', () => {
            setConnected(false);
            joinedRef.current = false;
        });

        socket.on('connect_error', () => {
            setConnected(false);
            setError('Connection failed. Retrying…');
        });

        // ── KEY FIX: new-message handler ──────────────────────────────────
        //
        // The server broadcasts new-message to EVERYONE in the room including
        // the sender. We also get the real doc back in the send-message ack.
        //
        // Flow for sender:
        //   1. Optimistic temp bubble appended (tempId in pendingTempIds)
        //   2. socket.emit send-message → ack arrives → replace(tempId, realDoc)
        //      → tempId removed from pendingTempIds
        //   3. new-message broadcast arrives → if _id already exists OR the
        //      real _id was just swapped in via replace(), deduplicate by _id.
        //      If tempId is STILL pending (ack hasn't arrived yet), replace it.
        //
        // Flow for receiver (admin reply):
        //   - new-message arrives with a brand-new _id not in list → append.

        socket.on('new-message', (msg) => {
            setMessages((prev) => {
                // Already in list by real _id → skip (handles echo after ack)
                if (prev.some((m) => m._id === msg._id)) return prev;

                // A temp message is still pending → replace it with the real doc
                // (this happens if broadcast arrives before the ack callback)
                const pendingIds = Array.from(pendingTempIds.current);
                if (pendingIds.length > 0) {
                    // Replace the oldest pending temp (FIFO)
                    const tempId = pendingIds[0];
                    pendingTempIds.current.delete(tempId);
                    return prev.map((m) =>
                        m._id === tempId ? { ...msg, _pending: false } : m
                    );
                }

                // Normal incoming message from the other side → append
                return [...prev, msg];
            });
        });

        socket.on('reconnect', () => {
            joinedRef.current = false;
            socket.emit('join-order', orderId.toString(), (ack) => {
                if (!ack?.error) joinedRef.current = true;
            });
        });

        // Typing from admin/employee side
        socket.on('user-typing', ({ userType, isTyping }) => {
            if (userType === 'admin' || userType === 'employee') {
                setAdminTyping(isTyping);
                if (isTyping) {
                    if (adminTypingTimer.current) clearTimeout(adminTypingTimer.current);
                    adminTypingTimer.current = setTimeout(() => setAdminTyping(false), 4000);
                }
            }
        });

        return () => {
            joinedRef.current = false;
            pendingTempIds.current.clear();
            socket.disconnect();
            socketRef.current = null;
        };
    }, [orderId, token]);

    // ── Send message ─────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (text, attachments = []) => {
        const trimmed = text?.trim();
        if (!trimmed || !orderId) return;

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const optimistic = {
            _id: tempId,
            orderId,
            senderType: 'user',
            message: trimmed,
            attachments,
            createdAt: new Date().toISOString(),
            isRead: false,
            _pending: true,
        };

        // Track this temp ID so new-message handler knows it's in-flight
        pendingTempIds.current.add(tempId);
        setMessages((prev) => [...prev, optimistic]);
        setSending(true);

        const replace = (real) => {
            // Remove from pending set — new-message handler won't touch it now
            pendingTempIds.current.delete(tempId);
            setMessages((prev) =>
                prev.map((m) => (m._id === tempId ? { ...real, _pending: false } : m))
            );
        };

        const markFailed = () => {
            pendingTempIds.current.delete(tempId);
            setMessages((prev) =>
                prev.map((m) =>
                    m._id === tempId ? { ...m, _failed: true, _pending: false } : m
                )
            );
        };

        try {
            if (socketRef.current?.connected) {
                socketRef.current.emit(
                    'send-message',
                    { orderId: orderId.toString(), message: trimmed, attachments },
                    (ack) => {
                        if (ack?.error) {
                            markFailed();
                        } else if (ack?.message) {
                            // Ack arrived — if new-message already replaced it via
                            // pendingTempIds path, the map below is a harmless no-op
                            // because tempId is already gone from the list.
                            replace(ack.message);
                        } else {
                            // Server ack without a payload — just mark as sent
                            pendingTempIds.current.delete(tempId);
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m._id === tempId ? { ...m, _pending: false } : m
                                )
                            );
                        }
                        setSending(false);
                    }
                );
            } else {
                // REST fallback (no socket)
                const res = await axiosClient.post(`/api/chat/${orderId}/messages`, {
                    message: trimmed,
                    attachments,
                });
                replace(res.data);
                setSending(false);
            }
        } catch {
            markFailed();
            setSending(false);
        }
    }, [orderId]);

    // ── Typing indicator ─────────────────────────────────────────────────────
    const sendTyping = useCallback((isTyping) => {
        if (!socketRef.current?.connected || !orderId) return;
        socketRef.current.emit('typing', { orderId: orderId.toString(), isTyping });
        if (isTyping) {
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => {
                socketRef.current?.emit('typing', {
                    orderId: orderId.toString(),
                    isTyping: false,
                });
            }, 3000);
        }
    }, [orderId]);

    return {
        messages,
        loading,
        sending,
        connected,
        error,
        hasMore,
        adminTyping,
        sendMessage,
        sendTyping,
        loadMore,
        refetch: () => fetchHistory(1),
    };
}