import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Phone, Clock, UserPlus, Search, Trash2, Cake, AlertTriangle } from "lucide-react";
import { PiPicnicTableBold } from "react-icons/pi";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivityFilterSidebar } from "@/components/ActivityFilterSidebar";
import { DateRange } from "react-day-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteBooking, getBookings, updateBooking, getTables } from "@/lib/api";
import type { Booking } from "@/types/booking";
import type { Table } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const DEFAULT_TABLE_FILTER = Array.from({ length: 10 }, (_, i) => i + 1);

const guestSchema = z.object({
  name: z.string().min(1, "Guest name is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(20, "Phone must be 20 digits or fewer"),
  email: z
    .string()
    .email("Enter a valid email")
    .or(z.literal(""))
    .optional(),
  guests: z.coerce.number().min(1, "At least 1 guest").max(20, "Maximum 20 guests"),
  table_id: z.string().min(1).optional().default("none"),
});

const Activity = () => {
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "soonest" | "most_booked">("newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch bookings from API
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => getBookings(),
  });

  const { data: tables = [], isLoading: isLoadingTables } = useQuery({
    queryKey: ['tables'],
    queryFn: () => getTables(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({
        title: "Booking deleted",
        description: "The booking has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete booking",
        description: error?.response?.data?.detail ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);

  const editingBooking = useMemo(
    () => bookings.find((booking) => booking.id === editingBookingId) ?? null,
    [bookings, editingBookingId]
  );

  const guestForm = useForm<z.infer<typeof guestSchema>>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      guests: 1,
      table_id: "none",
    },
  });

  useEffect(() => {
    if (editingBooking) {
      guestForm.reset({
        name: editingBooking.name,
        phone: editingBooking.phone,
        email: editingBooking.email ?? "",
        guests: editingBooking.guests,
        table_id: editingBooking.table_id ? String(editingBooking.table_id) : "none",
      });
    }
  }, [editingBooking, guestForm]);

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Booking> }) => updateBooking(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: "Guest details updated" });
      setIsEditOpen(false);
      setEditingBookingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update booking",
        description: error?.response?.data?.detail ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const openGuestEdit = (bookingId: number) => {
    setEditingBookingId(bookingId);
    setIsEditOpen(true);
  };

  const closeGuestEdit = () => {
    setIsEditOpen(false);
    setEditingBookingId(null);
  };

  const onSubmitGuest = (values: z.infer<typeof guestSchema>) => {
    if (!editingBooking) return;

    updateMutation.mutate({
      id: editingBooking.id,
      updates: {
        name: values.name,
        phone: values.phone,
        guests: values.guests,
        email: values.email?.trim() ? values.email.trim() : null,
        table_id: values.table_id && values.table_id !== "none" ? Number(values.table_id) : null,
      },
    });
  };

  // Filter states
  const [filters, setFilters] = useState<{
    dateRange: DateRange | undefined;
    guestRange: number[];
    tables: number[];
    timeRange: string[];
    specialBookings: "all" | "specialRequests" | "dietaryRestrictions";
  }>({
    dateRange: undefined,
    guestRange: [1, 20],
    tables: DEFAULT_TABLE_FILTER,
    timeRange: ["00:00", "23:59"],
    specialBookings: "all",
  });

  // Transform bookings into activities format
  const activities = bookings.map((booking: Booking) => ({
    id: booking.id,
    type: "new_booking",
    guestName: booking.name,
    guests: booking.guests,
    time: booking.time,
    date: booking.date,
    phone: booking.phone,
    table: booking.table,
    bookedAt: booking.bookedAt ? new Date(booking.bookedAt) : new Date(),
    icon: UserPlus,
    timesBooked: 1, // This would need to come from backend if tracking repeat customers
    dietaryRestrictions: booking.dietaryRestrictions,
    specialRequests: booking.specialRequests,
  }));

  const filteredActivities = activities.filter(activity => {
    // Search filter
    const matchesSearch =
      activity.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    // Table filter
    const allTablesSelected =
      filters.tables.length === 0 || filters.tables.length === DEFAULT_TABLE_FILTER.length;

    if (!allTablesSelected) {
      const allowedTables = filters.tables.map(table => String(table));
      const activityTable = activity.table ? String(activity.table) : "";

      if (!activityTable || !allowedTables.includes(activityTable)) {
        return false;
      }
    }

    // Guest range filter
    if (activity.guests < filters.guestRange[0] || activity.guests > filters.guestRange[1]) {
      return false;
    }

    // Time range filter
    if (filters.timeRange[0] !== "00:00" || filters.timeRange[1] !== "23:59") {
      // Convert activity time to comparable format
      const activityTime = activity.time;
      if (activityTime < filters.timeRange[0] || activityTime > filters.timeRange[1]) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange?.from) {
      // Parse the activity date (format: YYYY-MM-DD)
      const activityDate = parseISO(activity.date);
      const checkDate = startOfDay(activityDate);
      const fromDate = startOfDay(filters.dateRange.from);
      const toDate = filters.dateRange.to ? endOfDay(filters.dateRange.to) : endOfDay(filters.dateRange.from);

      if (!isWithinInterval(checkDate, { start: fromDate, end: toDate })) {
        return false;
      }
    }

    // Special bookings filter
    if (filters.specialBookings === "specialRequests") {
      if (!activity.specialRequests) {
        return false;
      }
    } else if (filters.specialBookings === "dietaryRestrictions") {
      if (!activity.dietaryRestrictions) {
        return false;
      }
    }
    // If "all", no filtering needed

    return true;
  });

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    switch (sortOrder) {
      case "newest":
        return b.bookedAt.getTime() - a.bookedAt.getTime();
      case "oldest":
        return a.bookedAt.getTime() - b.bookedAt.getTime();
      case "most_booked":
        return b.timesBooked - a.timesBooked;
      case "soonest": {
        // Compare dates first
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        // If same date, compare times
        return a.time.localeCompare(b.time);
      }
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="p-6 pt-2 h-[calc(100vh-100px)] flex items-center justify-center">
        <p className="text-muted-foreground">Loading activities...</p>
      </div>
    );
  }

  return (
    <div className="p-6 pt-2 h-[calc(100vh-100px)] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        {/* Search */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-0 hover:shadow-md focus-visible:shadow-md transition-shadow focus-visible:ring-0 font-medium"
          />
        </div>
        {/* Filter & Sort */}
        <div className="flex items-center gap-3">
          <ActivityFilterSidebar
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={() => setFilters({
              dateRange: undefined,
              guestRange: [1, 20],
              tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              timeRange: ["00:00", "23:59"],
              specialBookings: "all",
            })}
          />
          <Select value={sortOrder} onValueChange={value => setSortOrder(value as any)}>
            <SelectTrigger className="w-[180px] bg-white border-0 hover:shadow-md focus:shadow-md transition-shadow focus:ring-0 [&>span]:font-medium">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest" className="font-medium">Newest First</SelectItem>
              <SelectItem value="oldest" className="font-medium">Oldest First</SelectItem>
              <SelectItem value="soonest" className="font-medium">Soonest</SelectItem>
              <SelectItem value="most_booked" className="font-medium">Most Times Booked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {sortedActivities.map(activity => {
          const Icon = activity.icon;
          return (
            <Card
              key={activity.id}
              className="transition-all duration-200 hover:shadow-md"
            >
              <CardContent className="py-5 px-5">
                <div className="flex items-center gap-4">
                  {/* Left section: All booking info */}
                  <div
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={() => navigate(`/booking/${activity.id}`)}
                  >
                    <Icon className="h-5 w-5 text-emerald-500" />
                    <h3 className="text-base font-semibold text-foreground">
                      {activity.guestName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-base text-foreground ml-4">
                      {activity.dietaryRestrictions && (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      {activity.specialRequests && (
                        <Cake className="h-5 w-5 text-blue-500" />
                      )}
                      <PiPicnicTableBold className={`h-5 w-5 ${(activity.dietaryRestrictions || activity.specialRequests) ? 'ml-2.5' : ''}`} />
                      <span className="font-semibold">{activity.table}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-base text-foreground">
                      <Users className="h-5 w-5" />
                      <span className="font-semibold">{activity.guests}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground ml-4">
                      <Calendar className="h-4 w-4" />
                      <span>{activity.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{activity.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{activity.phone}</span>
                    </div>
                  </div>

                  {/* Right section: Bookings count, Time ago */}
                  <div className="flex items-center gap-3 shrink-0">
                    {sortOrder === "most_booked" && (
                      <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        {activity.timesBooked} bookings
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(activity.bookedAt, { addSuffix: true })}
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete booking</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this booking for {activity.guestName}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleDelete(activity.id)}
                            >
                              Delete booking
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeGuestEdit();
          } else {
            setIsEditOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit guest information</DialogTitle>
            <DialogDescription>Update the guest details for this booking.</DialogDescription>
          </DialogHeader>

          <Form {...guestForm}>
            <form onSubmit={guestForm.handleSubmit(onSubmitGuest)} className="space-y-4">
              <FormField
                control={guestForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={guestForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="01234 567890" type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={guestForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="guest@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={guestForm.control}
                name="guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Party size</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={20} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={guestForm.control}
                name="table_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned table</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "none"}
                      disabled={isLoadingTables}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select table" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No table</SelectItem>
                        {tables.map((table: Table) => (
                          <SelectItem key={table.id} value={String(table.id)}>
                            Table {table.table_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeGuestEdit}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Activity;
