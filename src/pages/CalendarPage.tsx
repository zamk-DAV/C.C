import React, { useState, useMemo } from 'react';
// import { useAuth } from '../context/AuthContext';
import { useEventData } from '../context/NotionContext';
import { updateDiaryEntry } from '../lib/notion';
import type { CalendarEvent, NotionItem } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { EventWriteModal } from '../components/calendar/EventWriteModal';
import { motion } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { useHaptics } from '../hooks/useHaptics';

interface DraggableEventProps {
    event: CalendarEvent;
    onDrop: (event: CalendarEvent, newDate: string) => void;
    onClick: (event: CalendarEvent) => void;
    onDrag?: (y: number) => void;
}

const DraggableEvent: React.FC<DraggableEventProps> = ({ event, onDrop, onClick, onDrag }) => {
    const { heavy, medium } = useHaptics();
    const [isDragging, setIsDragging] = React.useState(false);
    const [dropSuccess, setDropSuccess] = React.useState(false);

    // Color Logic: Use primary if default/undefined, otherwise use custom color
    const isCustomColor = event.color && event.color !== 'default';
    const eventColor = isCustomColor ? event.color : undefined;

    return (
        <motion.div
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={1}
            dragSnapToOrigin={true}
            onTap={() => onClick(event)}
            initial={{ opacity: 1, scale: 1 }}
            animate={{
                scale: dropSuccess ? [1, 1.05, 1] : 1,
                opacity: dropSuccess ? [1, 0.8, 1] : 1
            }}
            whileDrag={{
                scale: 1.03,
                zIndex: 100,
                boxShadow: "0px 15px 30px rgba(0,0,0,0.25)",
                cursor: "grabbing"
            }}
            onDragStart={() => {
                setIsDragging(true);
                medium();
            }}
            onDrag={(_, info) => {
                onDrag?.(info.point.y);
            }}
            onDragEnd={(_, info) => {
                setIsDragging(false);
                const point = info.point;
                const clientX = point.x;
                const clientY = point.y;

                const elements = document.elementsFromPoint(clientX, clientY);
                const dateCell = elements.find(el => el.getAttribute('data-date'));

                if (dateCell) {
                    const newDate = dateCell.getAttribute('data-date');
                    if (newDate) {
                        const eventDateStr = event.date instanceof Date
                            ? format(event.date, 'yyyy-MM-dd')
                            : format(new Date(event.date), 'yyyy-MM-dd');

                        if (newDate !== eventDateStr) {
                            heavy();
                            setDropSuccess(true);
                            setTimeout(() => setDropSuccess(false), 300);
                            onDrop(event, newDate);
                        }
                    }
                }
            }}
            className={`py-5 flex items-center gap-5 group cursor-grab hover:bg-secondary/40 transition-all rounded-2xl px-4 -mx-2 bg-background relative overflow-hidden ${isDragging ? 'cursor-grabbing ring-2 ring-primary/30' : ''
                }`}
        >
            {/* Color Indicator */}
            <motion.div
                className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full ${!eventColor ? 'bg-primary' : ''}`}
                style={{ backgroundColor: eventColor }}
                animate={{ width: isDragging ? 4 : 5 }}
                transition={{ duration: 0.15 }}
            />

            {/* Time */}
            <span
                className={`text-lg font-bold tabular-nums tracking-tighter shrink-0 min-w-[50px] ${!eventColor ? 'text-primary' : ''}`}
                style={{ color: eventColor }}
            >
                {event.time}
            </span>

            {/* Content Container */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-[17px] font-normal leading-tight truncate text-text-primary">
                        {event.title}
                    </p>
                    {/* Icons Row */}
                    <div className="flex items-center gap-1 shrink-0">
                        {event.isShared && <span className="material-symbols-outlined text-[15px] text-[#FF453A]">favorite</span>}
                        {event.isImportant && <span className="material-symbols-outlined text-[16px] text-[#FFD60A]">star</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[13px] text-text-secondary font-light">
                    {/* Author Badge */}
                    {event.author && (
                        <span className="text-[10px] px-1.5 py-px rounded-md bg-secondary text-text-secondary font-medium tracking-tight">
                            {event.author}
                        </span>
                    )}
                    {/* Note */}
                    {event.note && (
                        <span className="italic truncate opacity-80">{event.note}</span>
                    )}
                </div>
            </div>

            {/* Drag indicator overlay */}
            {isDragging && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 border-2 border-primary/50 rounded-2xl bg-primary/5 pointer-events-none"
                />
            )}
        </motion.div>
    );
};

export const CalendarPage: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined);

    // const { coupleData } = useAuth();
    // Use Notion Data instead of Firestore
    const { eventData, isLoading: isNotionLoading, refreshData } = useEventData();
    const { heavy, medium } = useHaptics();

    // Map Notion Items to Calendar Events
    const calendarEvents = useMemo(() => {
        return eventData.map((item: NotionItem): CalendarEvent => {
            // Parse date safely (handling undefined or different formats)
            const eventDate = item.date ? parseISO(item.date) : new Date();

            return {
                id: item.id,
                title: item.title,
                date: eventDate,
                time: item.date ? format(parseISO(item.date), 'HH:mm') : '00:00', // Extract time if available in ISO
                type: 'Event',
                note: item.previewText || '',
                author: item.author,
                color: item.color,
                isImportant: item.isImportant,
                isShared: item.isShared,
                endDate: item.endDate ? parseISO(item.endDate) : undefined
                // Add images if needed mapping
            };
        });
    }, [eventData]);

    // Use derived state for loading to avoid flicker if cache is present
    const loading = isNotionLoading && calendarEvents.length === 0;

    // Auto-scroll logic
    const lastScrollTime = React.useRef(0);
    const handleDrag = (y: number) => {
        const now = Date.now();
        if (now - lastScrollTime.current < 600) return; // Throttle scroll

        // Define thresholds relative to viewport
        const topThreshold = 150;
        const bottomThreshold = window.innerHeight - 150;

        if (y < topThreshold) {
            handlePrevMonth();
            lastScrollTime.current = now;
            heavy();
        } else if (y > bottomThreshold) {
            handleNextMonth();
            lastScrollTime.current = now;
            heavy();
        }
    };

    // 1. Notion Events (Derived from Context)
    // No need for separate useEffect, calendarEvents is already memoized above.

    const events = calendarEvents;

    // Calendar Grid Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDay = getDay(monthStart);
    const emptyDays = Array.from({ length: startDay });

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    // Gestures for Month Navigation & Long Press
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

    // Bind long press separately to attach to individual dates
    const bindLongPress = useGesture({
        onLongPress: (state: any) => {
            const date = state.args[0];
            medium();
            handleOpenNewEvent(date);
        }
    } as any);

    const selectedDateEvents = events.filter(event =>
        isSameDay(event.date, selectedDate)
    );

    const handleEventSuccess = () => {
        refreshData();
        setIsEventModalOpen(false);
        setEditingEvent(undefined);
    };

    const handleEventDrop = async (event: CalendarEvent, newDate: string) => {
        try {
            medium();
            // Call API to update date
            await updateDiaryEntry(
                event.id,
                event.title, // Keep title/content
                [],
                {
                    date: newDate,
                    title: event.title,
                    mood: event.time ? `${event.time} - ${event.note || ''}`.trim() : event.note || undefined,
                    endDate: event.endDate ? format(new Date(event.endDate), 'yyyy-MM-dd') : undefined,
                    color: event.color,
                    isImportant: event.isImportant,
                    isShared: event.isShared
                }
            );
            await refreshData(); // Force refresh to update UI
        } catch (error) {
            console.error("Failed to move event:", error);
            alert("일정 이동에 실패했습니다.");
        }
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

            {/* Calendar Grid */}
            <div
                {...bindGesture() as any}
                className="px-8 mb-10 touch-pan-y"
            >
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
                                {...bindLongPress(day) as any}
                                data-date={format(day, 'yyyy-MM-dd')} // Add identifier for drop target
                                className="relative h-10 w-full flex flex-col items-center justify-center hover:bg-secondary rounded-full transition-colors active:scale-90"
                            >
                                {isSelected && (
                                    <motion.div
                                        layoutId="selected-day"
                                        className="absolute size-8 rounded-full border border-primary"
                                    />
                                )}
                                <span className={`relative text-base z-10 ${isSelected ? 'font-medium' : 'font-light'}`}>
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
                            <DraggableEvent
                                key={event.id}
                                event={event}
                                onDrop={handleEventDrop}
                                onClick={handleEventClick}
                                onDrag={handleDrag}
                            />
                        ))
                    ) : (
                        <div className="py-10 text-center text-text-secondary/50 font-light italic">
                            일정이 없습니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleOpenNewEvent()}
                className="fixed bottom-24 right-6 size-14 bg-primary text-background rounded-full shadow-xl flex items-center justify-center z-10"
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
