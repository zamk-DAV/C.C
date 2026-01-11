
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { MessageBubble } from '../components/chat/MessageBubble';
import type { ChatMessage } from '../types';
import { format } from 'date-fns';
import { ContextMenu } from '../components/chat/ContextMenu';
import useFcmToken from '../hooks/useFcmToken';
// import { ko } from 'date-fns/locale';

export const ChatPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, partnerData, coupleData } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [notice, setNotice] = useState<{ text: string, id: string } | null>(null);

    // Context Menu State
    const [menuLocation, setMenuLocation] = useState<{ x: number, y: number } | null>(null);
    const [selectedMsg, setSelectedMsg] = useState<ChatMessage | null>(null);

    // Reply State
    const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);

    const [typingStatus, setTypingStatus] = useState<boolean>(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-scroll to bottom combined with messages and typing status
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, replyTarget, typingStatus]);

    // Fetch Messages & Notice & Typing Status
    useEffect(() => {
        if (!coupleData?.id) return;

        // Messages
        const q = query(
            collection(db, 'couples', coupleData.id, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribeMsgs = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChatMessage[];
            setMessages(msgs);
        });

        // Couple Doc (Notice + Typing)
        const unsubscribeCouple = onSnapshot(doc(db, 'couples', coupleData.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setNotice(data.notice || null);

                // Typing Status Check
                if (data.typing) {
                    const partnerId = partnerData?.uid;
                    if (partnerId && data.typing[partnerId]) {
                        setTypingStatus(true);
                    } else {
                        setTypingStatus(false);
                    }
                }
            } else {
                setNotice(null);
                setTypingStatus(false);
            }
        });

        return () => {
            unsubscribeMsgs();
            unsubscribeCouple();
        };
    }, [coupleData?.id, partnerData?.uid]);

    // Typing Indicator Handler
    const handleInputChange = (text: string) => {
        setInputText(text);

        if (!user || !coupleData?.id) return;

        // Set typing true
        updateDoc(doc(db, 'couples', coupleData.id), {
            [`typing.${user.uid}`]: true
        });

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to clear typing status
        typingTimeoutRef.current = setTimeout(() => {
            updateDoc(doc(db, 'couples', coupleData.id), {
                [`typing.${user.uid}`]: false
            });
        }, 2000);
    };

    // Hooks
    // Track chat activity status & Clear unread count
    useEffect(() => {
        if (user?.uid) {
            const userRef = doc(db, 'users', user.uid);

            // Set active on mount
            updateDoc(userRef, {
                isChatActive: true,
                unreadCount: 0,
                lastActive: serverTimestamp()
            });

            // App Badging API (Native icon badge)
            if ('setAppBadge' in navigator) {
                (navigator as any).setAppBadge(0).catch(console.error);
            }

            // Set inactive on unmount
            return () => {
                updateDoc(userRef, {
                    isChatActive: false,
                    lastActive: serverTimestamp()
                });
            };
        }
    }, [user?.uid, messages.length]);

    useFcmToken();



    const sendPushNotification = async (text: string) => {
        if (!partnerData?.uid) return;

        // Fetch partner's tokens
        const partnerDoc = await getDoc(doc(db, 'users', partnerData.uid));
        if (partnerDoc.exists()) {
            const data = partnerDoc.data();

            // Check if push is enabled (default true)
            if (data.isPushEnabled === false) return;

            // DO NOT send push if partner is already in the ChatPage
            if (data.isChatActive === true) return;

            const tokens = data.fcmTokens || [];
            const badgeCount = data.unreadCount || 0;

            if (tokens.length > 0) {
                try {
                    const response = await fetch('/api/send-push', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tokens,
                            title: user?.displayName || 'C.C',
                            body: text,
                            icon: user?.photoURL || '/icon-192x192.png',
                            badge: badgeCount
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error("Push Notification Failed:", errorData);
                    }
                } catch (err) {
                    console.error("Push Network Error:", err);
                }
            }
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        if (!user || !coupleData?.id) {
            console.error("Cannot send message: Missing user or coupleData", { user: !!user, coupleId: coupleData?.id });
            return;
        }

        try {
            const messageData: any = {
                text: inputText,
                senderId: user.uid,
                createdAt: serverTimestamp(),
                type: 'text',
                isRead: false
            };

            if (replyTarget) {
                messageData.replyTo = {
                    id: replyTarget.id,
                    text: replyTarget.text,
                    senderName: replyTarget.senderId === user.uid ? '나' : (partnerData?.name || 'Partner')
                };
            }

            await addDoc(collection(db, 'couples', coupleData.id, 'messages'), messageData);

            // Increment partner's unread count
            if (partnerData?.uid) {
                await updateDoc(doc(db, 'users', partnerData.uid), {
                    unreadCount: increment(1)
                });
            }

            // Send Push Notification
            sendPushNotification(inputText);

            setInputText('');
            setReplyTarget(null);

            // Clear typing immediately on send
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            updateDoc(doc(db, 'couples', coupleData.id), {
                [`typing.${user.uid}`]: false
            });

        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, msg: ChatMessage) => {
        e.preventDefault();
        // Determine coordinates
        let x = 0, y = 0;
        if ('touches' in e) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = (e as React.MouseEvent).clientX;
            y = (e as React.MouseEvent).clientY;
        }
        setMenuLocation({ x, y });
        setSelectedMsg(msg);
    };

    const handleAction = async (action: 'reply' | 'copy' | 'notice' | 'delete') => {
        if (!selectedMsg || !coupleData?.id) return;
        setMenuLocation(null);

        switch (action) {
            case 'reply':
                setReplyTarget(selectedMsg);
                break;
            case 'copy':
                navigator.clipboard.writeText(selectedMsg.text);
                break;
            case 'notice':
                const noticeData = { text: selectedMsg.text, id: selectedMsg.id, createdAt: new Date().toISOString() };
                await updateDoc(doc(db, 'couples', coupleData.id), { notice: noticeData });
                break;
            case 'delete':
                if (window.confirm("메시지를 삭제하시겠습니까? (상대방에게도 '삭제된 메시지'로 보입니다)")) {
                    await updateDoc(doc(db, 'couples', coupleData.id, 'messages', selectedMsg.id), {
                        isDeleted: true,
                        text: '', // clear text for privacy
                        type: 'text' // reset type
                    });
                }
                break;
        }
        setSelectedMsg(null);
    };

    const handleReaction = async (emoji: string) => {
        if (!selectedMsg || !coupleData?.id || !user) return;
        setMenuLocation(null);

        const msgRef = doc(db, 'couples', coupleData.id, 'messages', selectedMsg.id);
        const currentReactions = selectedMsg.reactions || {};
        const userIds = currentReactions[emoji] || [];

        // Toggle logic
        let newIds;
        if (userIds.includes(user.uid)) {
            newIds = userIds.filter(id => id !== user.uid);
        } else {
            newIds = [...userIds, user.uid];
        }

        const newReactions = {
            ...currentReactions,
            [emoji]: newIds
        };

        // Remove empty arrays
        if (newIds.length === 0) {
            delete newReactions[emoji];
        }

        await updateDoc(msgRef, { reactions: newReactions });
        setSelectedMsg(null);
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups: Record<string, ChatMessage[]>, message: ChatMessage) => {
        const date = message.createdAt instanceof Timestamp
            ? message.createdAt.toDate()
            : new Date(); // Fallback for pending writes

        const dateKey = format(date, 'yyyy. MM. dd');

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(message);
        return groups;
    }, {} as Record<string, ChatMessage[]>);

    return (
        <div className="min-h-[100dvh] bg-background text-primary font-display antialiased flex justify-center w-full transition-colors duration-300">
            <div className="w-full max-w-md relative flex flex-col min-h-[100dvh] bg-background shadow-xl">
                {/* Header with Notice */}
                <header className="fixed top-0 max-w-md w-full bg-background/80 backdrop-blur-md z-50 px-6 pt-14 pb-2 border-b border-border flex flex-col transition-colors duration-300">
                    <div className="flex items-center justify-between pb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="material-symbols-outlined text-[24px] font-light hover:text-text-secondary transition-colors text-primary"
                            >
                                arrow_back
                            </button>
                            <div className="flex flex-col">
                                <h1 className="text-[17px] font-bold tracking-tight text-primary">{partnerData?.name || 'Partner'}</h1>
                            </div>
                        </div>
                        <button className="material-symbols-outlined text-[22px] font-light text-primary">search</button>
                    </div>

                    {/* Notice Banner */}
                    {notice && (
                        <div className="flex items-center justify-between bg-secondary/30 p-2 rounded-lg mb-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="material-symbols-outlined text-[16px] text-primary shrink-0">campaign</span>
                                <span className="text-[12px] text-primary truncate">{notice.text}</span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("공지를 내리시겠습니까?")) {
                                        if (coupleData?.id) updateDoc(doc(db, 'couples', coupleData.id), { notice: null });
                                    }
                                }}
                                className="material-symbols-outlined text-[14px] text-text-secondary hover:text-primary shrink-0"
                            >
                                close
                            </button>
                        </div>
                    )}
                </header>

                {/* Main Chat Area */}
                <main className="flex-1 mt-[130px] mb-[100px] px-6 overflow-y-auto no-scrollbar">
                    {Object.keys(groupedMessages).map((dateKey) => (
                        <div key={dateKey}>
                            <div className="flex items-center gap-4 my-8">
                                <div className="h-[1px] flex-1 bg-border"></div>
                                <span className="text-[10px] font-bold tracking-[0.2em] text-text-secondary">{dateKey}</span>
                                <div className="h-[1px] flex-1 bg-border"></div>
                            </div>
                            <div className="mb-6">
                                {groupedMessages[dateKey].map((msg: ChatMessage, index: number) => {
                                    const isMine = msg.senderId === user?.uid;

                                    // Grouping Logic
                                    const nextMsg = groupedMessages[dateKey][index + 1];
                                    const prevMsg = groupedMessages[dateKey][index - 1];

                                    const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId ||
                                        (nextMsg.createdAt instanceof Timestamp && msg.createdAt instanceof Timestamp &&
                                            Math.abs(nextMsg.createdAt.toMillis() - msg.createdAt.toMillis()) > 60000); // 1 minute diff

                                    const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId ||
                                        (prevMsg.createdAt instanceof Timestamp && msg.createdAt instanceof Timestamp &&
                                            Math.abs(msg.createdAt.toMillis() - prevMsg.createdAt.toMillis()) > 60000);

                                    return (
                                        <MessageBubble
                                            key={msg.id}
                                            message={msg}
                                            isMine={isMine}
                                            senderName={isMine ? undefined : (partnerData?.name || 'Partner')}
                                            avatarUrl={isMine ? undefined : partnerData?.photoURL}
                                            showProfile={!isMine && isFirstInGroup}
                                            showTime={isLastInGroup}
                                            onContextMenu={handleContextMenu}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator Bubble */}
                    {typingStatus && (
                        <div className="flex flex-col items-start max-w-[85%] mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-start gap-2">
                                <div
                                    className="size-8 rounded-[12px] bg-secondary bg-center bg-cover border border-border shrink-0 grayscale-img self-start"
                                    style={{ backgroundImage: partnerData?.photoURL ? `url(${partnerData.photoURL})` : undefined }}
                                />
                                <div className="border border-border px-4 py-3 bg-background bubble-in rounded-2xl rounded-tl-sm">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-text-secondary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-text-secondary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-text-secondary/50 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </main>

                {/* Context Menu */}
                {menuLocation && selectedMsg && (
                    <ContextMenu
                        x={menuLocation.x}
                        y={menuLocation.y}
                        onClose={() => setMenuLocation(null)}
                        onReply={() => handleAction('reply')}
                        onCopy={() => handleAction('copy')}
                        onNotice={() => handleAction('notice')}
                        onDelete={() => handleAction('delete')}
                        onReaction={handleReaction}
                        isMine={selectedMsg.senderId === user?.uid}
                    />
                )}

                {/* Footer Input */}
                <footer className="fixed bottom-0 max-w-md w-full bg-background px-6 pb-10 pt-4 z-50 transition-colors duration-300">
                    {/* Reply Preview */}
                    {replyTarget && (
                        <div className="flex items-center justify-between bg-secondary/50 p-2 rounded-t-lg border-b border-primary/20 mb-2">
                            <div className="flex flex-col text-[12px] border-l-2 border-primary pl-2">
                                <span className="font-bold text-primary">{replyTarget.senderId === user?.uid ? '나' : (partnerData?.name || 'Partner')}에게 답장</span>
                                <span className="text-text-secondary truncate max-w-[200px]">{replyTarget.text}</span>
                            </div>
                            <button onClick={() => setReplyTarget(null)}>
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                    )}

                    <form
                        className="flex items-center gap-4 border-b border-primary pb-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSendMessage();
                        }}
                    >
                        <button type="button" className="material-symbols-outlined text-[24px] font-light text-text-secondary hover:text-primary transition-colors">add</button>
                        <input
                            className="flex-1 border-none focus:ring-0 text-[14px] placeholder:text-text-secondary/50 px-0 bg-transparent outline-none text-primary"
                            placeholder="메시지를 입력하세요"
                            type="text"
                            value={inputText}
                            onChange={(e) => handleInputChange(e.target.value)}
                            // onKeyDown removed in favor of form submit
                            autoComplete="off"
                        />
                        <button
                            type="submit"
                            className="flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-[24px] font-light rotate-[-45deg] relative left-[2px] text-primary">send</span>
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};
