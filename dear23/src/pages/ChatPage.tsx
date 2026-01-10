import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ChatPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[100dvh] bg-background-light text-primary font-display antialiased flex justify-center w-full">
            <div className="w-full max-w-md relative flex flex-col min-h-[100dvh] bg-white shadow-xl">
                {/* Header */}
                <header className="fixed top-0 max-w-md w-full bg-white/80 backdrop-blur-md z-50 px-6 pt-14 pb-6 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="material-symbols-outlined text-[24px] font-light hover:text-neutral-600 transition-colors"
                        >
                            arrow_back
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-[17px] font-bold tracking-tight">민수</h1>
                        </div>
                    </div>
                    <button className="material-symbols-outlined text-[22px] font-light">search</button>
                </header>

                {/* Main Chat Area */}
                <main className="flex-1 mt-[110px] mb-[100px] px-6 overflow-y-auto no-scrollbar">
                    <div className="flex items-center gap-4 my-12">
                        <div className="h-[1px] flex-1 bg-neutral-100"></div>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-300">2023. 12. 24</span>
                        <div className="h-[1px] flex-1 bg-neutral-100"></div>
                    </div>

                    <div className="space-y-8 pb-10">
                        {/* Received Message */}
                        <div className="flex flex-col items-start gap-2 max-w-[85%]">
                            <div className="border border-black p-4 bg-white bubble-in">
                                <p className="text-[14px] leading-relaxed">오늘 저녁 같이 먹는 거 기대된다. 나 이제 퇴근해!</p>
                            </div>
                            <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-wider ml-1">06:12 PM</span>
                        </div>

                        {/* Sent Message */}
                        <div className="flex flex-col items-end gap-2 ml-auto max-w-[85%]">
                            <div className="bg-black p-4 bubble-out">
                                <p className="text-[14px] leading-relaxed text-white">나도! 회사 앞 카페에서 기다릴게. 조심히 와 :)</p>
                            </div>
                            <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-wider mr-1">06:15 PM</span>
                        </div>

                        {/* Received Image Message */}
                        <div className="flex flex-col items-start gap-2 max-w-[85%]">
                            <div className="flex flex-col">
                                <div className="border border-black p-1 bg-white image-bubble-in overflow-hidden">
                                    <div
                                        className="w-full aspect-square bg-neutral-100 bg-center bg-cover grayscale rounded-[12px]"
                                        style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuD5Z1yXUg_RlxrwV4NEFpW9P8Umn_bnBOMiIfTJKSCgBdj3V7OesMjfpEfY2LW0zYVetkPIGML7haRrnK91bXgCwLURTWZUkd0wyLY3T4y_FYdJuCY5BDSnDFH2KHIUPgAk9Eyc2DPkIQdd2JrnZHqZ97CKq5cVSYsnzYTfNInAfOpwYFHUf2Y-hOEES-MGtGCmSqDRrpNzbHj9rYapimPF7-m-xdCkpqaILKM9eLWhN4v8OotFd8QUI8u6n3s9a27wNRMltKQUuY8")` }}
                                    />
                                </div>
                                <div className="border border-black border-t-0 p-4 bg-white image-caption-in">
                                    <p className="text-[14px] leading-relaxed">이건 아까 점심에 찍은 거!</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-wider ml-1">06:18 PM</span>
                        </div>

                        {/* Sent Message */}
                        <div className="flex flex-col items-end gap-2 ml-auto max-w-[85%]">
                            <div className="bg-black p-4 bubble-out">
                                <p className="text-[14px] leading-relaxed text-white">와, 날씨 진짜 좋았나보다.</p>
                            </div>
                            <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-wider mr-1">06:20 PM</span>
                        </div>
                    </div>
                </main>

                {/* Footer Input */}
                <footer className="fixed bottom-0 max-w-md w-full bg-white px-6 pb-10 pt-4 z-50">
                    <div className="flex items-center gap-4 border-b border-black pb-3">
                        <button className="material-symbols-outlined text-[24px] font-light text-neutral-400">add</button>
                        <input
                            className="flex-1 border-none focus:ring-0 text-[14px] placeholder:text-neutral-300 px-0 bg-transparent outline-none"
                            placeholder="메시지를 입력하세요"
                            type="text"
                        />
                        <button className="flex items-center justify-center">
                            <span className="material-symbols-outlined text-[24px] font-light rotate-[-45deg] relative left-[2px]">send</span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};
