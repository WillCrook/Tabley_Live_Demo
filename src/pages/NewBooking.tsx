import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import BookingCalendar from "@/components/BookingCalendar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { createBooking, getBookings, getRestaurants, getTables } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  guests: z.coerce.number().min(1, "Must have at least 1 guest"),
  date: z.date({
    required_error: "A date of booking is required.",
  }),
  time: z.string().min(1, "Time is required"),
  duration: z.coerce.number().min(30, "Duration must be at least 30 minutes"),
  table: z.string().min(1, "Table number is required"),
  specialRequestType: z.string().optional(),
  specialRequests: z.string().optional(),
  dietaryRestrictionType: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
});

interface LocationState {
  date?: string;
  time?: string;
  table?: string | number;
}

const NewBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch restaurant data (assuming restaurant_id = 1 for now)
  const { data: restaurants = [] } = useQuery({
    queryKey: ['restaurants'],
    queryFn: () => getRestaurants(),
  });
  
  const restaurant = restaurants[0] || null; // Get first active restaurant
  
  // Fetch tables for the restaurant
  const { data: tables = [] } = useQuery({
    queryKey: ['tables', restaurant?.id],
    queryFn: () => getTables(restaurant?.id),
    enabled: !!restaurant?.id,
  });

  // Fetch bookings for availability check
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => getBookings(),
  });

  // Mutation for creating booking
  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (newBooking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({
        title: "Booking Created",
        description: `Booking for ${newBooking.name} has been created successfully.`,
      });
      navigate(`/booking/${newBooking.id}`);
    },
  });

  // Get pre-filled values from location state (passed from calendar slot click)
  const locationState = location.state as LocationState | null;
  const initialDate = locationState?.date ? new Date(locationState.date) : new Date();
  const initialTime = locationState?.time || "19:00";
  const initialTable = locationState?.table ? String(locationState.table) : undefined;
  
  // Ensure initialTime is valid
  const validInitialTime = initialTime && /^\d{2}:\d{2}$/.test(initialTime) ? initialTime : "19:00";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      guests: 2,
      date: initialDate,
      time: validInitialTime,
      duration: 90,
      table: initialTable,
      specialRequests: "",
      dietaryRestrictions: "",
      specialRequestType: "None",
      dietaryRestrictionType: "None",
    },
  });

  const specialRequestType = form.watch("specialRequestType");
  const dietaryRestrictionType = form.watch("dietaryRestrictionType");
  const watchedDate = form.watch("date");
  const watchedTime = form.watch("time");
  const watchedDuration = form.watch("duration");

  // Combine date and time for calendar
  const calendarDateTime = React.useMemo(() => {
    try {
      if (!watchedTime || !watchedDate) {
        return new Date();
      }
      const [hours, minutes] = watchedTime.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        return new Date();
      }
      const combined = new Date(watchedDate);
      combined.setHours(hours, minutes, 0, 0);
      return combined;
    } catch (error) {
      console.error("Error calculating calendar date time:", error);
      return new Date();
    }
  }, [watchedDate, watchedTime]);

  // Get available time slots based on restaurant hours
  const availableTimeSlots = React.useMemo(() => {
    try {
      if (!restaurant) {
        // If no restaurant, return empty array
        return [];
      }

      if (!restaurant.operating_hours || typeof restaurant.operating_hours !== 'object') {
        // If no hours defined, allow all times
        return Array.from({ length: 48 }, (_, i) => i * 0.5).map((hour) => {
          const hours = Math.floor(hour);
          const minutes = hour % 1 === 0 ? 0 : 30;
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        });
      }

      if (!watchedDate) {
        return [];
      }

      // Get day of week in lowercase (format returns capitalized like "Monday")
      const dayOfWeek = format(watchedDate, "EEEE").toLowerCase();
      const dayHours = (restaurant.operating_hours as any)[dayOfWeek];
      
      if (!dayHours || typeof dayHours !== 'object' || !dayHours.open || !dayHours.close) {
        return []; // Restaurant closed on this day
      }

      const [openHour, openMin] = String(dayHours.open).split(":").map(Number);
      const [closeHour, closeMin] = String(dayHours.close).split(":").map(Number);
      
      if (isNaN(openHour) || isNaN(openMin) || isNaN(closeHour) || isNaN(closeMin)) {
        return [];
      }
      
      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;
      
      const slots: string[] = [];
      for (let minutes = openMinutes; minutes < closeMinutes; minutes += 30) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
      
      return slots;
    } catch (error) {
      console.error("Error calculating available time slots:", error);
      // Fallback to all times if there's an error
      return Array.from({ length: 48 }, (_, i) => i * 0.5).map((hour) => {
        const hours = Math.floor(hour);
        const minutes = hour % 1 === 0 ? 0 : 30;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      });
    }
  }, [watchedDate, restaurant]);

  // Calculate available tables based on date, time, and duration
  const availableTables = React.useMemo(() => {
    if (!tables.length) return [];
    if (!watchedTime || !watchedDate) return [];
    
    try {
      const selectedDateStr = format(watchedDate, "yyyy-MM-dd");
      const [hours, minutes] = watchedTime.split(":").map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) return [];

      // Calculate start and end times in minutes since midnight
      const bookingStartMinutes = hours * 60 + minutes;
      const bookingEndMinutes = bookingStartMinutes + watchedDuration;

      // Filter tables that:
      // 1. Are active
      // 2. Have capacity for the number of guests
      // 3. Don't have conflicting bookings
      return tables
        .filter(table => table.is_active)
        .filter(table => {
          try {
            const rawGuests = form.getValues("guests");
            const watchedGuests = rawGuests ? Number(rawGuests) : 0;
            // If guest count not specified yet, don't filter by capacity
            if (!watchedGuests) return true;
            return table.min_capacity <= watchedGuests && table.max_capacity >= watchedGuests;
          } catch {
            return false;
          }
        })
        .filter(table => {
          // Check for conflicting bookings
          // Compare table numbers as strings (backend now accepts strings)
          const tableBookings = bookings.filter(
            b => b.date === selectedDateStr && String(b.table) === String(table.table_number)
          );

          return !tableBookings.some(booking => {
            const [bookingHours, bookingMinutes] = booking.time.split(":").map(Number);
            const existingStartMinutes = bookingHours * 60 + bookingMinutes;
            const existingEndMinutes = existingStartMinutes + booking.duration;

            // Check for overlap: bookings overlap if one starts before the other ends
            return (
              (bookingStartMinutes < existingEndMinutes && bookingEndMinutes > existingStartMinutes)
            );
          });
        })
        .map(table => table.table_number);
    } catch (error) {
      console.error("Error calculating available tables:", error);
      return [];
    }
  }, [watchedDate, watchedTime, watchedDuration, tables, bookings, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Combine type and details for Special Requests
    let finalSpecialRequests = undefined;
    if (values.specialRequestType && values.specialRequestType !== "None") {
      if (values.specialRequestType === "Other") {
        finalSpecialRequests = values.specialRequests;
      } else {
        finalSpecialRequests = values.specialRequests
          ? `${values.specialRequestType}: ${values.specialRequests}`
          : values.specialRequestType;
      }
    }

    // Combine type and details for Dietary Restrictions
    let finalDietaryRestrictions = undefined;
    if (values.dietaryRestrictionType && values.dietaryRestrictionType !== "None") {
      if (values.dietaryRestrictionType === "Other") {
        finalDietaryRestrictions = values.dietaryRestrictions;
      } else {
        finalDietaryRestrictions = values.dietaryRestrictions
          ? `${values.dietaryRestrictionType}: ${values.dietaryRestrictions}`
          : values.dietaryRestrictionType;
      }
    }

    // Validate time is not the disabled placeholder
    if (values.time === "__disabled__" || !values.time) {
      toast({
        title: "Invalid Time",
        description: "Please select a valid time.",
        variant: "destructive",
      });
      return;
    }

    // Validate time is within restaurant hours
    if (availableTimeSlots.length > 0 && !availableTimeSlots.includes(values.time)) {
      toast({
        title: "Invalid Time",
        description: "Selected time is outside restaurant operating hours.",
        variant: "destructive",
      });
      return;
    }

    if (!restaurant?.id) {
      toast({
        title: "Restaurant Not Selected",
        description: "Please ensure a restaurant is selected before creating a booking.",
        variant: "destructive",
      });
      return;
    }

    // Validate table is not the disabled placeholder
    const tableNumStr = typeof values.table === 'string' ? values.table : String(values.table);
    if (tableNumStr === "__disabled__" || !tableNumStr) {
      toast({
        title: "Invalid Table",
        description: "Please select a valid table.",
        variant: "destructive",
      });
      return;
    }

    // Validate table is available
    if (!availableTables.includes(tableNumStr)) {
      toast({
        title: "Table Unavailable",
        description: "Selected table is not available at this time.",
        variant: "destructive",
      });
      return;
    }

    const selectedTable = tables.find((t) => String(t.table_number) === tableNumStr);
    if (!selectedTable) {
      toast({
        title: "Table Not Found",
        description: "Could not find the selected table. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      restaurant_id: String(restaurant.id),
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      guests: values.guests,
      time: values.time,
      duration: values.duration,
      date: format(values.date, "yyyy-MM-dd"),
      status: "confirmed",
      table_id: selectedTable.id,
      specialRequests: finalSpecialRequests,
      dietaryRestrictions: finalDietaryRestrictions,
    });
  }

  const handleSpecialRequestTypeChange = (value: string) => {
    form.setValue("specialRequestType", value);
    if (value === "None") {
      form.setValue("specialRequests", "");
    }
  };

  const handleDietaryRestrictionTypeChange = (value: string) => {
    form.setValue("dietaryRestrictionType", value);
    if (value === "None") {
      form.setValue("dietaryRestrictions", "");
    }
  };

  const handleSlotClick = (date: string, time: string, table: number | string) => {
    // Update form fields when a slot is clicked on the calendar
    form.setValue("date", new Date(date));
    form.setValue("time", time);
    form.setValue("table", String(table));
  };

  // Show loading state while data is being fetched
  const isLoading = !restaurant && restaurants.length === 0;
  const hasError = restaurants.length === 0 && !isLoading;

  if (isLoading) {
    return (
      <div className="p-6 pt-2 h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading restaurant data...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-6 pt-2 h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">No restaurant found. Please ensure a restaurant is set up in the database.</p>
          <Button onClick={() => navigate("/bookings")}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-6 pt-2 h-[calc(100vh-100px)] overflow-hidden flex flex-col">
      <div className="grid gap-6 lg:grid-cols-[45%_1fr] flex-1 min-h-0">
        {/* Left Column: Booking Form */}
        <div className="flex flex-col h-full overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guest Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Number of Guests */}
                    <FormField
                      control={form.control}
                      name="guests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Guests</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="guest@example.com" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 000-0000" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Time */}
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow">
                                <SelectValue placeholder="Select a time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableTimeSlots && availableTimeSlots.length > 0 ? (
                                availableTimeSlots.map((timeString) => (
                                  <SelectItem key={timeString} value={timeString}>
                                    {timeString}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__disabled__" disabled>
                                  {restaurant ? "Restaurant closed on this day" : "Loading times..."}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date */}
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow hover:bg-white",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Duration */}
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (minutes)</FormLabel>
                          <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                            <FormControl>
                              <SelectTrigger className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow">
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="60">60 min</SelectItem>
                              <SelectItem value="90">90 min</SelectItem>
                              <SelectItem value="120">120 min</SelectItem>
                              <SelectItem value="150">150 min</SelectItem>
                              <SelectItem value="180">180 min</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Table */}
                    <FormField
                      control={form.control}
                      name="table"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Table Number</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow">
                                <SelectValue placeholder="Select a table" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tables && tables.length > 0 ? (
                                tables
                                  .sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true }))
                                  .map((table) => {
                                    const isAvailable = availableTables && availableTables.includes(table.table_number);
                                    return (
                                      <SelectItem
                                        key={table.id}
                                        value={String(table.table_number)}
                                        disabled={!isAvailable}
                                      >
                                        Table {table.table_number} {table.section && `(${table.section})`} {!isAvailable && "(Unavailable)"}
                                      </SelectItem>
                                    );
                                  })
                              ) : (
                                <SelectItem value="__disabled__" disabled>
                                  {restaurant ? "No tables available" : "Loading tables..."}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Special Requests Dropdown */}
                    <FormField
                      control={form.control}
                      name="specialRequestType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Requests</FormLabel>
                          <Select onValueChange={handleSpecialRequestTypeChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow">
                                <SelectValue placeholder="Select request type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="None">None</SelectItem>
                              <SelectItem value="Birthday">Birthday</SelectItem>
                              <SelectItem value="Anniversary">Anniversary</SelectItem>
                              <SelectItem value="Quiet Table">Quiet Table</SelectItem>
                              <SelectItem value="Window Seat">Window Seat</SelectItem>
                              <SelectItem value="High Chair">High Chair</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Dietary Restrictions Dropdown */}
                    <FormField
                      control={form.control}
                      name="dietaryRestrictionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dietary Restrictions</FormLabel>
                          <Select onValueChange={handleDietaryRestrictionTypeChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow">
                                <SelectValue placeholder="Select restriction" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="None">None</SelectItem>
                              <SelectItem value="Gluten-free">Gluten-free</SelectItem>
                              <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                              <SelectItem value="Vegan">Vegan</SelectItem>
                              <SelectItem value="Dairy-free">Dairy-free</SelectItem>
                              <SelectItem value="Nut Allergy">Nut Allergy</SelectItem>
                              <SelectItem value="Shellfish Allergy">Shellfish Allergy</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Conditional Special Requests Textarea */}
                    {specialRequestType !== "None" && (
                      <FormField
                        control={form.control}
                        name="specialRequests"
                        render={({ field }) => (
                          <FormItem className="col-span-1 md:col-span-2">
                            <FormControl>
                              <Textarea
                                placeholder="Add extra special request details..."
                                className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow"
                                rows={2}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Conditional Dietary Restrictions Textarea */}
                    {dietaryRestrictionType !== "None" && (
                      <FormField
                        control={form.control}
                        name="dietaryRestrictions"
                        render={({ field }) => (
                          <FormItem className="col-span-1 md:col-span-2">
                            <FormControl>
                              <Textarea
                                placeholder="Add extra dietary restrictions details..."
                                className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow"
                                rows={2}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" className="px-8 bg-emerald-500 hover:bg-emerald-600 text-white">
                  Create Booking
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Right Column: Booking Calendar */}
        <div className="flex flex-col min-h-0">
          <Card className="flex-1 cursor-pointer overflow-hidden flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <BookingCalendar
                compact
                className="h-full"
                initialTime={calendarDateTime}
                onSlotClick={handleSlotClick}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default NewBooking;
