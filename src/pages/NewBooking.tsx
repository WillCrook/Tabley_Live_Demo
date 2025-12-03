import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Cake, AlertTriangle } from "lucide-react";
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
import NewBookingCalendar from "@/components/NewBookingCalendar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { createBooking, getBookings, getRestaurants, getTables } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Surname is required"),
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
      firstName: "",
      surname: "",
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
  const watchedGuests = form.watch("guests");
  const watchedDuration = form.watch("duration");
  const watchedTable = form.watch("table");
  const watchedFirstName = form.watch("firstName");
  const watchedSurname = form.watch("surname");

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
      name: `${values.firstName} ${values.surname}`.trim(),
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

  const handleDateChange = (date: Date) => {
    form.setValue("date", date);
  };

  const handleTimeChange = (time: string) => {
    form.setValue("time", time);
  };

  const handleGuestsChange = (guests: number) => {
    form.setValue("guests", guests);
  };

  const handleDurationChange = (duration: number) => {
    form.setValue("duration", duration);
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
      <div className="grid gap-6 lg:grid-cols-[1fr_35%] flex-1 min-h-0">
        {/* Left Column: Booking Calendar */}
        <NewBookingCalendar
          date={watchedDate || new Date()}
          time={watchedTime || "19:00"}
          guests={watchedGuests || 2}
          duration={watchedDuration || 90}
          initialTable={initialTable}
          table={watchedTable ? String(watchedTable) : undefined}
          firstName={watchedFirstName}
          surname={watchedSurname}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          onGuestsChange={handleGuestsChange}
          onDurationChange={handleDurationChange}
          onSlotClick={handleSlotClick}
        />

        {/* Right Column: Booking Form */}
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="h-[52px] mb-4" /> {/* Spacer to align with calendar controls (matches navigation controls height) */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Name */}
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Surname */}
                    <FormField
                      control={form.control}
                      name="surname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surname</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" {...field} />
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

                    {/* Special Requests Dropdown */}
                    <FormField
                      control={form.control}
                      name="specialRequestType"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel className="flex items-center gap-2">
                            <Cake className="h-4 w-4 text-blue-500" />
                            Special Requests
                          </FormLabel>
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

                    {/* Dietary Restrictions Dropdown */}
                    <FormField
                      control={form.control}
                      name="dietaryRestrictionType"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            Dietary Restrictions
                          </FormLabel>
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
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default NewBooking;
