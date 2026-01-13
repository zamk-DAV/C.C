import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useEventData } from '../context/NotionContext';

export const CalendarPage: React.FC = () => {
    const navigate = useNavigate();
    const { eventData, isLoading } = useEventData();
    const [currentDate, setCurrentDate] = useState(new Date()); // Calendar view date
    const [selectedDate, setSelectedDate] = useState(new Date()); // Selected specific date

    // Calendar Grid Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Fill empty slots for start of week
    const startDay = getDay(monthStart);
    const emptyDays = Array.from({ length: startDay });

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    // Filter events for selected date
    const selectedDateEvents = eventData.filter(event => {
        if (!event.date) return false;
        try {
            return isSameDay(parseISO(event.date), selectedDate);
        } catch (e) {
            return false;
        }
    });

    return (
        <div className="relative flex min-h-[100dvh] w-full flex-col max-w-md mx-auto overflow-x-hidden border-x border-border bg-background text-primary transition-colors duration-300 font-display">
            {/* Header */}
            <header className="flex items-center justify-between px-8 pt-16 pb-8">
                <button onClick={handlePrevMonth} className="flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-xl">arrow_back_ios</span>
                </button>
                <h2 className="text-2xl font-light tracking-[0.2em] font-display text-primary">
                    {format(currentDate, 'M월', { locale: ko })}
                </h2>
                <button onClick={handleNextMonth} className="flex items-center justify-center text-primary">
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
                        const hasEvent = eventData.some(e => {
                            if (!e.date) return false;
                            try {
                                return isSameDay(parseISO(e.date), day);
                            } catch {
                                return false;
                            }
                        });

                        return (
                            <button
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className="relative h-10 w-full flex flex-col items-center justify-center"
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
                <p className="text-xl font-display italic tracking-tight text-primary">
                    {format(selectedDate, 'M월 d일', { locale: ko })}
                </p>
            </div>

            {/* Events List */}
            <div className="px-8 flex-1 pb-32">
                <div className="divide-y divide-border">
                    {isLoading ? (
                        <div className="py-10 text-center text-text-secondary font-light italic">
                            불러오는 중...
                        </div>
                    ) : selectedDateEvents.length > 0 ? (
                        selectedDateEvents.map(event => (
                            <div key={event.id} className="py-6 flex items-baseline gap-6">
                                <span className="text-lg font-bold tabular-nums tracking-tighter shrink-0 min-w-[60px] text-primary">
                                    {/* Usually we don't have time in current schema but can add or use default */}
                                    {"ALL DAY"}
                                </span>
                                <div className="flex flex-col gap-1">
                                    <p className="text-lg font-light leading-none text-primary">{event.title}</p>
                                    {event.previewText && (
                                        <p className="text-[13px] text-text-secondary font-light italic">{event.previewText}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center text-text-secondary font-light italic">
                            일정이 없습니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Nav is managed by MainLayout */}
        </div>
    );
};
