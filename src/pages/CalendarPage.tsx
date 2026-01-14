import React, { useState, useMemo } from 'react';
import { useEventData } from '../context/NotionContext';
import type { CalendarEvent, NotionItem } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { EventWriteModal } from '../components/calendar/EventWriteModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { useHaptics } from '../hooks/useHaptics';

interface EventItemProps {
    event: CalendarEvent;
    onClick: (event: CalendarEvent) => void;
}

const LinkRenderer = ({ text }: { text: string }) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <span>
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    return (
                        <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent transition-all break-all z-20 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </span>
    );
};

const EventItem: React.FC<EventItemProps> = ({ event, onClick }) => {
    // Standardize Color Logic: Use primary text if undefined, otherwise custom color logic if needed
    // User requested "Theme Color" basically, but let's respect the event color if it acts as a category accent
    // However, user said "Remove color part when adding/modifying... just make it theme color".
    // So we should prioritize theme colors (primary/text-primary) unless it's strictly required.
    // Let's use the event's color as a subtle accept marker if present, or just Theme.

    // For now, let's keep the color indicator distinct but subtle, or just rely on standard theme.
    // User: "무조건 그냥 테마에 맞는 색상으로 되도록" -> This implies input side.
    // Output side: If older events have colors, we can show them, or override. 
    // Let's keep existing color property for now but perhaps mute its effect or standardize it.

    const displayColor = event.color && event.color !== 'default' ? event.color : undefined;

    return (
        <motion.div
            onClick={() => onClick(event)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            className="py-5 flex items-start gap-4 group cursor-pointer hover:bg-secondary/40 transition-all rounded-2xl px-4 -mx-2 bg-background relative overflow-hidden active:bg-secondary/60"
        >
            {/* Time Column */}
            <div className="flex flex-col items-center shrink-0 w-[50px] pt-0.5">
                <span className="text-lg font-bold tabular-nums tracking-tighter text-primary">
                    {event.time}
                </span>
                {displayColor && (
                    <div className="w-1 h-3 rounded-full mt-1 opacity-50" style={{ backgroundColor: displayColor }} />
                )}
            </div>

            {/* Content Container */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
                {/* Top Row: Title & Icons */}
                <div className="flex items-start justify-between gap-3">
                    <p className="text-[17px] font-normal leading-tight text-text-primary break-words whitespace-pre-wrap">
                        {event.title}
                    </p>

                    {/* Icons Row (Right aligned) */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        {event.isShared && <span className="material-symbols-outlined text-[16px] text-[#FF453A]">favorite</span>}
                        {event.isImportant && <span className="material-symbols-outlined text-[17px] text-[#FFD60A]">star</span>}
                    </div>
                </div>

                {/* Bottom Row: Note & Author */}
                {(event.note || event.author) && (
                    <div className="flex flex-col gap-0.5 text-[14px] text-text-secondary font-light">
                        {event.note && (
                            <div className="break-words opacity-90 leading-snug">
                                <LinkRenderer text={event.note} />
                            </div>
                        )}
                        {event.author && (
                            <div className="flex justify-end mt-1">
                                <span className="text-[10px] px-1.5 py-px rounded-md bg-secondary text-text-secondary/70 font-medium tracking-tight">
                                    {event.author}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export const CalendarPage: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined);
    const [direction, setDirection] = useState(0); // -1 for prev, 1 for next

    // Use Notion Data
    const { eventData, isLoading: isNotionLoading, refreshData } = useEventData();
    const { heavy, medium } = useHaptics();

    // Map Notion Items to Calendar Events & Filter Deletions
    const calendarEvents = useMemo(() => {
        return eventData
            .filter(item => !item.isOptimisticDelete)
            .map((item: NotionItem): CalendarEvent => {
                const eventDate = item.date ? parseISO(item.date) : new Date();

                return {
                    id: item.id,
                    title: item.title,
                    date: eventDate,
                    time: item.date ? format(parseISO(item.date), 'HH:mm') : '00:00',
                    type: 'Event',
                    note: item.previewText || '',
                    author: item.author,
                    color: item.color,
                    isImportant: item.isImportant,
                    isShared: item.isShared,
                    endDate: item.endDate ? parseISO(item.endDate) : undefined
                };
            });
    }, [eventData]);

    const events = calendarEvents;

    const loading = isNotionLoading && calendarEvents.length === 0;

    // Calendar Grid Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDay = getDay(monthStart);
    const emptyDays = Array.from({ length: startDay });

    const handlePrevMonth = () => {
        setDirection(-1);
        setCurrentDate(subMonths(currentDate, 1));
    };
    const handleNextMonth = () => {
        setDirection(1);
        setCurrentDate(addMonths(currentDate, 1));
    };

    // Gestures for Month Navigation
    const bindGesture = useGesture(
        {
            onDrag: ({ swipe: [swipeX] }) => {
                if (swipeX === -1) {
                    heavy();
                    handleNextMonth();
                } else if (swipeX === 1) {
                    heavy();
                    handlePrevMonth();
                }
            },
        },
        {
            drag: {
                axis: 'x',
                swipe: { distance: 50, velocity: 0.1 },
            },
        }
    );

    // Filter and Sort Events
    const selectedDateEvents = useMemo(() => {
        const dailyEvents = events.filter(event => isSameDay(event.date, selectedDate));
        // Sort by Time: 09:00 -> 10:00 -> 15:00
        return dailyEvents.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
    }, [events, selectedDate]);

    const handleEventSuccess = () => {
        refreshData();
        setIsEventModalOpen(false);
        setEditingEvent(undefined);
    };

    const handleEventClick = (event: CalendarEvent) => {
        setEditingEvent(event);
        setIsEventModalOpen(true);
    };

    const handleOpenNewEvent = (date?: Date) => {
        setEditingEvent(undefined);
        if (date) setSelectedDate(date);
        setIsEventModalOpen(true);
    };

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

            {/* Calendar Grid Section with Animation */}
            <div className="relative px-8 mb-10 overflow-hidden min-h-[300px]">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentDate.toISOString()}
                        custom={direction}
                        variants={{
                            enter: (direction: number) => ({
                                x: direction > 0 ? 300 : -300,
                                opacity: 0
                            }),
                            center: {
                                zIndex: 1,
                                x: 0,
                                opacity: 1
                            },
                            exit: (direction: number) => ({
                                zIndex: 0,
                                x: direction < 0 ? 300 : -300,
                                opacity: 0
                            })
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        className="w-full h-full"
                    >
                        <div
                            {...bindGesture() as any}
                            className="touch-pan-y"
                        >
                            <div className="grid grid-cols-7 gap-y-2">
                                {emptyDays.map((_, i) => (
                                    <div key={`empty-${i}`} className="h-10 w-full"></div>
                                ))}

                                {daysInMonth.map((day) => {
                                    const isSelected = isSameDay(day, selectedDate);
                                    const hasEvent = events.some(e => isSameDay(e.date, day));

                                    return (
                                        <button
                                            key={day.toString()}
                                            onClick={() => {
                                                medium();
                                                setSelectedDate(day);
                                            }}
                                            className="relative h-10 w-full flex flex-col items-center justify-center hover:bg-secondary rounded-full transition-colors active:scale-95 touch-manipulation"
                                        >
                                            {isSelected && (
                                                <motion.div
                                                    layoutId="selected-day"
                                                    className="absolute size-9 rounded-full border border-primary/40 bg-secondary/30"
                                                    initial={false}
                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                />
                                            )}
                                            <span className={`relative text-base z-10 ${isSelected ? 'font-medium text-primary' : 'font-light text-text-secondary'}`}>
                                                {format(day, 'd')}
                                            </span>
                                            {hasEvent && !isSelected && (
                                                <div className="absolute bottom-1.5 w-[4px] h-[4px] bg-primary/80 rounded-full shadow-sm"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Selected Date Header */}
            <div className="px-8 py-2 mb-4 border-b border-border/50 flex justify-between items-end">
                <div>
                    <h3 className="text-xs uppercase tracking-[0.25em] text-text-secondary mb-1">
                        {format(selectedDate, 'EEEE', { locale: ko })}
                    </h3>
                    <p className="text-xl font-display italic tracking-tight">
                        {format(selectedDate, 'M월 d일', { locale: ko })}
                    </p>
                </div>
            </div>

            {/* Events List */}
            <div className="px-8 flex-1 pb-32">
                <div className="divide-y divide-border/10">
                    {loading ? (
                        <div className="py-10 text-center text-text-secondary/50 font-light italic">
                            로딩 중...
                        </div>
                    ) : selectedDateEvents.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {selectedDateEvents.map(event => (
                                <EventItem
                                    key={event.id}
                                    event={event}
                                    onClick={handleEventClick}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-10 text-center text-text-secondary/50 font-light italic flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-3xl opacity-20">event_busy</span>
                            <span>일정이 없습니다.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleOpenNewEvent()}
                className="fixed bottom-24 right-6 size-14 bg-primary text-background rounded-full shadow-xl flex items-center justify-center z-20"
            >
                <span className="material-symbols-outlined text-2xl">add</span>
            </motion.button>

            {/* Event Write Modal */}
            <EventWriteModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                onSuccess={handleEventSuccess}
                selectedDate={selectedDate}
                editEvent={editingEvent}
            />
        </div>
    );
};
