import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  updateCurrentUser,
  changePassword,
  type UpdateUserPayload,
  type ChangePasswordPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const profileSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  full_name: z.string().min(2, "Name must be at least 2 characters").optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(8, "Current password must be at least 8 characters"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

const Settings = () => {
  const { user, setUser, refreshUser, logout } = useAuth();
  const { toast } = useToast();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email ?? "",
      full_name: user?.full_name ?? "",
    },
  });

  useEffect(() => {
    profileForm.reset({
      email: user?.email ?? "",
      full_name: user?.full_name ?? "",
    });
  }, [user, profileForm]);

  const profileMutation = useMutation({
    mutationFn: (payload: UpdateUserPayload) => updateCurrentUser(payload),
    onSuccess: async () => {
      await refreshUser();
      toast({ title: "Profile updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update profile",
        description: error?.response?.data?.detail ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
    onSuccess: () => {
      passwordForm.reset();
      toast({ title: "Password updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update password",
        description: error?.response?.data?.detail ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitProfile = (values: z.infer<typeof profileSchema>) => {
    const payload: UpdateUserPayload = {
      email: values.email,
      full_name: values.full_name?.trim() || null,
    };
    profileMutation.mutate(payload);
  };

  const onSubmitPassword = (values: z.infer<typeof passwordSchema>) => {
    const payload: ChangePasswordPayload = {
      current_password: values.current_password,
      new_password: values.new_password,
    };
    passwordMutation.mutate(payload);
  };

  return (
    <div className="p-6 pt-2 h-[calc(100vh-100px)] overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Update your contact details and personal information.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-5">
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={profileMutation.isPending} className="px-8 bg-emerald-500 hover:bg-emerald-600 text-white">
                    {profileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Keep your account secure with a strong password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-5">
                <FormField
                  control={passwordForm.control}
                  name="current_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="new_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:shadow-md focus-visible:shadow-md transition-shadow" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordMutation.isPending} className="px-8 bg-emerald-500 hover:bg-emerald-600 text-white">
                    {passwordMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sign Out</CardTitle>
            <CardDescription>Sign out of your account on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={logout}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
