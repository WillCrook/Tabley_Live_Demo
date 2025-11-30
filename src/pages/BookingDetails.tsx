import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Phone, ArrowLeft, Utensils, Trash2, Mail, UtensilsCrossed } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBooking, deleteBooking } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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

    return (
        <div className="p-6 pt-2">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-visby-bold font-bold text-foreground">{booking.name}</h1>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5 text-sm text-foreground">
                                <UtensilsCrossed className="h-4 w-4" />
                                <span className="font-semibold">Table {booking.table}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-foreground">
                                <Users className="h-4 w-4" />
                                <span className="font-semibold">{booking.guests} guests</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                                className="h-10 bg-red-50 hover:bg-red-100 text-red-600 gap-2 rounded-lg px-4 border-0"
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 className="h-4 w-4 text-red-600" />
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
                </div>
            </div>

            <div className="grid gap-6">
                {/* Main Info */}
                <Card className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xl font-semibold">Guest Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{booking.phone}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Date & Time</p>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span>{booking.date}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>{booking.time}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{booking.email || "N/A"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Guest History</p>
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span>{booking.history || "First visit"}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="w-full">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold">Notes & Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Special Requests</p>
                            <p className="text-foreground bg-muted/30 p-3 rounded-lg">{booking.specialRequests || "No special requests"}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Dietary Requirements</p>
                            <div className="flex items-center gap-2 text-foreground bg-orange-50 p-3 rounded-lg border border-orange-100">
                                <Utensils className="h-4 w-4 text-orange-500" />
                                <span>{booking.dietaryRestrictions || "None"}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default BookingDetails;
