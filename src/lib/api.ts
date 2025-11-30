import axios, { AxiosHeaders } from "axios";
import type { Booking } from "@/types/booking";
import type { AuthUser } from "@/types/user";
import { mockBookings, mockRestaurants, mockTables, mockUser, mockLoginResponse } from "./mockData";

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

let authToken: string | null = null;

export const setAuthToken = (token: string) => {
  authToken = token;
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const clearAuthToken = () => {
  authToken = null;
  delete api.defaults.headers.common.Authorization;
};

export interface CreateBookingPayload {
  restaurant_id: string;
  name: string;
  phone: string;
  guests: number;
  time: string;
  duration: number;
  date: string;
  status?: string;
  email?: string;
  table_id?: number;
  specialRequests?: string;
  dietaryRestrictions?: string;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (authToken) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set("Authorization", `Bearer ${authToken}`);
    } else {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${authToken}`;
    }
  }
  return config;
});

// Bookings API
export const getBookings = async (params?: { date?: string; status?: string }): Promise<Booking[]> => {
  if (IS_DEMO) {
    console.log("DEMO MODE: Returning mock bookings");
    // Filter mock bookings if params are provided (basic implementation)
    let bookings = [...mockBookings];
    if (params?.date) {
      bookings = bookings.filter(b => b.date === params.date);
    }
    return bookings;
  }
  const res = await api.get("/api/bookings", { params });
  return res.data;
};

export const getBooking = async (id: number): Promise<Booking> => {
  if (IS_DEMO) {
    const booking = mockBookings.find(b => b.id === id);
    if (!booking) throw new Error("Booking not found");
    return booking;
  }
  const res = await api.get(`/api/bookings/${id}`);
  return res.data;
};

export const createBooking = async (booking: CreateBookingPayload): Promise<Booking> => {
  if (IS_DEMO) {
    const newBooking: Booking = {
      id: Math.floor(Math.random() * 10000),
      ...booking,
      table: booking.table_id ? String(booking.table_id) : "Unassigned",
      status: booking.status || "new_booking",
    };
    mockBookings.push(newBooking);
    return newBooking;
  }
  const res = await api.post("/api/bookings", booking);
  return res.data;
};

export const updateBooking = async (id: number, updates: Partial<Booking>): Promise<Booking> => {
  if (IS_DEMO) {
    const index = mockBookings.findIndex(b => b.id === id);
    if (index === -1) throw new Error("Booking not found");
    mockBookings[index] = { ...mockBookings[index], ...updates };
    return mockBookings[index];
  }
  const res = await api.put(`/api/bookings/${id}`, updates);
  return res.data;
};

export const deleteBooking = async (id: number): Promise<void> => {
  if (IS_DEMO) {
    const index = mockBookings.findIndex(b => b.id === id);
    if (index !== -1) {
      mockBookings.splice(index, 1);
    }
    return;
  }
  await api.delete(`/api/bookings/${id}`);
};

// Restaurants API
export interface Restaurant {
  id: number;
  name: string;
  description?: string;
  operating_hours?: {
    [key: string]: { open: string; close: string };
  };
  is_active: boolean;
}

export const getRestaurants = async (): Promise<Restaurant[]> => {
  if (IS_DEMO) return mockRestaurants;
  const res = await api.get("/api/restaurants", { params: { is_active: true } });
  return res.data;
};

export const getRestaurant = async (id: number): Promise<Restaurant> => {
  if (IS_DEMO) {
    const restaurant = mockRestaurants.find(r => r.id === id);
    if (!restaurant) throw new Error("Restaurant not found");
    return restaurant;
  }
  const res = await api.get(`/api/restaurants/${id}`);
  return res.data;
};

// Auth API
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  if (IS_DEMO) return mockLoginResponse;
  const res = await api.post<LoginResponse>("/api/auth/login", payload);
  return res.data;
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  if (IS_DEMO) return mockUser;
  const res = await api.get<AuthUser>("/api/auth/me");
  return res.data;
};

export interface UpdateUserPayload {
  email?: string;
  full_name?: string | null;
}

export const updateCurrentUser = async (payload: UpdateUserPayload): Promise<AuthUser> => {
  if (IS_DEMO) {
    return { ...mockUser, ...payload };
  }
  const res = await api.patch<AuthUser>("/api/auth/me", payload);
  return res.data;
};

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
  if (IS_DEMO) return;
  await api.post("/api/auth/me/change-password", payload);
};

// Tables API
export interface Table {
  id: number;
  restaurant_id: string;
  table_number: string;
  min_capacity: number;
  max_capacity: number;
  section?: string;
  is_active: boolean;
}

export const getTables = async (restaurantId?: string): Promise<Table[]> => {
  if (IS_DEMO) return mockTables;
  const params = restaurantId ? { restaurant_id: restaurantId, is_active: true } : { is_active: true };
  const res = await api.get("/api/tables", { params });
  return res.data;
};

export default api;