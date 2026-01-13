import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MobileMessageItem } from '../components/chat/interactions/MobileMessageItem';
import { DesktopMessageItem } from '../components/chat/interactions/DesktopMessageItem';
import { useDeviceType } from '../hooks/useDeviceType';

// Message type definition
interface Message {
    id: string;
    sender: 'me' | 'partner';
    content: string;
    time: string;
    imageUrl?: string;
    isRead: boolean;
}

// Mock messages
const mockMessages: Message[] = [
    { id: '1', sender: 'partner', content: '오늘 저녁 같이 먹는 거 기대된다. 나 이제 퇴근해!', time: '오후 6:12', isRead: true },
    { id: '2', sender: 'me', content: '나도! 회사 앞 카페에서 기다릴게. 조심히 와 :)', time: '오후 6:15', isRead: true },
    { id: '3', sender: 'partner', content: '이건 아까 점심에 찍은 거!', time: '오후 6:18', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5Z1yXUg_RlxrwV4NEFpW9P8Umn_bnBOMiIfTJKSCgBdj3V7OesMjfpEfY2LW0zYVetkPIGML7haRrnK91bXgCwLURTWZUkd0wyLY3T4y_FYdJuCY5BDSnDFH2KHIUPgAk9Eyc2DPkIQdd2JrnZHqZ97CKq5cVSYsnzYTfNInAfOpwYFHUf2Y-hOEES-MGtGCmSqDRrpNzbHj9rYapimPF7-m-xdCkpqaILKM9eLWhN4v8OotFd8QUI8u6n3s9a27wNRMltKQUuY8', isRead: true },
    { id: '4', sender: 'me', content: '와, 날씨 진짜 좋았나보다.', time: '오후 6:20', isRead: false },
];

const partnerAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop';
const partnerName = '민수';

export const ChatPage: React.FC = () => {
    const navigate = useNavigate();
    const { isMobile } = useDeviceType();

    return (
        <div className="min-h-[100dvh] bg-background-light dark:bg-background-dark text-primary dark:text-white font-display antialiased flex justify-center w-full">
            <div className="w-full max-w-md relative flex flex-col min-h-[100dvh] bg-white dark:bg-zinc-900 shadow-xl">
                {/* Header */}
                <header className="fixed top-0 max-w-md w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-50 px-4 pt-14 pb-4 border-b border-neutral-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="material-symbols-outlined text-[24px] font-light hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                            arrow_back
                        </button>
                        <img src={partnerAvatar} alt={partnerName} className="w-9 h-9 rounded-full object-cover" />
                        <div className="flex flex-col">
                            <h1 className="text-[16px] font-bold tracking-tight">{partnerName}</h1>
                        </div>
                    </div>
                    <button className="material-symbols-outlined text-[22px] font-light">search</button>
                </header>

                {/* Main Chat Area */}
                <main
                    className="flex-1 mt-[100px] mb-[90px] px-4 overflow-y-auto no-scrollbar scroll-smooth"
                    style={{ overflowAnchor: 'auto' }}
                >
                    {/* Date Separator */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="h-[1px] flex-1 bg-neutral-100 dark:bg-zinc-800"></div>
                        <span className="text-[11px] font-medium tracking-wide text-neutral-400 dark:text-neutral-500">2023년 12월 24일</span>
                        <div className="h-[1px] flex-1 bg-neutral-100 dark:bg-zinc-800"></div>
                    </div>

                    <div className="space-y-4 pb-10">
                        {mockMessages.map((msg) => {
                            const isMine = msg.sender === 'me';

                            // Handler Wrappers
                            const handleReply = () => console.log('Reply to', msg.id);
                            const handleReaction = () => console.log('Reaction to', msg.id);
                            const handleLongPress = () => console.log('Long press on', msg.id);

                            const bubble = (
                                <MessageBubble
                                    key={msg.id}
                                    message={{
                                        id: msg.id,
                                        text: msg.content,
                                        senderId: isMine ? 'me' : 'partner',
                                        createdAt: { toDate: () => new Date() },
                                        type: msg.imageUrl ? 'image' : 'text',
                                        imageUrl: msg.imageUrl,
                                        isRead: msg.isRead,
                                        reactions: { 'heart': ['partner'] }
                                    }}
                                    isMine={isMine}
                                    senderName={!isMine ? partnerName : undefined}
                                    avatarUrl={!isMine ? partnerAvatar : undefined}
                                    showProfile={!isMine}
                                    showTime={true}
                                />
                            );

                            return isMobile ? (
                                <MobileMessageItem
                                    key={msg.id}
                                    isMine={isMine}
                                    onReply={handleReply}
                                    onReaction={handleReaction}
                                    onLongPress={handleLongPress}
                                >
                                    {bubble}
                                </MobileMessageItem>
                            ) : (
                                <DesktopMessageItem
                                    key={msg.id}
                                    isMine={isMine}
                                    onReply={handleReply}
                                    onReaction={handleReaction}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        console.log('Context menu for', msg.id);
                                    }}
                                >
                                    {bubble}
                                </DesktopMessageItem>
                            );
                        })}
                    </div>
                </main>

                {/* Footer Input */}
                <footer className="fixed bottom-0 max-w-md w-full bg-white dark:bg-zinc-900 px-4 pb-8 pt-3 z-50 border-t border-neutral-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 bg-neutral-100 dark:bg-zinc-800 rounded-full px-4 py-2">
                        <button className="material-symbols-outlined text-[22px] font-light text-neutral-400">add</button>
                        <input
                            className="flex-1 border-none focus:ring-0 text-[14px] placeholder:text-neutral-400 bg-transparent outline-none"
                            placeholder="메시지를 입력하세요"
                            type="text"
                        />
                        <button className="flex items-center justify-center">
                            <span className="material-symbols-outlined text-[22px] font-light text-primary dark:text-blue-500 rotate-[-45deg] relative left-[2px]">send</span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};
