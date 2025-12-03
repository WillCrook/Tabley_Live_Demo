import { useParams, useNavigate } from "react-router-dom";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Phone, ArrowLeft, Trash2, Mail, Cake, AlertTriangle, X, Check } from "lucide-react";
import { PiPicnicTableBold } from "react-icons/pi";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBooking, deleteBooking, updateBooking } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  surname: z.string().optional(),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  table: z.string().min(1, "Table is required"),
  guests: z.coerce.number().min(1, "Must have at least 1 guest"),
  duration: z.coerce.number().min(30, "Duration must be at least 30 minutes"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  specialRequests: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
});

const BookingDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch booking from API
    const { data: booking, isLoading, error } = useQuery({
        queryKey: ['booking', id],
        queryFn: () => getBooking(Number(id)),
        enabled: !!id,
    });

    // Parse name into first name and surname
    const nameParts = booking?.name?.trim().split(/\s+/) || [];
    const firstName = nameParts[0] || "";
    const surname = nameParts.slice(1).join(" ") || "";

    // Set up form with booking data
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: firstName,
            surname: surname,
            phone: booking?.phone || "",
            email: booking?.email || "",
            table: booking?.table ? String(booking.table) : "",
            guests: booking?.guests || 1,
            duration: booking?.duration || 90,
            date: booking?.date || "",
            time: booking?.time || "",
            specialRequests: booking?.specialRequests || "",
            dietaryRestrictions: booking?.dietaryRestrictions || "",
        },
    });

    // Reset form when booking data loads
    React.useEffect(() => {
        if (booking) {
            const nameParts = booking.name?.trim().split(/\s+/) || [];
            const firstName = nameParts[0] || "";
            const surname = nameParts.slice(1).join(" ") || "";
            form.reset({
                firstName: firstName,
                surname: surname,
                phone: booking.phone || "",
                email: booking.email || "",
                table: booking.table ? String(booking.table) : "",
                guests: booking.guests || 1,
                duration: booking.duration || 90,
                date: booking.date || "",
                time: booking.time || "",
                specialRequests: booking.specialRequests || "",
                dietaryRestrictions: booking.dietaryRestrictions || "",
            });
        }
    }, [booking, form]);

    // Mutation for updating booking
    const updateMutation = useMutation({
        mutationFn: (updates: Partial<z.infer<typeof formSchema>>) => {
            const name = `${updates.firstName || ""} ${updates.surname || ""}`.trim();
            return updateBooking(Number(id!), {
                name,
                phone: updates.phone,
                email: updates.email || undefined,
                table: updates.table,
                guests: updates.guests,
                duration: updates.duration,
                date: updates.date,
                time: updates.time,
                specialRequests: updates.specialRequests || undefined,
                dietaryRestrictions: updates.dietaryRestrictions || undefined,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['booking', id] });
            toast({
                title: "Booking Updated",
                description: "The booking has been successfully updated.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.response?.data?.detail || "Failed to update booking.",
                variant: "destructive",
            });
        },
    });

    // Mutation for deleting booking
    const deleteMutation = useMutation({
        mutationFn: () => deleteBooking(Number(id!)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['booking', id] });
            toast({
                title: "Booking Cancelled",
                description: "The booking has been successfully cancelled.",
            });
            navigate("/bookings");
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.response?.data?.detail || "Failed to cancel booking.",
                variant: "destructive",
            });
        },
    });

    const handleCancelBooking = () => {
        deleteMutation.mutate();
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        updateMutation.mutate(values);
    };

    // If loading, show loading state
    if (isLoading) {
        return (
            <div className="p-6 pt-2">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-visby-bold font-bold text-foreground">Loading...</h1>
                </div>
            </div>
        );
    }

    // If booking not found, show error
    if (!booking || error) {
        return (
            <div className="p-6 pt-2">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-visby-bold font-bold text-foreground">Booking Not Found</h1>
                </div>
                <p className="text-muted-foreground">The booking with ID #{id} could not be found.</p>
            </div>
        );
    }

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins} min`;
        if (mins === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} min`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed":
                return "bg-emerald-100 text-emerald-700";
            case "new_booking":
                return "bg-blue-100 text-blue-700";
            default:
                return "bg-muted text-foreground";
        }
    };

    return (
        <div className="p-6 pt-2 h-[calc(100vh-100px)] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                                className="h-10 bg-red-600 hover:bg-red-700 text-white gap-2 rounded-lg px-4 border-0"
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 className="h-4 w-4 text-white" />
                                {deleteMutation.isPending ? "Cancelling..." : "Cancel Booking"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to cancel this booking for {booking?.name}? 
                                    This action cannot be undone and the booking will be permanently deleted.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleCancelBooking}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Cancel Booking
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button
                        variant="outline"
                        className={`gap-2 font-medium ${form.formState.isDirty
                            ? "bg-white border-0 hover:shadow-md hover:bg-white"
                            : "bg-white border-0 hover:shadow-md hover:bg-white opacity-50 cursor-not-allowed"
                            }`}
                        onClick={() => form.reset()}
                        disabled={!form.formState.isDirty || updateMutation.isPending}
                    >
                        <X className="h-4 w-4" />
                        Clear Changes
                    </Button>
                    <Button
                        type="submit"
                        form="booking-form"
                        variant={form.formState.isDirty ? "default" : "outline"}
                        className={`gap-2 font-medium ${form.formState.isDirty
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                            : "bg-white border-0 hover:shadow-md hover:bg-white opacity-50 cursor-not-allowed"
                            }`}
                        disabled={!form.formState.isDirty || updateMutation.isPending}
                    >
                        <Check className="h-4 w-4" />
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>

            {/* Single white box with all details */}
            <Card className="w-full">
                <CardContent className="p-8">
                    <Form {...form}>
                        <form id="booking-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* Row 1: First Name, Surname, Email, Phone Number */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Users className="h-5 w-5 text-foreground" />
                                                First Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="surname"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Users className="h-5 w-5 text-foreground" />
                                                Surname
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Mail className="h-5 w-5 text-foreground" />
                                                Email
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="email"
                                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Phone className="h-5 w-5 text-foreground" />
                                                Phone Number
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Row 2: Table, Guests, Duration, blank */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <FormField
                                    control={form.control}
                                    name="table"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <PiPicnicTableBold className="h-5 w-5 text-foreground" />
                                                Table
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="guests"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Users className="h-5 w-5 text-foreground" />
                                                Guests
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number"
                                                    min={1}
                                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" 
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="duration"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Clock className="h-5 w-5 text-foreground" />
                                                Duration
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number"
                                                    min={30}
                                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" 
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div></div>
                            </div>

                            {/* Row 3: Date, Time, blank, blank */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Calendar className="h-5 w-5 text-foreground" />
                                                Date
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="date"
                                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="time"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Clock className="h-5 w-5 text-foreground" />
                                                Time
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="time"
                                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div></div>
                                <div></div>
                            </div>

                            {/* Special Requests */}
                            <FormField
                                control={form.control}
                                name="specialRequests"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Cake className="h-5 w-5 text-blue-500" />
                                            Special Requests
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow"
                                                rows={2}
                                                placeholder="No special requests"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Dietary Restrictions */}
                            <FormField
                                control={form.control}
                                name="dietaryRestrictions"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-red-500" />
                                            Dietary Restrictions
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow"
                                                rows={2}
                                                placeholder="None"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
};

export default BookingDetails;
