import React, { useState, useMemo } from 'react';
import { format, getWeek, parseISO } from 'date-fns';
import type { NotionItem } from '../types';

// Mock Data matches user snippet
const MOCK_DIARY_ITEMS: NotionItem[] = [
    { id: '1', title: '구내식당 쌀국수. 우삼겹이 적어 보였는데 먹다보니 엄청 많이 나왔다. 정말 최고일텐데.', date: '2025-06-02', type: 'Diary', images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAfnRHo_u4e33ymVAGyI2SPscwwALLY1oUOYmEBHiIp7Kh3UIZ9ouwmJ4DIC45E9tlxoBAGzkPy50l1ph-4HP-85cf-C2BNIcqX2HL1m0vTIkGhi5uLeZb7k2jsT3MUe7AbJSVdHoKBTOZEXMxGcbxsfwTVPR4S4ghkUX6B3rMu0kURPXnRgbjlxfcGSQ8BqkBBO8D6bMa6KQpjOgfKGBd1EgZwVD7i5Mi6NJw3DhX9vaQSb1jeVPRhzKVRUdbtmMVoaMjP7gFCV90'], tags: [], author: 'Me', content: '구내식당 쌀국수...' },
    { id: '2', title: '대통령 선거! 아침 일찍 나가서 투표를 하고 왔다.', date: '2025-06-03', type: 'Diary', images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuDysPoHFfKRDK-qH1PR3EQ66KFpmLPhlqTWRA-5f20Ts9D4TY0WLfbFxE9t_1_hUgAANwxomsmaRE6SvFD-qLzWzX6_SK4Vl9ksUYM6f0RH4aMuY6Vl08RCF1yNmCzDhY0OWn-0BejxfggGGdN4-_ra8iilb-yMoe9tIQpdQt91ISh7lmcM4TIyS2aj-kr1ICqwpn1PQfro9taum-bHIiRIAEanCk1hzkRm410zW-OgxbBTAONsivM6b_m0ZnIENyPKPiGKa-Qh9u4'], tags: [], author: 'Me', content: '투표 완료' },
    { id: '3', title: '금이는 정말 귀여워. 그런데 왜 꼭 내 엉덩이 위에서 자리를 잡고 졸아야 하는 걸까?', date: '2025-06-04', type: 'Diary', images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuA4nb8nB09A-eO7dZYH3YLfNA5keGkR5Fxob0cyf55kwJJIYLTJFX1oCzte8_-IU7lXdUj9tMhjs-EeYbbiXz_Wm6ZlLEFe4uJaZE06InXQ6sPNCrSBQXFavPy8BDWZ37DP8dqOZycPbJMF4lPG9GqyE7PfqE7Z0tVyX0LL3-TrNUfbyYITHwtavRnqw67yzbCRcoy87WfVprmkyMTUfrfU6V4hONIKzavtrU1s3YS7uadem0UDRAW4rtYE0N7Qek7DbehvefpETcw'], tags: [], author: 'Partner', content: '고양이 귀여워' },
    { id: '4', title: '요아정을 시켰는데 코코볼과 후르츠링을 서비스로 주셨다. 코코볼 존맛.', date: '2025-06-05', type: 'Diary', images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuC0UHLtBTj0CiXo7ZZBgP1OX-cFstUKS0FLGLgKXJnb5a2TFMfi9fsu0PbuNwg4KBJlALRbVi7c02ae_ovJicC7L28D6tkhlAksk4ixtoKznS8-UXA4mvZJ_EdEqRB2VL8D2jkXKeaKfihMBmZUPtyZUr50d0IAvw25ABV-FPiRXDRZQgf8X5w1NrF12hPTCRw5yibkY1Tutv1MBbs5dkRnls-_oJCfB81o8GrBEthP2MO2DD0Oa4TaZRG5EjPoVTl5XE32jWGLksU'], tags: [], author: 'Me', content: '요아정 최고' },
    { id: '5', title: '친구 집에서 야구를 봤다. 응원봉 들고 집에서 야구 보니까 직관 온 기분도 나고 재밌다.', date: '2025-05-30', type: 'Diary', images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAtNG-j-ie7tWnd13REOGyxBegQuBW50WW0GnggmPw_p6VkPUhpMvnYitf2xBN_YmGTYSAvUWT_wiTIh1UcjC-pvl36eY-2MrJ1Dg72oqYW2yYJl9Ky0SthXu3Guju1TYeXpc_ht7iuNK6te3b14XRBrUCU8gSdLBNvIG68VC2Cfwi67aKf8KCRTnwpArWRybl6J45dVZP-3XmyAJjXuqHz4nNLkgGyj4RsXg7XkUwSu2B7BaCGRPV3Itfw-wYQtLeLDMiSKbvhodQ'], tags: [], author: 'Me', content: '야구 직관' },
    { id: '6', title: '5년 전 친구가 준 기프티콘을 드디어 썼다. 허쉬초코바가 있는 편의점을 찾아 헤메다 드디어.', date: '2025-05-31', type: 'Diary', images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuDDaToylxCt8jk1WWUlpmIFyjsb4QXN7oIxVrSnoFXTJ2QF67WghA8z0GbRR38-JTYE9k5SHxeKUN_7ZLx6Cu_qs8jxlzaKHKWFN2JL3a5dhAR2MLRvyVShDhwupW2vVLMk7x7qslDnYmnwntjQDp_2tgZjHOSVD0di4OKblVwY-umvWclSWLyAbsokr1Ywfj7PTYJAT09R3M-iDkC9gGhUM7DpkKbG4cIZzwRBKD2R_7mxAIdBU6JkHgSkc6bn9jsJmWuRTRjhhb8'], tags: [], author: 'Me', content: '기프티콘' },
    { id: '7', title: '저녁 노을이 나무 사이로 비쳐 반짝이는 모습이 예뻤다.', date: '2025-06-01', type: 'Diary', images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuDSD08S0UljvZnhU4g6pQ5P7GWXana18YaCB0a7ExMSMH7Oau9TyYlRnXZtgVwMKzDD0yyvUIiGnKYRyoiGKB51J2omSSypU-n0jGYt-LM-z01c2VOUsTZpDMkXLvmplQJaQqjMHrlBq2Codgd0vbErYNzzQQUmFthbVuia5YxPTv4sqcSuwJxZo5n6cYbif--uFwu04-FMOUweNv3eBfvGUNXlqrkjtZSeF5Q22wgTDzozDOkX7N408_cCKGo9RI1nms3zW8x0IlU'], tags: [], author: 'Me', content: '노을' },
];

export const DiaryPage: React.FC = () => {
    const [filter, setFilter] = useState<'all' | 'me' | 'partner'>('all');

    // Group items by week
    const groupedItems = useMemo(() => {
        const sorted = [...MOCK_DIARY_ITEMS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const groups: { [key: string]: NotionItem[] } = {};

        sorted.forEach(item => {
            const date = parseISO(item.date);
            const year = date.getFullYear();
            const week = getWeek(date);
            const key = `${year} Week ${week}`;

            if (!groups[key]) {
                groups[key] = [];
            }
            // Filter logic
            if (filter === 'all' || (filter === 'me' && item.author === 'Me') || (filter === 'partner' && item.author === 'Partner')) {
                groups[key].push(item);
            }
        });

        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) delete groups[key];
        });

        return groups;
    }, [filter]);

    return (
        <div className="bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 font-sans antialiased min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
                <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight text-black dark:text-white">일기장</h1>
                    <div className="flex items-center space-x-3">
                        <button className="p-2 -mr-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                            <span className="material-icons-outlined text-2xl">search</span>
                        </button>
                    </div>
                </div>
                <div className="max-w-md mx-auto px-5 pb-4">
                    <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-[4px] shadow-sm transition-all ${filter === 'all' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white border border-gray-200 dark:border-zinc-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => setFilter('me')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-all ${filter === 'me' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white border border-gray-200 dark:border-zinc-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                        >
                            나
                        </button>
                        <button
                            onClick={() => setFilter('partner')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-all ${filter === 'partner' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white border border-gray-200 dark:border-zinc-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                        >
                            상대방
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-md mx-auto px-5 pt-6 space-y-10 pb-4">
                {Object.entries(groupedItems).map(([week, items]) => (
                    <section key={week}>
                        <div className="flex items-center space-x-2 mb-4 group cursor-pointer select-none">
                            <div className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <span className="material-icons-round text-gray-400 dark:text-gray-500 text-sm transform transition-transform group-hover:text-gray-600 dark:group-hover:text-gray-300 rotate-90">play_arrow</span>
                            </div>
                            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{week}</h2>
                            <div className="h-px bg-gray-100 dark:bg-zinc-800 flex-grow ml-2"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                            {items.map(item => (
                                <article key={item.id} className="flex flex-col group cursor-pointer relative">
                                    <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-lg bg-gray-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700">
                                        {item.images?.[0] ? (
                                            <img alt={item.title} className="w-full h-full object-cover bw-filter" src={item.images[0]} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-300">
                                                <span className="material-icons-outlined text-4xl">image</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5 px-0.5">
                                        <div className="flex items-center justify-between">
                                            <time className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wide">
                                                {format(parseISO(item.date), 'yyyy년 M월 d일')}
                                            </time>
                                            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white opacity-20"></span>
                                        </div>
                                        <p className="text-[13px] text-gray-600 dark:text-gray-400 font-serif leading-snug line-clamp-2">
                                            {item.title}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}
            </main>
        </div>
    );
};
