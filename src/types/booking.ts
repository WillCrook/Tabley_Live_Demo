export interface Booking {
    id: number;
    name: string;
    guests: number;
    time: string;
    duration: number;
    date: string;
    phone: string;
    status: string;
    table: string | number; // Can be numeric or alphanumeric (e.g., "1", "B1", "W1")
    table_id?: number | null;
    specialRequests?: string;
    dietaryRestrictions?: string;
    bookedAt?: Date;
    email?: string;
    history?: string;
}
