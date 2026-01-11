import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { MessageBubble } from '../components/chat/MessageBubble';
import type { ChatMessage } from '../types';
import { format } from 'date-fns';
// import { ko } from 'date-fns/locale';

export const ChatPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, partnerData, coupleData } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch Messages
    useEffect(() => {
        if (!coupleData?.id) return;

        const q = query(
            collection(db, 'couples', coupleData.id, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChatMessage[];
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [coupleData?.id]);

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        if (!user || !coupleData?.id) {
            console.error("Cannot send message: Missing user or coupleData", { user: !!user, coupleId: coupleData?.id });
            return;
        }

        try {
            await addDoc(collection(db, 'couples', coupleData.id, 'messages'), {
                text: inputText,
                senderId: user.uid,
                createdAt: serverTimestamp(),
                type: 'text',
                isRead: false
            });
            setInputText('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
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
                {/* Header */}
                <header className="fixed top-0 max-w-md w-full bg-background/80 backdrop-blur-md z-50 px-6 pt-14 pb-6 border-b border-border flex items-center justify-between transition-colors duration-300">
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
                </header>

                {/* Main Chat Area */}
                <main className="flex-1 mt-[110px] mb-[100px] px-6 overflow-y-auto no-scrollbar">
                    {Object.keys(groupedMessages).map((dateKey) => (
                        <div key={dateKey}>
                            <div className="flex items-center gap-4 my-12">
                                <div className="h-[1px] flex-1 bg-border"></div>
                                <span className="text-[10px] font-bold tracking-[0.2em] text-text-secondary">{dateKey}</span>
                                <div className="h-[1px] flex-1 bg-border"></div>
                            </div>
                            <div className="mb-6">
                                {groupedMessages[dateKey].map((msg: ChatMessage, index: number) => {
                                    const date = msg.createdAt instanceof Timestamp ? msg.createdAt.toDate() : new Date();
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
                                            message={msg.text}
                                            timestamp={format(date, 'a h:mm').replace('AM', '오전').replace('PM', '오후')}
                                            isMine={isMine}
                                            senderName={isMine ? undefined : (partnerData?.name || 'Partner')}
                                            avatarUrl={isMine ? undefined : partnerData?.photoURL}
                                            type={msg.type}
                                            imageUrl={msg.imageUrl}
                                            isRead={msg.isRead}
                                            showProfile={!isMine && isFirstInGroup}
                                            showTime={isLastInGroup}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </main>

                {/* Footer Input */}
                {/* Footer Input */}
                <footer className="fixed bottom-0 max-w-md w-full bg-background px-6 pb-10 pt-4 z-50 transition-colors duration-300">
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
                            onChange={(e) => setInputText(e.target.value)}
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
