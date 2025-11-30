import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const { login, user, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting || isLoading;

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/");
    }
  }, [isLoading, user, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.username, values.password);
      toast({ title: "Welcome back", description: "You are now signed in." });
    } catch (error: any) {
      const description =
        error?.response?.data?.detail || "Failed to sign in. Please check your credentials.";
      toast({ title: "Sign in failed", description, variant: "destructive" });
    }
  };

  return (
    <div className="h-screen bg-emerald-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-2xl p-8 border border-emerald-100">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-emerald-600">Tabley</h1>
            <p className="text-muted-foreground mt-2">Sign in to manage your restaurant bookings</p>
            {import.meta.env.VITE_DEMO_MODE === 'true' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-semibold mb-1">Demo Mode Active</p>
                <p>Username: <span className="font-mono">admin</span></p>
                <p>Password: <span className="font-mono">password</span></p>
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="admin"
                        autoComplete="username"
                        className="border-emerald-200 focus-visible:ring-emerald-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="border-emerald-200 focus-visible:ring-emerald-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
