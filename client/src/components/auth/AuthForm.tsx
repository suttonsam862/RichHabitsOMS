import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Lock, User, Building, Shield, Loader2, AlertCircle, ArrowRight } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

export type AuthFormType = "login" | "register";

interface AuthFormProps {
  type: AuthFormType;
  invitationData?: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    expires: number;
    timestamp: number;
  } | null;
}

// Login form schema
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

// Registration form schema
const registerSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.string().default("customer"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function AuthForm({ type, invitationData }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { login, register } = useAuth();

  // Use appropriate schema based on form type
  const schema = type === "login" ? loginSchema : registerSchema;
  type FormData = z.infer<typeof schema>;

  // Form definition with invitation data pre-filled
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: invitationData?.email || "",
      password: "",
      ...(type === "register" ? {
        username: invitationData?.email?.split('@')[0] || "",
        confirmPassword: "",
        firstName: invitationData?.firstName || "",
        lastName: invitationData?.lastName || "",
        role: invitationData?.role || "customer",
      } : {}),
    },
  });

  // Form submission handler
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      if (type === "login") {
        // Handle login
        await login(data.email, data.password);
        
        toast({
          title: "Login successful",
          description: "Welcome back to ThreadCraft!",
        });
        
        // Redirect based on user role after successful login
        setLocation("/dashboard");
      } else {
        // Handle registration
        await register(data);
        
        toast({
          title: "Registration successful",
          description: "Welcome to ThreadCraft!",
        });
        
        setLocation("/dashboard");
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      
      // Set a user-friendly error message
      let errorMessage = "Please check your credentials and try again.";
      
      if (err.message && err.message.includes("Invalid email or password")) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (err.message && err.message.includes("User not found")) {
        errorMessage = "No account found with this email. Please check your email or register.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      toast({
        title: "Authentication failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Rich Habits glassmorphism auth header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 glass-panel neon-glow flex items-center justify-center">
          <Shield className="h-8 w-8 text-neon-blue" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {type === "login" ? "SECURE ACCESS" : "JOIN THE ELITE"}
        </h2>
        <p className="subtitle text-neon-blue text-sm">
          {type === "login" 
            ? "Rich Habits Authentication" 
            : "Exclusive Membership Portal"}
        </p>
      </div>
      {/* Rich Habits glassmorphism form container */}
      <div className="space-y-6">
        {error && (
          <div className="glass-panel border-red-500/50 p-4 animate-pulse">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="subtitle text-red-400 text-xs">AUTHENTICATION ERROR</span>
            </div>
            <p className="text-red-300 text-sm mt-2">{error}</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="subtitle text-foreground text-xs">Email Access</FormLabel>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
                      <Mail className="h-4 w-4 text-neon-blue" />
                    </div>
                    <FormControl>
                      <Input 
                        placeholder="elite.member@rich-habits.com" 
                        className="rich-input pl-12 h-12 text-foreground placeholder:text-muted-foreground" 
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-xs text-red-400 ml-1" />
                </FormItem>
              )}
            />

            {type === "register" && (
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">Username</FormLabel>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <FormControl>
                        <Input 
                          placeholder="johndoe" 
                          className="pl-10 h-10 focus:ring-2 focus:ring-primary/20" 
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs font-medium text-red-500 ml-1" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="subtitle text-foreground text-xs">Security Code</FormLabel>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
                      <Lock className="h-4 w-4 text-neon-blue" />
                    </div>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••••••" 
                        className="rich-input pl-12 h-12 text-foreground placeholder:text-muted-foreground" 
                        {...field} 
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-xs text-red-400 ml-1" />
                </FormItem>
              )}
            />

            {type === "register" && (
              <>
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm font-medium">Confirm Password</FormLabel>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className="pl-10 h-10 focus:ring-2 focus:ring-primary/20" 
                            {...field} 
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-xs font-medium text-red-500 ml-1" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm font-medium">First Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John" 
                            className="h-10 focus:ring-2 focus:ring-primary/20" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Doe" 
                            className="h-10 focus:ring-2 focus:ring-primary/20" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm font-medium">Account Type</FormLabel>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Building className="h-4 w-4 text-gray-400" />
                        </div>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="pl-10 h-10 focus:ring-2 focus:ring-primary/20">
                              <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="salesperson">Salesperson</SelectItem>
                            <SelectItem value="designer">Designer</SelectItem>
                            <SelectItem value="manufacturer">Manufacturer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormDescription className="text-xs text-gray-500 ml-1">
                        Select the type of account that best fits your role
                      </FormDescription>
                      <FormMessage className="text-xs font-medium text-red-500 ml-1" />
                    </FormItem>
                  )}
                />
              </>
            )}

            <Button 
              type="submit" 
              className="btn-primary w-full h-14 mt-8 text-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="subtitle">
                    {type === "login" ? "Authenticating..." : "Processing..."}
                  </span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <span className="subtitle">
                    {type === "login" ? "Access Portal" : "Join Elite"}
                  </span>
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </form>
        </Form>
        
        {/* Rich Habits footer navigation */}
        <div className="text-center pt-8 border-t border-glass-border">
          <p className="text-muted-foreground text-sm">
            {type === "login" ? (
              <>
                <span>New to Rich Habits?</span>{" "}
                <button 
                  type="button"
                  className="text-neon-blue hover:text-neon-green transition-colors subtitle text-sm underline" 
                  onClick={() => setLocation("/register")}
                >
                  Request Membership
                </button>
              </>
            ) : (
              <>
                <span>Already a member?</span>{" "}
                <button 
                  type="button"
                  className="text-neon-blue hover:text-neon-green transition-colors subtitle text-sm underline" 
                  onClick={() => setLocation("/login")}
                >
                  Member Access
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
