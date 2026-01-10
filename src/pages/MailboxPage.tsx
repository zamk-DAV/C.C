import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const MailboxPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

    // Mock Data
    const postcards = [
        {
            id: 1,
            sender: '지은',
            date: '2023. 10. 24',
            content: '오늘 아침 창가에 비친 햇살이 유난히 밝아서 문득 네 생각이 났어. 우리가 함께 걷던 그 길도...',
            isRead: false
        },
        {
            id: 2,
            sender: '지은',
            date: '2023. 10. 22',
            content: '바쁜 하루였지만 네 목소리를 들으니 모든 피로가 풀리는 기분이야. 내일은 더 따뜻했으면 좋겠다.',
            isRead: false
        },
        {
            id: 3,
            sender: '지은',
            date: '2023. 10. 15',
            content: '벌써 우리가 만난 지 백 일이 되었네. 고맙다는 말로 다 표현할 수 없을 만큼 소중한 시간들이야.',
            isRead: true
        }
    ];

    return (
        <div className="relative flex min-h-[100dvh] w-full max-w-md mx-auto flex-col bg-background font-display text-primary transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-10 flex flex-col bg-background/95 backdrop-blur-md transition-colors duration-300">
                <div className="flex items-center px-6 pt-6 pb-2 justify-between">
                    <div
                        onClick={() => navigate(-1)}
                        className="flex size-10 shrink-0 items-center justify-start text-primary cursor-pointer"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </div>
                    <h2 className="text-primary text-xl font-bold leading-tight tracking-tight flex-1 text-center pr-10">우편함</h2>
                </div>

                {/* Tabs */}
                <div className="flex w-full px-6 mt-4 border-b border-border">
                    <button
                        onClick={() => setActiveTab('received')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'received' ? 'border-b-2 border-primary text-primary' : 'border-b-2 border-transparent text-text-secondary'}`}
                    >
                        받은 우편
                    </button>
                    <button
                        onClick={() => setActiveTab('sent')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'sent' ? 'border-b-2 border-primary text-primary' : 'border-b-2 border-transparent text-text-secondary'}`}
                    >
                        보낸 우편
                    </button>
                </div>

                {/* Filter / Count */}
                <div className="px-6 py-4 flex justify-between items-center">
                    <p className="text-[10px] text-text-secondary font-medium uppercase tracking-[0.2em]">
                        총 {postcards.length}개의 {activeTab === 'received' ? '받은' : '보낸'} 우편
                    </p>
                    <span className="material-symbols-outlined text-text-secondary text-sm cursor-pointer hover:text-primary transition-colors">filter_list</span>
                </div>
            </header>

            {/* Content Body */}
            <main className="flex-1 px-6 space-y-10 pb-32 pt-2">
                {postcards.map((card) => (
                    <div key={card.id} className={`border border-border bg-background overflow-hidden ${card.isRead ? 'opacity-60' : ''}`}>
                        <div className="p-8 pb-6">
                            <div className="mb-10">
                                <p className="font-serif-kr text-lg leading-relaxed text-primary line-clamp-2">
                                    {card.content}
                                </p>
                            </div>
                            <div className="flex items-end justify-between border-t border-border pt-6">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        {!card.isRead && <span className="w-1 h-1 rounded-full bg-primary"></span>}
                                        <p className={`${card.isRead ? 'text-text-secondary' : 'text-primary'} text-xs font-bold tracking-tight`}>
                                            {card.sender}으로부터
                                        </p>
                                    </div>
                                    <p className="text-text-secondary text-[10px] font-medium tracking-widest uppercase">{card.date}</p>
                                </div>
                                <a
                                    href="#"
                                    className={`${card.isRead ? 'text-text-secondary no-underline' : 'text-primary underline underline-offset-8'} text-xs font-bold tracking-tight`}
                                >
                                    열기
                                </a>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="py-12 text-center">
                    <span className="material-symbols-outlined text-border">fiber_manual_record</span>
                </div>
            </main>
        </div>
    );
};
