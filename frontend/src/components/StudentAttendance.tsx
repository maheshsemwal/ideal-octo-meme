
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAppStore } from "@/lib/store";
import { Check, QrCode } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export default function StudentAttendance() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [verificationStep, setVerificationStep] = useState<"details" | "otp" | "success">("details");
  const [attendanceRecordId, setAttendanceRecordId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  
  const {
    sessions,
    addAttendanceRecord,
    verifyAttendance
  } = useAppStore();
  
  // Find the active session matching the ID from the URL
  const session = sessions.find(
    s => s.id === sessionId && s.isActive
  );
  
  useEffect(() => {
    // Check if session exists and is active
    if (!session) {
      toast({
        variant: "destructive",
        title: "Invalid Session",
        description: "This attendance session is not active or doesn't exist.",
      });
      
      // Redirect after a delay
      const timeout = setTimeout(() => {
        navigate("/");
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [session, navigate, toast, sessionId]);

  // Define validation schemas
  const detailsSchema = z.object({
    studentName: z.string().min(1, "Name is required"),
    rollNumber: z.string().min(1, "Roll number is required"),
    studentId: z.string().min(1, "Student ID is required"),
  });

  const otpSchema = z.object({
    otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must contain only digits"),
  });

  // Create form hooks
  const detailsForm = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      studentName: "",
      rollNumber: "",
      studentId: "",
    },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Handle details submission
  const onSubmitDetails = (data: z.infer<typeof detailsSchema>) => {
    try {
      if (!session) return;
      
      const record = addAttendanceRecord(
        session.id,
        data.studentName,
        data.rollNumber,
        data.studentId
      );
      
      setAttendanceRecordId(record.id);
      setVerificationStep("otp");
      
      toast({
        title: "Details Submitted",
        description: "Please enter the OTP announced by your teacher.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "There was an error submitting your details.",
      });
    }
  };
  
  // Handle OTP verification
  const onSubmitOTP = (data: z.infer<typeof otpSchema>) => {
    if (!attendanceRecordId) return;
    
    setAttempts(prev => prev + 1);
    
    try {
      const success = verifyAttendance(attendanceRecordId, data.otp);
      
      if (success) {
        setVerificationStep("success");
        toast({
          title: "Attendance Marked",
          description: "Your attendance has been successfully verified.",
        });
      } else {
        // Check if max attempts reached
        if (attempts >= 2) {
          toast({
            variant: "destructive",
            title: "Too Many Attempts",
            description: "You've reached the maximum number of attempts.",
          });
          
          // Redirect after a delay
          setTimeout(() => {
            navigate("/");
          }, 3000);
        } else {
          toast({
            variant: "destructive",
            title: "Invalid OTP",
            description: `Incorrect or expired OTP. ${2 - attempts} attempts remaining.`,
          });
          otpForm.reset();
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verification Error",
        description: "An error occurred during verification.",
      });
    }
  };
  
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl text-center">Invalid Session</CardTitle>
            <CardDescription className="text-center">
              This attendance session is not active or doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p>Redirecting to home page...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center border-b pb-6">
          <CardTitle className="text-2xl font-bold">Student Panel</CardTitle>
          <CardDescription className="text-lg">
            Mark your attendance by scanning QR code and entering OTP
          </CardDescription>
        </CardHeader>
        
        {verificationStep === "success" ? (
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-2">Attendance Marked!</h3>
            <p className="text-gray-600 text-center">
              Your attendance has been successfully recorded and verified.
            </p>
          </CardContent>
        ) : verificationStep === "details" ? (
          <Form {...detailsForm}>
            <form onSubmit={detailsForm.handleSubmit(onSubmitDetails)}>
              <CardContent className="pt-6 space-y-4">
                <FormField
                  control={detailsForm.control}
                  name="studentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} className="border-blue-200 focus:border-blue-400" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={detailsForm.control}
                  name="rollNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roll Number</FormLabel>
                      <FormControl>
                        <Input placeholder="CS12345" {...field} className="border-blue-200 focus:border-blue-400" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={detailsForm.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student ID</FormLabel>
                      <FormControl>
                        <Input placeholder="STD12345" {...field} className="border-blue-200 focus:border-blue-400" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={detailsForm.formState.isSubmitting}
                >
                  {detailsForm.formState.isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        ) : (
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onSubmitOTP)}>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-center text-gray-600 mb-2">
                  Enter the 6-digit OTP announced by your teacher
                </p>
                
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Enter 6-digit OTP"
                          maxLength={6}
                          {...field}
                          className="text-center text-xl tracking-widest border-blue-200 focus:border-blue-400"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-center">
                        OTP is valid for 20 seconds only
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              
              <CardFooter className="flex-col gap-2">
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={otpForm.formState.isSubmitting || !otpForm.formState.isValid}
                >
                  {otpForm.formState.isSubmitting ? "Verifying..." : "Verify OTP"}
                </Button>
                
                <p className="text-xs text-gray-500 text-center">
                  {3 - attempts} attempts remaining
                </p>
              </CardFooter>
            </form>
          </Form>
        )}
      </Card>
    </div>
  );
}
