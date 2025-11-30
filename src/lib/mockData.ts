import { Booking } from "@/types/booking";
import { Restaurant, Table, LoginResponse } from "./api";
import { AuthUser } from "@/types/user";

export const mockUser: AuthUser = {
    id: 1,
    email: "demo@example.com",
    username: "demo",
    full_name: "Demo User",
    is_active: true,
    is_superuser: false,
    restaurant_id: "1",
    created_at: new Date().toISOString(),
};

export const mockLoginResponse: LoginResponse = {
    access_token: "demo-token",
    token_type: "bearer",
};

export const mockRestaurants: Restaurant[] = [
    {
        id: 1,
        name: "Roya Demo Restaurant",
        description: "A fine dining experience",
        is_active: true,
        operating_hours: {
            monday: { open: "17:00", close: "22:00" },
            tuesday: { open: "17:00", close: "22:00" },
            wednesday: { open: "17:00", close: "22:00" },
            thursday: { open: "17:00", close: "23:00" },
            friday: { open: "17:00", close: "23:00" },
            saturday: { open: "16:00", close: "23:00" },
            sunday: { open: "16:00", close: "22:00" },
        },
    },
];

export const mockTables: Table[] = [
    { id: 1, restaurant_id: "1", table_number: "1", min_capacity: 2, max_capacity: 4, section: "Main", is_active: true },
    { id: 2, restaurant_id: "1", table_number: "2", min_capacity: 2, max_capacity: 4, section: "Main", is_active: true },
    { id: 3, restaurant_id: "1", table_number: "3", min_capacity: 2, max_capacity: 4, section: "Main", is_active: true },
    { id: 4, restaurant_id: "1", table_number: "4", min_capacity: 4, max_capacity: 6, section: "Window", is_active: true },
    { id: 5, restaurant_id: "1", table_number: "5", min_capacity: 4, max_capacity: 6, section: "Window", is_active: true },
    { id: 6, restaurant_id: "1", table_number: "6", min_capacity: 6, max_capacity: 8, section: "Private", is_active: true },
];

const today = new Date().toISOString().split('T')[0];

export const mockBookings: Booking[] = [
    {
        id: 1,
        table_id: 1,
        table: "1",
        date: today,
        time: "18:00",
        duration: 90,
        guests: 2,
        name: "John Doe",
        email: "john@example.com",
        phone: "555-0101",
        status: "confirmed",
        specialRequests: "Window seat if possible",
    },
    {
        id: 2,
        table_id: 4,
        table: "4",
        date: today,
        time: "19:30",
        duration: 120,
        guests: 4,
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "555-0102",
        status: "confirmed",
        specialRequests: "Anniversary",
    },
    {
        id: 3,
        table_id: 2,
        table: "2",
        date: today,
        time: "20:00",
        duration: 90,
        guests: 2,
        name: "Bob Johnson",
        email: "bob@example.com",
        phone: "555-0103",
        status: "new_booking",
    },
];
