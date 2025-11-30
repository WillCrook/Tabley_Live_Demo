import { CardContent } from "@/components/ui/card";
import { Users, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, X, Pencil, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { format, addDays, subDays, startOfDay, addHours, subHours, differenceInMinutes, setHours, setMinutes, startOfHour } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBookings, updateBooking as updateBookingAPI, getTables, getRestaurants } from "@/lib/api";
import type { Booking } from "@/types/booking";

interface BookingCalendarProps {
    compact?: boolean;
    className?: string;
    initialTime?: Date;
    onSlotClick?: (date: string, time: string, table: string) => void;
}

const BookingCalendar = ({ compact = false, className, initialTime, onSlotClick }: BookingCalendarProps) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch bookings from API
    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ['bookings'],
        queryFn: () => getBookings(),
    });

    const { data: restaurants = [] } = useQuery({
        queryKey: ['restaurants'],
        queryFn: () => getRestaurants(),
    });

    const primaryRestaurant = restaurants[0];

    const { data: tablesData = [], isLoading: isLoadingTables } = useQuery({
        queryKey: ['tables', primaryRestaurant?.id],
        queryFn: () => getTables(primaryRestaurant?.id ? String(primaryRestaurant.id) : undefined),
        enabled: !!primaryRestaurant?.id,
    });

    const tableNumbers = useMemo(() => {
        if (tablesData.length) {
            return [...tablesData]
                .sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true, sensitivity: 'base' }))
                .map((table) => ({ id: table.id, tableNumber: String(table.table_number) }));
        }

        const derived = Array.from(new Set(
            bookings
                .map((booking) => (booking.table !== undefined && booking.table !== null ? String(booking.table) : ""))
                .filter((table) => table !== "")
        ));

        if (derived.length) {
            return derived
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
                .map((tableNumber) => ({ id: tableNumber, tableNumber }));
        }

        return [];
    }, [tablesData, bookings]);

    const normalizeTable = (value: unknown) => (value !== undefined && value !== null ? String(value) : "");

    // Mutation for updating bookings
    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: number; updates: Partial<Booking> }) =>
            updateBookingAPI(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentTime, setCurrentTime] = useState<Date>(initialTime || new Date());
    const [timeInputValue, setTimeInputValue] = useState(format(initialTime || new Date(), "HH:mm"));
    const [isLive, setIsLive] = useState(!initialTime);
    const [isQuickEdit, setIsQuickEdit] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<Map<number, { time: string; table: string; duration: number }>>(new Map());
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [clickOffsetPercent, setClickOffsetPercent] = useState<number>(0);
    const [selectedBookingWidth, setSelectedBookingWidth] = useState<number>(0);
    const [previewPosition, setPreviewPosition] = useState<{ table: string; time: string; leftPercent: number } | null>(null);

    // Resize state
    const [resizeMode, setResizeMode] = useState<"left" | "right" | null>(null);
    const [resizeBooking, setResizeBooking] = useState<Booking | null>(null);
    const [previewDuration, setPreviewDuration] = useState<number>(0);
    const [previewTime, setPreviewTime] = useState<string>("");

    // Duration limits (in minutes)
    const MIN_DURATION = 60;  // 1 hour
    const MAX_DURATION = 180; // 3 hours

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            if (isLive) {
                const now = new Date();
                setCurrentTime(now);
                setTimeInputValue(format(now, "HH:mm"));
            }
        }, 60000);
        return () => clearInterval(timer);
    }, [isLive]);

    // Update when initialTime prop changes
    useEffect(() => {
        if (initialTime) {
            setCurrentTime(initialTime);
            setTimeInputValue(format(initialTime, "HH:mm"));
            setSelectedDate(initialTime);
            setIsLive(false);
        }
    }, [initialTime]);

    const toggleLive = () => {
        if (!isLive) {
            // If turning ON, reset to current time immediately
            const now = new Date();
            setCurrentTime(now);
            setTimeInputValue(format(now, "HH:mm"));
        }
        setIsLive(!isLive);
    };

    const WINDOW_HOURS_PREV = 1;
    const WINDOW_HOURS_NEXT = 6;
    const TOTAL_WINDOW_MINUTES = (WINDOW_HOURS_PREV + WINDOW_HOURS_NEXT) * 60;
    const CURRENT_TIME_POS = (WINDOW_HOURS_PREV / (WINDOW_HOURS_PREV + WINDOW_HOURS_NEXT)) * 100;
    const TABLE_LABEL_WIDTH = compact ? 60 : 80;

    const isToday = startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime();

    // Calculate window based on current time of day, applied to selected date
    const windowStart = subHours(currentTime, WINDOW_HOURS_PREV);
    // We only use the TIME from windowStart, but applied to selectedDate
    const viewStart = setMinutes(setHours(selectedDate, windowStart.getHours()), windowStart.getMinutes());

    // Generate grid lines (whole hours)
    const gridLines = [];
    const firstHour = addHours(startOfHour(viewStart), 1);
    for (let i = 0; i < WINDOW_HOURS_PREV + WINDOW_HOURS_NEXT; i++) {
        const lineTime = addHours(firstHour, i);
        const diff = differenceInMinutes(lineTime, viewStart);
        if (diff <= TOTAL_WINDOW_MINUTES) {
            gridLines.push({
                time: lineTime,
                position: (diff / TOTAL_WINDOW_MINUTES) * 100
            });
        }
    }

    // Generate half-hour grid lines (fainter)
    const halfHourGridLines = [];
    const startSlot = startOfHour(viewStart);
    // Generate half-hour lines for the entire window
    for (let i = 0; i < (WINDOW_HOURS_PREV + WINDOW_HOURS_NEXT) * 2 + 2; i++) {
        const lineTime = addHours(startSlot, i * 0.5);
        const diff = differenceInMinutes(lineTime, viewStart);
        // Only add if it's a half-hour (30 minutes) and within the window
        if (lineTime.getMinutes() === 30 && diff > 0 && diff <= TOTAL_WINDOW_MINUTES) {
            halfHourGridLines.push({
                time: lineTime,
                position: (diff / TOTAL_WINDOW_MINUTES) * 100
            });
        }
    }

    // Generate slots (half-hour periods)
    const slots = [];
    // Generate enough slots to cover the window (every 30 minutes)
    const totalSlots = (WINDOW_HOURS_PREV + WINDOW_HOURS_NEXT) * 2 + 4;
    for (let i = 0; i < totalSlots; i++) {
        const slotTime = addHours(startSlot, i * 0.5);
        const diff = differenceInMinutes(slotTime, viewStart);
        slots.push({
            time: slotTime,
            position: (diff / TOTAL_WINDOW_MINUTES) * 100
        });
    }

    const handlePreviousDay = () => {
        setIsLive(false);
        setSelectedDate(subDays(selectedDate, 1));
    };

    const handleNextDay = () => {
        setIsLive(false);
        setSelectedDate(addDays(selectedDate, 1));
    };

    const handlePreviousHour = () => {
        setIsLive(false);
        const newTime = subHours(currentTime, 1);
        setCurrentTime(newTime);
        setTimeInputValue(format(newTime, "HH:mm"));
    };

    const handleNextHour = () => {
        setIsLive(false);
        const newTime = addHours(currentTime, 1);
        setCurrentTime(newTime);
        setTimeInputValue(format(newTime, "HH:mm"));
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsLive(false);
        setTimeInputValue(e.target.value);
    };

    const handleTimeSubmit = () => {
        // Simple time parsing (HH:mm)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (timeRegex.test(timeInputValue)) {
            const [hours, minutes] = timeInputValue.split(":").map(Number);
            const newTime = setMinutes(setHours(currentTime, hours), minutes);
            setCurrentTime(newTime);
            // Ensure format is HH:mm (e.g., 1:30 -> 01:30)
            setTimeInputValue(format(newTime, "HH:mm"));
        } else {
            // Invalid time, revert to current time
            setTimeInputValue(format(currentTime, "HH:mm"));
        }
    };

    const getBookingPosition = (booking: Booking) => {
        const [hours, minutes] = booking.time.split(":").map(Number);
        const bookingDate = setMinutes(setHours(new Date(booking.date), hours), minutes);
        const diff = differenceInMinutes(bookingDate, viewStart);
        return (diff / TOTAL_WINDOW_MINUTES) * 100;
    };

    const getWidth = (durationMinutes: number) => {
        return (durationMinutes / TOTAL_WINDOW_MINUTES) * 100;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed":
                return "bg-emerald-500 hover:bg-emerald-600 text-white";
            case "new_booking":
                return "bg-emerald-500 hover:bg-emerald-600 text-white";
            default:
                return "bg-muted text-foreground";
        }
    };

    // Quick Edit handlers
    const clearSelectionState = () => {
        setSelectedBooking(null);
        setClickOffsetPercent(0);
        setSelectedBookingWidth(0);
        setPreviewPosition(null);
        // Also clear resize state
        setResizeMode(null);
        setResizeBooking(null);
        setPreviewDuration(0);
        setPreviewTime("");
    };

    const toggleQuickEdit = () => {
        if (isQuickEdit) {
            // If turning off, clear pending changes and selection
            setPendingChanges(new Map());
            clearSelectionState();
        }
        setIsQuickEdit(!isQuickEdit);
    };

    const handleCancelQuickEdit = () => {
        setPendingChanges(new Map());
        clearSelectionState();
        setIsQuickEdit(false);
    };

    const handleApplyQuickEdit = () => {
        // Apply all pending changes via API
        pendingChanges.forEach((changes, bookingId) => {
            updateMutation.mutate({ id: bookingId, updates: changes });
        });
        setPendingChanges(new Map());
        clearSelectionState();
        setIsQuickEdit(false);
    };

    // Get effective booking data (with pending changes applied for display)
    const getEffectiveBooking = (booking: Booking) => {
        const pending = pendingChanges.get(booking.id);
        if (pending) {
            return { ...booking, ...pending };
        }
        // Show preview during resize
        if (resizeBooking?.id === booking.id && previewDuration > 0) {
            return {
                ...booking,
                duration: previewDuration,
                time: previewTime || booking.time
            };
        }
        return booking;
    };

    // Click-to-move handlers
    // Edge zone for resize detection (in pixels)
    const EDGE_ZONE = 16;

    const handleArrowClick = (e: React.MouseEvent, booking: Booking, side: "left" | "right") => {
        if (!isQuickEdit) return;
        e.stopPropagation();

        // If already resizing this booking from the same side, confirm the resize
        if (resizeBooking?.id === booking.id && resizeMode === side) {
            // Confirm the resize - save to pending changes
            const existingChanges = pendingChanges.get(booking.id);
            setPendingChanges(prev => {
                const newMap = new Map(prev);
                const baseTable = normalizeTable(existingChanges?.table ?? booking.table);
                newMap.set(booking.id, {
                    time: previewTime || existingChanges?.time || booking.time,
                    table: baseTable,
                    duration: previewDuration
                });
                return newMap;
            });
            clearSelectionState();
            return;
        }

        // If resizing from the opposite side, switch to this side
        if (resizeBooking?.id === booking.id && resizeMode && resizeMode !== side) {
            // Switch to the other side, keeping current preview state
            // The preview will update on the next mouse move
            setResizeMode(side);
            // previewDuration and previewTime are already set from the previous resize side
            // They'll be recalculated in handleMouseMove based on the new side
            return;
        }

        // Clear any existing state first
        clearSelectionState();

        // Enter resize mode
        const effective = getEffectiveBooking(booking);
        setResizeMode(side);
        setResizeBooking(booking);
        setPreviewDuration(effective.duration);
        setPreviewTime(effective.time);
    };

    const handleBookingClick = (e: React.MouseEvent, booking: Booking) => {
        if (!isQuickEdit) {
            navigate(`/booking/${booking.id}`);
            return;
        }

        e.stopPropagation();

        // If in resize mode, clicking anywhere confirms the resize
        if (resizeBooking && resizeMode) {
            const existingChanges = pendingChanges.get(resizeBooking.id);
            setPendingChanges(prev => {
                const newMap = new Map(prev);
                const baseTable = normalizeTable(existingChanges?.table ?? resizeBooking.table);
                newMap.set(resizeBooking.id, {
                    time: previewTime || existingChanges?.time || resizeBooking.time,
                    table: baseTable,
                    duration: previewDuration
                });
                return newMap;
            });
            clearSelectionState();
            return;
        }

        const bookingElement = e.currentTarget as HTMLElement;
        const bookingRect = bookingElement.getBoundingClientRect();
        const offsetX = e.clientX - bookingRect.left;

        // If clicking on the selected booking (for move), deselect it
        if (selectedBooking?.id === booking.id) {
            clearSelectionState();
            return;
        }

        // Clear any existing state first
        clearSelectionState();

        // Detect if clicking near left or right edge
        const isNearLeftEdge = offsetX <= EDGE_ZONE;
        const isNearRightEdge = offsetX >= bookingRect.width - EDGE_ZONE;

        const effective = getEffectiveBooking(booking);

        if (isNearLeftEdge || isNearRightEdge) {
            // Enter resize mode
            setResizeMode(isNearLeftEdge ? "left" : "right");
            setResizeBooking(booking);
            setPreviewDuration(effective.duration);
            setPreviewTime(effective.time);
        } else {
            // Middle click - select for moving
            const bookingWidthPercent = getWidth(booking.duration);
            const offsetPercent = (offsetX / bookingRect.width) * bookingWidthPercent;
            const currentLeftPercent = getBookingPosition(effective);

            setSelectedBooking(booking);
            setClickOffsetPercent(offsetPercent);
            setSelectedBookingWidth(bookingRect.width);
            setPreviewPosition({
                table: normalizeTable(effective.table),
                time: effective.time,
                leftPercent: currentLeftPercent
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent, targetTable: string, rowElement: HTMLDivElement) => {
        // Get the mouse position relative to the row's content area
        const contentArea = rowElement.querySelector('.flex-grow') as HTMLElement;
        if (!contentArea) return;

        const contentRect = contentArea.getBoundingClientRect();
        const mouseX = e.clientX - contentRect.left;
        const contentWidth = contentRect.width;

        // Handle resize mode
        if (resizeBooking && resizeMode) {
            const effective = getEffectiveBooking(resizeBooking);
            const existingChanges = pendingChanges.get(resizeBooking.id);

            // Get current booking start time in minutes since midnight
            // Use previewTime if available (live resize state), otherwise use existing/pending time
            const currentTime = previewTime || existingChanges?.time || resizeBooking.time;
            const [startHours, startMins] = currentTime.split(":").map(Number);
            const startTimeMinutes = startHours * 60 + startMins;

            // Get current duration
            // Use previewDuration if available (live resize state), otherwise use existing/pending duration
            const currentDuration = previewDuration > 0 ? previewDuration : (existingChanges?.duration || resizeBooking.duration);
            const endTimeMinutes = startTimeMinutes + currentDuration;

            // Calculate mouse position in time
            const mousePercentage = Math.max(0, Math.min(100, (mouseX / contentWidth) * 100));
            const minutesFromViewStart = (mousePercentage / 100) * TOTAL_WINDOW_MINUTES;
            const viewStartMinutes = viewStart.getHours() * 60 + viewStart.getMinutes();
            const mouseTimeMinutes = viewStartMinutes + minutesFromViewStart;

            // Round to nearest 15 minutes
            const snappedMouseMinutes = Math.round(mouseTimeMinutes / 15) * 15;

            let newDuration: number;
            let newStartTime: string = currentTime;

            if (resizeMode === "right") {
                // Right edge: change end time (duration), start stays fixed
                newDuration = snappedMouseMinutes - startTimeMinutes;
            } else {
                // Left edge: change start time, end stays fixed
                newDuration = endTimeMinutes - snappedMouseMinutes;
                const newStartHours = Math.floor(snappedMouseMinutes / 60);
                const newStartMins = snappedMouseMinutes % 60;
                newStartTime = `${String(newStartHours).padStart(2, '0')}:${String(newStartMins).padStart(2, '0')}`;
            }

            // Clamp duration to min/max
            newDuration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, newDuration));

            // If duration was clamped, recalculate start time for left resize
            if (resizeMode === "left") {
                const clampedStartMinutes = endTimeMinutes - newDuration;
                const clampedHours = Math.floor(clampedStartMinutes / 60);
                const clampedMins = clampedStartMinutes % 60;
                newStartTime = `${String(clampedHours).padStart(2, '0')}:${String(clampedMins).padStart(2, '0')}`;
            }

            setPreviewDuration(newDuration);
            setPreviewTime(newStartTime);
            return;
        }

        // Handle move mode
        if (!selectedBooking) return;

        // Calculate the time position based on mouse location
        const mousePercentage = Math.max(0, Math.min(100, (mouseX / contentWidth) * 100));

        // Subtract the offset to account for where the user originally clicked on the booking
        const adjustedPercentage = Math.max(0, Math.min(100, mousePercentage - clickOffsetPercent));

        // Convert percentage to minutes from viewStart
        const minutesFromViewStart = (adjustedPercentage / 100) * TOTAL_WINDOW_MINUTES;

        // Calculate the actual time and round to nearest 15 minutes
        const newDateTime = new Date(viewStart.getTime() + minutesFromViewStart * 60000);
        const minutes = newDateTime.getMinutes();
        const roundedMinutes = Math.round(minutes / 15) * 15;
        newDateTime.setMinutes(roundedMinutes);
        newDateTime.setSeconds(0);

        // Format as HH:mm
        const newTime = format(newDateTime, "HH:mm");

        // Calculate the snapped left position for preview
        const [hours, mins] = newTime.split(":").map(Number);
        const snappedDateTime = setMinutes(setHours(new Date(selectedDate), hours), mins);
        const diff = differenceInMinutes(snappedDateTime, viewStart);
        const snappedLeftPercent = (diff / TOTAL_WINDOW_MINUTES) * 100;

        setPreviewPosition({
            table: targetTable,
            time: newTime,
            leftPercent: snappedLeftPercent
        });
    };

    const handleRowClick = (e: React.MouseEvent, targetTable: string, rowElement: HTMLDivElement) => {
        if (!isQuickEdit) return;

        // If in resize mode, confirm the resize
        if (resizeBooking && resizeMode) {
            const existingChanges = pendingChanges.get(resizeBooking.id);
            setPendingChanges(prev => {
                const newMap = new Map(prev);
                const baseTable = normalizeTable(existingChanges?.table ?? resizeBooking.table);
                newMap.set(resizeBooking.id, {
                    time: previewTime || existingChanges?.time || resizeBooking.time,
                    table: baseTable,
                    duration: previewDuration
                });
                return newMap;
            });
            clearSelectionState();
            return;
        }

        // Handle move mode
        if (!selectedBooking || !previewPosition) return;

        // Use the snapped preview position for the final placement
        // Preserve existing duration if any, otherwise use original
        const existingChanges = pendingChanges.get(selectedBooking.id);
        const duration = existingChanges?.duration || selectedBooking.duration;

        setPendingChanges(prev => {
            const newMap = new Map(prev);
            const normalizedTable = normalizeTable(previewPosition.table);
            newMap.set(selectedBooking.id, {
                time: previewPosition.time,
                table: normalizedTable,
                duration
            });
            return newMap;
        });

        // Clear selection
        clearSelectionState();
    };

    // Cancel selection or resize when pressing Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && (selectedBooking || resizeBooking)) {
                clearSelectionState();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedBooking, resizeBooking]);

    if (!tableNumbers.length && (isLoadingTables || isLoading)) {
        return (
            <div className={`h-full flex flex-col ${className}`}>
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Loading calendar...
                </div>
            </div>
        );
    }

    if (!tableNumbers.length) {
        return (
            <div className={`h-full flex flex-col ${className}`}>
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    No tables available to display.
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col ${className}`}>
            {!compact && (
                <div className="flex items-center justify-between pb-6">
                    <div className="flex items-center gap-4">
                        {/* Live Time Toggle */}
                        <Button
                            variant={isLive ? "default" : "outline"}
                            className={`gap-2 font-medium ${isLive
                                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                                : "bg-white border-0 hover:shadow-md hover:bg-white"
                                }`}
                            onClick={toggleLive}
                        >
                            <Clock className="h-4 w-4" />
                            {isLive ? "Live Time On" : "Live Time Off"}
                        </Button>

                        {/* Time Navigation */}
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={handlePreviousHour} className="bg-white border-0 hover:shadow-md focus-visible:shadow-md transition-shadow hover:bg-white">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    value={timeInputValue}
                                    onChange={handleTimeChange}
                                    onBlur={handleTimeSubmit}
                                    onKeyDown={(e) => e.key === "Enter" && handleTimeSubmit()}
                                    className="w-[100px] text-center pl-8 bg-white border-0 hover:shadow-md focus-visible:shadow-md transition-shadow focus-visible:ring-0 font-medium"
                                />
                            </div>
                            <Button variant="outline" size="icon" onClick={handleNextHour} className="bg-white border-0 hover:shadow-md focus-visible:shadow-md transition-shadow hover:bg-white">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Date Navigation */}
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={handlePreviousDay} className="bg-white border-0 hover:shadow-md focus-visible:shadow-md transition-shadow hover:bg-white">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="gap-2 bg-white min-w-[240px] justify-start font-medium border-0 hover:shadow-md focus-visible:shadow-md transition-shadow hover:bg-white">
                                        <CalendarIcon className="h-4 w-4" />
                                        {format(selectedDate, "PPP")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="center">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(newDate) => {
                                            if (newDate) {
                                                setIsLive(false);
                                                setSelectedDate(newDate);
                                            }
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button variant="outline" size="icon" onClick={handleNextDay} className="bg-white border-0 hover:shadow-md focus-visible:shadow-md transition-shadow hover:bg-white">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Right Side - Quick Edit Controls */}
                    <div className="flex items-center gap-2">
                        {isQuickEdit ? (
                            /* Cancel/Apply buttons - only visible when Quick Edit is ON */
                            <>
                                <Button
                                    variant="outline"
                                    className="gap-2 font-medium bg-white border-0 hover:shadow-md hover:bg-white"
                                    onClick={handleCancelQuickEdit}
                                >
                                    <X className="h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button
                                    variant="default"
                                    className="gap-2 font-medium bg-emerald-500 hover:bg-emerald-600 text-white"
                                    onClick={handleApplyQuickEdit}
                                >
                                    <Check className="h-4 w-4" />
                                    Apply
                                </Button>
                            </>
                        ) : (
                            /* Quick Edit Toggle - only visible when Quick Edit is OFF */
                            <Button
                                variant="outline"
                                className="gap-2 font-medium bg-white border-0 hover:shadow-md hover:bg-white"
                                onClick={toggleQuickEdit}
                            >
                                <Pencil className="h-4 w-4" />
                                Quick Edit
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <CardContent className={`p-0 flex-1 flex flex-col overflow-hidden ${compact ? "" : ""}`}>
                <div className="relative w-full border-0 rounded-[2rem] bg-white flex flex-col flex-1 h-full overflow-hidden">
                    {/* Header */}
                    <div className="flex border-b border-border bg-muted/30 h-[48px]">
                        <div
                            className="flex-shrink-0 border-r border-border flex items-center justify-center font-medium text-muted-foreground"
                            style={{ width: `${TABLE_LABEL_WIDTH}px` }}
                        >
                            Table
                        </div>
                        <div className="flex-grow relative h-[48px] overflow-hidden">
                            {/* Grid Lines (Hours) */}
                            {gridLines.map((line, index) => (
                                <div
                                    key={index}
                                    className="absolute top-0 bottom-0 flex items-center justify-center text-sm font-medium text-muted-foreground transition-all duration-1000 ease-linear"
                                    style={{
                                        left: `${line.position}%`,
                                        transform: 'translateX(-50%)'
                                    }}
                                >
                                    {format(line.time, "HH:mm")}
                                </div>
                            ))}

                            {/* Grid Lines (Half Hours) - fainter */}
                            {halfHourGridLines.map((line, index) => (
                                <div
                                    key={`half-${index}`}
                                    className="absolute top-0 bottom-0 border-l border-border/30 transition-all duration-1000 ease-linear"
                                    style={{
                                        left: `${line.position}%`
                                    }}
                                />
                            ))}

                            {/* Current Time Indicator (Header) */}
                            <div
                                className="absolute top-0 bottom-0 border-l-2 border-primary z-20"
                                style={{ left: `${CURRENT_TIME_POS}%` }}
                            >
                                <div className="absolute -top-1 -left-[5px] w-2.5 h-2.5 rounded-full bg-primary" />
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <ScrollArea className="h-full">
                        <div className="relative min-w-full">
                            {tableNumbers.map(({ id, tableNumber }) => (
                                <div
                                    key={id}
                                    className={`flex h-[66px] relative transition-colors ${isQuickEdit && selectedBooking ? 'hover:bg-muted/30 cursor-pointer' : ''}`}
                                    onMouseMove={(e) => handleMouseMove(e, tableNumber, e.currentTarget as HTMLDivElement)}
                                    onClick={(e) => handleRowClick(e, tableNumber, e.currentTarget as HTMLDivElement)}
                                >
                                    <div
                                        className="flex-shrink-0 border-r border-border flex items-center justify-center font-medium text-sm text-muted-foreground bg-muted/5"
                                        style={{ width: `${TABLE_LABEL_WIDTH}px` }}
                                    >
                                        {tableNumber}
                                    </div>
                                    <div className="flex-grow relative overflow-hidden">
                                        {/* Grid lines (Hours) */}
                                        {gridLines.map((line, index) => (
                                            <div
                                                key={index}
                                                className="absolute top-0 bottom-0 border-l-2 border-border transition-all duration-1000 ease-linear"
                                                style={{
                                                    left: `${line.position}%`
                                                }}
                                            />
                                        ))}

                                        {/* Grid lines (Half Hours) - fainter */}
                                        {halfHourGridLines.map((line, index) => (
                                            <div
                                                key={`half-${index}`}
                                                className="absolute top-0 bottom-0 border-l border-border/30 transition-all duration-1000 ease-linear"
                                                style={{
                                                    left: `${line.position}%`
                                                }}
                                            />
                                        ))}

                                        {/* Interactive Slots - disabled when Quick Edit is on */}
                                        {!isQuickEdit && slots.map((slot, index) => {
                                            const width = getWidth(30);
                                            // Only render if partially visible
                                            if (slot.position + width < 0 || slot.position > 100) return null;

                                            return (
                                                <div
                                                    key={`slot-${tableNumber}-${index}`}
                                                    className="absolute top-2 bottom-2 flex items-center justify-center opacity-0 hover:opacity-100 hover:bg-muted/50 cursor-pointer transition-all z-0"
                                                    style={{
                                                        left: `${slot.position}%`,
                                                        width: `${width}%`
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const slotDate = format(slot.time, "yyyy-MM-dd");
                                                        const slotTime = format(slot.time, "HH:mm");
                                                        if (onSlotClick) {
                                                            onSlotClick(slotDate, slotTime, tableNumber);
                                                        } else {
                                                            navigate("/new-booking", {
                                                                state: {
                                                                    date: slotDate,
                                                                    time: slotTime,
                                                                    table: tableNumber
                                                                }
                                                            });
                                                        }
                                                    }}
                                                />

                                            );
                                        })}

                                        {/* Current Time Indicator (Body) */}
                                        <div
                                            className="absolute top-0 bottom-0 border-l-2 border-primary/50 z-0"
                                            style={{ left: `${CURRENT_TIME_POS}%` }}
                                        />

                                        {/* Bookings */}
                                        {bookings
                                            .filter((b) => {
                                                const effective = getEffectiveBooking(b);
                                                return (
                                                    b.date === format(selectedDate, "yyyy-MM-dd") &&
                                                    normalizeTable(effective.table !== undefined ? effective.table : b.table) === tableNumber
                                                );
                                            })
                                            .map((booking) => {
                                                const effective = getEffectiveBooking(booking);
                                                const leftPos = getBookingPosition(effective);
                                                const width = getWidth(effective.duration);
                                                const hasPendingChanges = pendingChanges.has(booking.id);
                                                const isResizing = resizeBooking?.id === booking.id;

                                                // Only render if partially visible
                                                if (leftPos + width < 0 || leftPos > 100) return null;

                                                const isSelected = selectedBooking?.id === booking.id;
                                                const isResizingThis = resizeBooking?.id === booking.id;
                                                const isOtherSelected = (selectedBooking || resizeBooking) && !isSelected && !isResizingThis;

                                                return (
                                                    <div
                                                        key={booking.id}
                                                        className={`absolute top-2 bottom-2 rounded-xl flex items-center shadow-sm z-10 group ${isSelected
                                                            ? 'bg-emerald-600 invisible'
                                                            : isResizingThis
                                                                ? 'bg-emerald-600 text-white'
                                                                : getStatusColor(booking.status)
                                                            } ${isQuickEdit && !isOtherSelected && !isSelected && !isResizingThis
                                                                ? 'cursor-pointer'
                                                                : isQuickEdit && isOtherSelected
                                                                    ? 'pointer-events-none'
                                                                    : 'cursor-pointer'
                                                            }`}
                                                        style={{
                                                            left: `${leftPos}%`,
                                                            width: `${width}%`,
                                                        }}
                                                        onClick={(e) => {
                                                            if (!isOtherSelected) {
                                                                handleBookingClick(e, booking);
                                                            }
                                                        }}
                                                    >
                                                        {/* Left resize arrow */}
                                                        {isQuickEdit && !selectedBooking && (
                                                            <div
                                                                className={`absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-ew-resize z-20 transition-opacity duration-200 ${isResizingThis ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                                onClick={(e) => handleArrowClick(e, booking, "left")}
                                                            >
                                                                <ChevronLeft className={`h-5 w-5 transition-colors duration-200 ${isResizingThis && resizeMode === "left" ? 'text-white' : 'text-white/80 hover:text-white'}`} />
                                                            </div>
                                                        )}

                                                        {/* Name and time on the left */}
                                                        <div className={`flex flex-col justify-center gap-1 flex-1 py-1 min-w-0 transition-all duration-200 ${isQuickEdit && !selectedBooking ? (isResizingThis ? 'pl-8 pr-2' : 'px-2 group-hover:pl-8') : 'px-2'}`}>
                                                            <p className="font-semibold text-xs truncate leading-tight">{booking.name}</p>
                                                            {!compact && (
                                                                <span className="opacity-90 text-xs flex items-center gap-1">
                                                                    {hasPendingChanges && <Pencil className="h-3 w-3 text-white" />}
                                                                    {effective.time}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Guests on the right */}
                                                        {!compact && (
                                                            <div className={`flex items-center gap-2 transition-all duration-200 ${isQuickEdit && !selectedBooking ? (isResizingThis ? 'pr-8' : 'pr-2 group-hover:pr-8') : 'pr-2'}`}>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Users className="h-4 w-4" />
                                                                    <span className="text-sm font-medium">{booking.guests}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Right resize arrow */}
                                                        {isQuickEdit && !selectedBooking && (
                                                            <div
                                                                className={`absolute right-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-ew-resize z-20 transition-opacity duration-200 ${isResizingThis ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                                onClick={(e) => handleArrowClick(e, booking, "right")}
                                                            >
                                                                <ChevronRight className={`h-5 w-5 transition-colors duration-200 ${isResizingThis && resizeMode === "right" ? 'text-white' : 'text-white/80 hover:text-white'}`} />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                        {/* Snapped preview - shows where the booking will land */}
                                        {selectedBooking && previewPosition && previewPosition.table === tableNumber && (() => {
                                            const effectiveSelected = getEffectiveBooking(selectedBooking);
                                            return (
                                                <div
                                                    className="absolute top-2 bottom-2 rounded-xl px-2 py-1 flex items-center justify-between bg-emerald-600 text-white shadow-lg z-20 pointer-events-none"
                                                    style={{
                                                        left: `${previewPosition.leftPercent}%`,
                                                        width: `${getWidth(effectiveSelected.duration)}%`,
                                                    }}
                                                >
                                                    <div className="flex flex-col justify-center gap-1">
                                                        <p className="font-semibold text-xs truncate leading-tight">{selectedBooking.name}</p>
                                                        {!compact && (
                                                            <span className="opacity-90 text-xs">{previewPosition.time}</span>
                                                        )}
                                                    </div>
                                                    {!compact && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Users className="h-4 w-4" />
                                                            <span className="text-sm font-medium">{selectedBooking.guests}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
        </div>
    );
};

export default BookingCalendar;
