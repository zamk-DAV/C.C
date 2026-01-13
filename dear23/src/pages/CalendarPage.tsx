import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useEventData } from '../context/NotionContext';
import { EventDetailModal } from '../components/calendar/EventDetailModal';
import { createDiaryEntry } from '../lib/notion';
import { AnimatePresence, motion } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { useHaptics } from '../hooks/useHaptics';
import { updateDiaryEntry } from '../lib/notion';

// ... (existing imports)

interface DraggableEventProps {
    event: any;
    onDrop: (event: any, newDate: string) => void;
    onClick: (event: any) => void;
}

const DraggableEvent: React.FC<DraggableEventProps> = ({ event, onDrop, onClick }) => {
    const { heavy, medium } = useHaptics();
    const [isDragging, setIsDragging] = React.useState(false);

    const bind = useGesture({
        onDragStart: () => {
            setIsDragging(true);
            medium();
        },
        onDrag: ({ offset: [x, y], event: e }) => {
            // Prevent scrolling on mobile while dragging
            // In a real app we might use a portal or fixed overlay for the dragged item
            // For simplicity here, we rely on framer motion layout or transform
        },
        onDragEnd: ({ xy: [clientX, clientY], cancel, tap }) => {
            setIsDragging(false);
            if (tap) {
                onClick(event);
                return;
            }

            // Detect drop target
            // Hide the dragged element momentarily to find what's underneath
            // (Note: standard HTML5 Drag & Drop might be easier for this, but use-gesture gives better control on mobile)
            // A simple hack: elementFromPoint. 
            // Since we aren't using a Portal, the element is under the finger. 
            // To find the *Drop Target*, we need to ensure the dragged element doesn't block the point.
            // However, with framer-motion drag, it usually does.
            // Alternative: Calculation based on coordinates.

            // Standard Approach with elementFromPoint:
            const elements = document.elementsFromPoint(clientX, clientY);
            const dateCell = elements.find(el => el.getAttribute('data-date'));

            if (dateCell) {
                const newDate = dateCell.getAttribute('data-date');
                if (newDate && newDate !== event.date) {
                    heavy();
                    onDrop(event, newDate);
                }
            }
        },
        onTap: () => {
            onClick(event);
        }
    }, {
        drag: {
            delay: 200, // Long press to drag to distinguish from scroll
            filterTaps: true
        }
    });

    // Framer Motion drag is easier for visual following. 
    // But mixing useGesture and simple Framer Motion drag is complex.
    // Let's use Framer Motion's Drag controls directly for the visual part 
    // and use-gesture logic is implicitly handled or we use useGesture for everything.
    // Actually, framer motion has onDragEnd which is sufficient.

    return (
        <motion.div
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={1} // Allow free movement visuals
            dragSnapToOrigin={true} // Return if not dropped
            whileDrag={{ scale: 1.05, zIndex: 50, shadow: "0px 10px 20px rgba(0,0,0,0.2)" }}
            onDragStart={() => {
                setIsDragging(true);
                medium();
            }}
            onDragEnd={(e, info) => {
                setIsDragging(false);
                // elementFromPoint logic
                const point = info.point;
                // Framer motion point is relative to page? No, viewport.
                // We need to temporarily hide this element to see what's under it?
                // Actually pointer-events: none during drag prevents this issue but strictly capturing events.
                // Let's rely on the pointer event from onDragEnd.

                // Hack: use the pointer position from the event object
                const clientX = point.x;
                const clientY = point.y;

                const elements = document.elementsFromPoint(clientX, clientY);
                const dateCell = elements.find(el => el.getAttribute('data-date'));

                if (dateCell) {
                    const newDate = dateCell.getAttribute('data-date');
                    if (newDate && newDate !== event.date) {
                        heavy();
                        onDrop(event, newDate);
                    }
                }
            }}
            onTap={() => onClick(event)}
            className="py-6 flex items-baseline gap-6 group cursor-pointer hover:bg-white/5 transition-colors rounded-xl px-2 -mx-2 bg-background relative"
        >
            <span className="text-lg font-bold tabular-nums tracking-tighter shrink-0 min-w-[60px] text-primary">
                {"ALL DAY"}
            </span>
            <div className="flex flex-col gap-1 pointer-events-none">
                <p className="text-lg font-light leading-none text-primary group-hover:text-white transition-colors">{event.title}</p>
                {event.previewText && (
                    <p className="text-[13px] text-text-secondary font-light italic">{event.previewText}</p>
                )}
            </div>
            {isDragging && (
                <div className="absolute inset-0 border-2 border-primary rounded-xl opacity-50 animate-pulse" />
            )}
        </motion.div>
    );
};

export const CalendarPage: React.FC = () => {
    const { eventData, isLoading, refreshData } = useEventData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null); // Track event being edited
    const { heavy, medium } = useHaptics();

    // Calendar Grid Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = getDay(monthStart);
    const emptyDays = Array.from({ length: startDay });

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    // Gesture Logic for Swipe
    const bind = useGesture(
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

    // Filter events for selected date
    const selectedDateEvents = eventData.filter(event => {
        if (!event.date) return false;
        try {
            return isSameDay(parseISO(event.date), selectedDate);
        } catch (e) {
            return false;
        }
    });

    const handleSaveEvent = async (data: any) => {
        try {
            if (data.id) {
                // Update existing event
                await updateDiaryEntry(
                    data.id,
                    data.note || '',
                    [],
                    {
                        date: format(data.startDate, 'yyyy-MM-dd'),
                        title: data.title,
                        // Add other options if needed
                    }
                );
            } else {
                // Create new event
                await createDiaryEntry(
                    data.note || '',
                    [],
                    'Event',
                    {
                        date: format(data.startDate, 'yyyy-MM-dd'),
                        ...({ title: data.title } as any)
                    }
                );
            }
            await refreshData();
            setEditingEvent(null); // Reset editing state
        } catch (error) {
            console.error("Failed to save event:", error);
        }
    };

    const handleEventDrop = async (event: any, newDate: string) => {
        // Optimistic update could go here, but for safety:
        try {
            medium(); // Feedback before starting
            await updateDiaryEntry(
                event.id,
                event.content || '', // Keep existing content
                [], // Images?
                {
                    date: newDate,
                    title: event.title
                }
            );
            await refreshData();
            // Could add a toast "Event moved to ..."
        } catch (error) {
            console.error("Failed to move event:", error);
        }
    };

    const handleEventClick = (event: any) => {
        setEditingEvent(event);
        setIsModalOpen(true);
    };

    const handleOpenNewEvent = () => {
        setEditingEvent(null);
        setIsModalOpen(true);
    };

    return (
        <div className="relative flex min-h-[100dvh] w-full flex-col max-w-md mx-auto overflow-x-hidden border-x border-border bg-background text-primary transition-colors duration-300 font-display">
            {/* Header */}
            <header className="flex items-center justify-between px-8 pt-16 pb-8">
                <button onClick={handlePrevMonth} className="flex items-center justify-center text-primary hover:opacity-70 transition-opacity">
                    <span className="material-symbols-outlined text-xl">arrow_back_ios</span>
                </button>
                <h2 className="text-2xl font-light tracking-[0.2em] font-display text-primary">
                    {format(currentDate, 'M월', { locale: ko })}
                </h2>
                <button onClick={handleNextMonth} className="flex items-center justify-center text-primary hover:opacity-70 transition-opacity">
                    <span className="material-symbols-outlined text-xl">arrow_forward_ios</span>
                </button>
            </header>

            {/* Calendar Grid */}
            <div
                {...bind() as any}
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
                        const hasEvent = eventData.some(e => {
                            if (!e.date) return false;
                            try { return isSameDay(parseISO(e.date), day); } catch { return false; }
                        });

                        return (
                            <button
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                data-date={format(day, 'yyyy-MM-dd')} // Add identifier for drop target
                                className="relative h-10 w-full flex flex-col items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                            >
                                {isSelected && (
                                    <motion.div
                                        layoutId="selected-day"
                                        className="absolute size-8 rounded-full border border-primary"
                                    />
                                )}
                                <span className={`relative text-base z-10 ${isSelected ? 'font-medium' : 'font-light'} `}>
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
                        selectedDateEvents.map((event: any) => (
                            <DraggableEvent
                                key={event.id}
                                event={event}
                                onDrop={handleEventDrop}
                                onClick={handleEventClick}
                            />
                        ))
                    ) : (
                        <div className="py-10 text-center text-text-secondary font-light italic">
                            일정이 없습니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleOpenNewEvent}
                className="fixed bottom-24 right-6 w-14 h-14 bg-white text-black rounded-full shadow-2xl flex items-center justify-center z-40"
            >
                <span className="material-symbols-outlined text-3xl">add</span>
            </motion.button>

            {/* Event Detail Modal */}
            <EventDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvent}
                initialDate={selectedDate}
                initialEvent={editingEvent} // Pass event for editing
            />

            {/* Bottom Nav is managed by MainLayout */}
        </div>
    );
};
