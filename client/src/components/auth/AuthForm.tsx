import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Lock, User, Building, UserCheck, Loader2, AlertCircle, ArrowRight } from "lucide-react";

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

export function AuthForm({ type }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { login, register } = useAuth();

  // Use appropriate schema based on form type
  const schema = type === "login" ? loginSchema : registerSchema;
  type FormData = z.infer<typeof schema>;

  // Form definition
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      ...(type === "register" ? {
        username: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        role: "customer",
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
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred during authentication");
      toast({
        title: "Authentication failed",
        description: err.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border border-gray-100">
      <CardHeader className="pb-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <UserCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          {type === "login" ? "Welcome Back" : "Create Your Account"}
        </CardTitle>
        <CardDescription className="text-center pt-1.5">
          {type === "login" 
            ? "Sign in to access your clothing orders and designs" 
            : "Join our custom clothing platform to start creating"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6 animate-fadeIn">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="ml-2">Authentication Error</AlertTitle>
            <AlertDescription className="ml-6 mt-2">{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <FormControl>
                      <Input 
                        placeholder="your.email@example.com" 
                        className="pl-10 h-10 focus:ring-2 focus:ring-primary/20" 
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-xs font-medium text-red-500 ml-1" />
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
                <FormItem className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <FormLabel className="text-sm font-medium">Password</FormLabel>
                    {type === "login" && (
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs">
                        Forgot password?
                      </Button>
                    )}
                  </div>
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
              className="w-full h-11 mt-6 font-medium shadow-sm transition-all hover:shadow-md"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {type === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {type === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-6 pb-6">
        <p className="text-sm text-gray-600">
          {type === "login" ? (
            <>
              Don't have an account?{" "}
              <Button 
                variant="link" 
                className="p-0 font-medium text-primary hover:text-primary/80" 
                onClick={() => setLocation("/register")}
              >
                Register
              </Button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Button 
                variant="link" 
                className="p-0 font-medium text-primary hover:text-primary/80" 
                onClick={() => setLocation("/login")}
              >
                Sign In
              </Button>
            </>
          )}
        </p>
      </CardFooter>
    </Card>
  );
}
