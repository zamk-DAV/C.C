import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotion } from '../context/NotionContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import type { CalendarEvent } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';

export const CalendarPage: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const { coupleData, userData } = useAuth();
    const { diaryData } = useNotion();

    const [firestoreEvents, setFirestoreEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. Firestore Events - separate useEffect (real-time)
    useEffect(() => {
        if (!coupleData?.id) {
            setLoading(false);
            return;
        }

        const eventsQuery = query(
            collection(db, 'couples', coupleData.id, 'events'),
            orderBy('date', 'asc')
        );

        const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
            const events = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                    type: 'Event'
                } as CalendarEvent;
            });
            setFirestoreEvents(events);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [coupleData?.id]);

    // 2. Convert NotionContext diaryData to CalendarEvents
    const diaryEvents = useMemo((): CalendarEvent[] => {
        if (!diaryData.length) return [];

        return diaryData.map(item => ({
            id: item.id,
            title: item.title,
            date: new Date(item.date),
            time: '00:00',
            type: 'Diary',
            note: item.previewText || '',
            author: item.author === userData?.name || item.author === 'Me' ? 'Me' : 'Partner'
        })) as CalendarEvent[];
    }, [diaryData, userData?.name]);

    // Merge events
    const events = [...firestoreEvents, ...diaryEvents];

    // Calendar Grid Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDay = getDay(monthStart);
    const emptyDays = Array.from({ length: startDay });

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const selectedDateEvents = events.filter(event =>
        isSameDay(event.date, selectedDate)
    );

    return (
        <div className="relative flex min-h-[100dvh] w-full flex-col max-w-md mx-auto overflow-x-hidden border-x border-border bg-background text-primary font-display transition-colors duration-300">
            {/* Header */}
            <header className="flex items-center justify-between px-8 pt-16 pb-8">
                <button onClick={handlePrevMonth} className="flex items-center justify-center hover:text-primary/70 transition-colors">
                    <span className="material-symbols-outlined text-xl">arrow_back_ios</span>
                </button>
                <h2 className="text-2xl font-light tracking-[0.2em] font-display">
                    {format(currentDate, 'M월', { locale: ko })}
                </h2>
                <button onClick={handleNextMonth} className="flex items-center justify-center hover:text-primary/70 transition-colors">
                    <span className="material-symbols-outlined text-xl">arrow_forward_ios</span>
                </button>
            </header>

            {/* Calendar Grid */}
            <div className="px-8 mb-10">
                {/* Days of Week */}
                <div className="grid grid-cols-7 mb-4 border-b border-border pb-2">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                        <p key={day} className="text-[10px] font-medium tracking-widest flex items-center justify-center text-text-secondary">
                            {day}
                        </p>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-y-2">
                    {/* Empty Slots */}
                    {emptyDays.map((_, i) => (
                        <div key={`empty-${i}`} className="h-10 w-full"></div>
                    ))}

                    {/* Days */}
                    {daysInMonth.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const hasEvent = events.some(e => isSameDay(e.date, day));

                        return (
                            <button
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className="relative h-10 w-full flex flex-col items-center justify-center hover:bg-secondary rounded-full transition-colors"
                            >
                                {isSelected && (
                                    <div className="absolute size-8 rounded-full border border-primary"></div>
                                )}
                                <span className={`relative text-base ${isSelected ? 'font-medium' : 'font-light'}`}>
                                    {format(day, 'd')}
                                </span>
                                {hasEvent && !isSelected && (
                                    <div className="absolute bottom-1 w-[3px] h-[3px] bg-primary rounded-full"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Date Header */}
            <div className="px-8 py-2 mb-4 border-b border-border">
                <h3 className="text-xs uppercase tracking-[0.25em] text-text-secondary mb-1">
                    {format(selectedDate, 'EEEE', { locale: ko })}
                </h3>
                <p className="text-xl font-display italic tracking-tight">
                    {format(selectedDate, 'M월 d일', { locale: ko })}
                </p>
            </div>

            {/* Events List */}
            <div className="px-8 flex-1 pb-32">
                <div className="divide-y divide-border">
                    {loading ? (
                        <div className="py-10 text-center text-text-secondary/50 font-light italic">
                            로딩 중...
                        </div>
                    ) : selectedDateEvents.length > 0 ? (
                        selectedDateEvents.map(event => (
                            <div key={event.id} className="py-6 flex items-baseline gap-6">
                                <span className="text-lg font-bold tabular-nums tracking-tighter shrink-0 min-w-[60px]">
                                    {event.time}
                                </span>
                                <div className="flex flex-col gap-1">
                                    <p className="text-lg font-light leading-none">{event.title}</p>
                                    {event.note && (
                                        <p className="text-[13px] text-text-secondary font-light italic">{event.note}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center text-text-secondary/50 font-light italic">
                            일정이 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
