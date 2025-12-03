import { format, addHours, subHours, addMinutes } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import BookingCalendar from "@/components/BookingCalendar";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBookings, getTables, getRestaurants } from "@/lib/api";

interface NewBookingCalendarProps {
  date: Date;
  time: string;
  guests: number;
  duration: number;
  initialTable?: string;
  table?: string;
  firstName?: string;
  surname?: string;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
  onGuestsChange: (guests: number) => void;
  onDurationChange: (duration: number) => void;
  onSlotClick?: (date: string, time: string, table: string) => void;
}

const NewBookingCalendar = ({
  date,
  time,
  guests,
  duration,
  initialTable,
  table,
  firstName,
  surname,
  onDateChange,
  onTimeChange,
  onGuestsChange,
  onDurationChange,
  onSlotClick,
}: NewBookingCalendarProps) => {
  // Fetch data for availability checking
  const { data: restaurants = [] } = useQuery({
    queryKey: ['restaurants'],
    queryFn: () => getRestaurants(),
  });

  const primaryRestaurant = restaurants[0];

  const { data: tablesData = [] } = useQuery({
    queryKey: ['tables', primaryRestaurant?.id],
    queryFn: () => getTables(primaryRestaurant?.id ? String(primaryRestaurant.id) : undefined),
    enabled: !!primaryRestaurant?.id,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => getBookings(),
  });

  // Track the preview table - only change on initial load or when current table becomes unavailable
  const [previewTableState, setPreviewTableState] = useState<string | null>(null);
  const [previewTimeState, setPreviewTimeState] = useState<string>(time);
  // Track calendar view time separately - only updates from navigation controls, not from preview changes
  const [calendarViewTime, setCalendarViewTime] = useState<string>(time);
  const isInitialized = useRef(false);

  // Helper function to check if a table is available at a given time
  const checkAvailability = useMemo(() => {
    return (checkTime: string, checkDate: Date, checkTable?: string) => {
      const dateStr = format(checkDate, "yyyy-MM-dd");
      const [hours, minutes] = checkTime.split(":").map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + duration;

      // If checking a specific table
      if (checkTable) {
        const tableBookings = bookings.filter(
          b => b.date === dateStr && String(b.table) === checkTable
        );

        const hasConflict = tableBookings.some(booking => {
          const [bookingHours, bookingMinutes] = booking.time.split(":").map(Number);
          const existingStartMinutes = bookingHours * 60 + bookingMinutes;
          const existingEndMinutes = existingStartMinutes + booking.duration;

          return (
            (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes)
          );
        });

        const table = tablesData.find(t => String(t.table_number) === checkTable);
        const canAccommodate = table && table.is_active && table.max_capacity >= guests;

        return !hasConflict && canAccommodate;
      }

      // Otherwise, find first available table
      const availableTables = tablesData
        .filter(table => table.is_active && table.max_capacity >= guests)
        .sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true }));

      for (const table of availableTables) {
        const tableNumber = String(table.table_number);
        const tableBookings = bookings.filter(
          b => b.date === dateStr && String(b.table) === tableNumber
        );

        const hasConflict = tableBookings.some(booking => {
          const [bookingHours, bookingMinutes] = booking.time.split(":").map(Number);
          const existingStartMinutes = bookingHours * 60 + bookingMinutes;
          const existingEndMinutes = existingStartMinutes + booking.duration;

          return (
            (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes)
          );
        });

        if (!hasConflict) {
          return tableNumber;
        }
      }
      return null;
    };
  }, [duration, guests, tablesData, bookings]);

  // Initialize preview on mount or when initialTable changes
  useEffect(() => {
    if (initialTable && !isInitialized.current) {
      // If table was provided (from slot click), use it with current time
      setPreviewTableState(initialTable);
      setPreviewTimeState(time);
      isInitialized.current = true;
      return;
    }

    if (!isInitialized.current) {
      // Initial load - find first available table
      const tableAtCurrentTime = checkAvailability(time, date);
      if (tableAtCurrentTime) {
        setPreviewTableState(tableAtCurrentTime);
        setPreviewTimeState(time);
      } else {
        // Try 30 minutes later
        const [hours, minutes] = time.split(":").map(Number);
        const currentDateTime = new Date(date);
        currentDateTime.setHours(hours, minutes, 0, 0);
        const nextTime = addMinutes(currentDateTime, 30);
        const nextTimeStr = format(nextTime, "HH:mm");
        
        const tableAtNextTime = checkAvailability(nextTimeStr, date);
        if (tableAtNextTime) {
          setPreviewTableState(tableAtNextTime);
          setPreviewTimeState(nextTimeStr);
          // Don't update form time or calendar view - just update preview
          // onTimeChange(nextTimeStr);
        } else {
          // Use first available table even if it conflicts
          const availableTables = tablesData
            .filter(table => table.is_active && table.max_capacity >= guests)
            .sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true }));
          
          if (availableTables.length > 0) {
            setPreviewTableState(String(availableTables[0].table_number));
            setPreviewTimeState(time);
          }
        }
      }
      isInitialized.current = true;
    }
  }, [initialTable, checkAvailability, time, date, guests, tablesData, onTimeChange]);

  // Update preview when time/date/table changes - allow table to be moved by user
  useEffect(() => {
    if (!isInitialized.current) return;
    if (!previewTableState) return;

    // Update time when time/date changes
    setPreviewTimeState(time);
    
    // Update table when table prop changes (user clicked a slot)
    if (table && table !== previewTableState) {
      setPreviewTableState(table);
    }
  }, [time, date, table, previewTableState]);

  const previewBooking = useMemo(() => {
    if (previewTableState && previewTimeState) {
      return { time: previewTimeState, table: previewTableState };
    }
    return null;
  }, [previewTableState, previewTimeState]);
  // Navigation handlers - these only update the calendar view, NOT the preview booking
  const handlePreviousHour = () => {
    if (!date || !calendarViewTime) return;
    const [hours, minutes] = calendarViewTime.split(":").map(Number);
    const currentDateTime = new Date(date);
    currentDateTime.setHours(hours, minutes, 0, 0);
    const newDateTime = subHours(currentDateTime, 1);
    const newTime = format(newDateTime, "HH:mm");
    setCalendarViewTime(newTime);
    // Only update date if it changed, but don't update form time (preview booking stays in place)
    const newDate = new Date(newDateTime.getFullYear(), newDateTime.getMonth(), newDateTime.getDate());
    if (format(newDate, "yyyy-MM-dd") !== format(date, "yyyy-MM-dd")) {
      onDateChange(newDate);
    }
    // Don't call onTimeChange - we only want to move the calendar view, not the preview booking
  };

  const handleNextHour = () => {
    if (!date || !calendarViewTime) return;
    const [hours, minutes] = calendarViewTime.split(":").map(Number);
    const currentDateTime = new Date(date);
    currentDateTime.setHours(hours, minutes, 0, 0);
    const newDateTime = addHours(currentDateTime, 1);
    const newTime = format(newDateTime, "HH:mm");
    setCalendarViewTime(newTime);
    // Only update date if it changed, but don't update form time (preview booking stays in place)
    const newDate = new Date(newDateTime.getFullYear(), newDateTime.getMonth(), newDateTime.getDate());
    if (format(newDate, "yyyy-MM-dd") !== format(date, "yyyy-MM-dd")) {
      onDateChange(newDate);
    }
    // Don't call onTimeChange - we only want to move the calendar view, not the preview booking
  };


  // Combine date and time for calendar view - use calendarViewTime, not the form time
  const calendarDateTime = useMemo(() => {
    try {
      if (!calendarViewTime || !date) {
        return new Date();
      }
      const [hours, minutes] = calendarViewTime.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        return new Date();
      }
      const combined = new Date(date);
      combined.setHours(hours, minutes, 0, 0);
      return combined;
    } catch (error) {
      console.error("Error calculating calendar date time:", error);
      return new Date();
    }
  }, [date, calendarViewTime]);

  // Initialize calendar view time on mount - only set once, never update from form time changes
  const calendarViewTimeInitialized = useRef(false);
  useEffect(() => {
    if (!calendarViewTimeInitialized.current) {
      setCalendarViewTime(time);
      calendarViewTimeInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount, ignore time changes

  return (
    <div className="flex flex-col min-h-0">
      {/* Navigation Controls */}
      <div className="flex items-center gap-4 mb-4">
        {/* Time Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousHour}
            className="bg-white border-0 hover:shadow-md focus-visible:shadow-md transition-shadow hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextHour}
            className="bg-white border-0 hover:shadow-md focus-visible:shadow-md transition-shadow hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Date Input */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Date:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "gap-2 bg-white min-w-[200px] justify-start font-medium border-0 hover:shadow-md focus-visible:shadow-md transition-shadow hover:bg-white",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                if (newDate) {
                  onDateChange(newDate);
                }
              }}
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0))
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        </div>

        {/* Guests Input */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Guests:</span>
          <Input
            type="number"
            min={1}
            value={guests}
            onChange={(e) => onGuestsChange(Number(e.target.value))}
            className="w-20 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow bg-white font-medium"
          />
        </div>

        {/* Duration Input */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Duration:</span>
          <Select onValueChange={(val) => onDurationChange(Number(val))} value={String(duration)}>
            <SelectTrigger className="w-28 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow bg-white font-medium">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">60 min</SelectItem>
              <SelectItem value="90">90 min</SelectItem>
              <SelectItem value="120">120 min</SelectItem>
              <SelectItem value="150">150 min</SelectItem>
              <SelectItem value="180">180 min</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-1 cursor-pointer overflow-hidden flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          <BookingCalendar
            compact
            className="h-full"
            initialTime={calendarDateTime}
            guests={guests}
            previewBookingTime={previewBooking?.time}
            previewBookingTable={previewBooking?.table}
            previewBookingGuests={guests}
            previewBookingDuration={duration}
            previewBookingFirstName={firstName}
            previewBookingSurname={surname}
            onSlotClick={onSlotClick}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default NewBookingCalendar;

