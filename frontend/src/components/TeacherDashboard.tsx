import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAppStore } from "@/lib/store";
import { AttendanceRecord } from "@/lib/types";
import { QrCode, KeyRound, FileSpreadsheet, LogOut, RefreshCw } from "lucide-react";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";

export default function TeacherDashboard() {
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("qr-generator");
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    subject: "",
    section: "",
    course: ""
  });
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    currentTeacher,
    isAuthenticated,
    currentSession,
    logout,
    createSession,
    generateOtp,
    endSession,
    getSessionRecords,
    //@ts-ignore
    fetchAttendanceRecords
  } = useAppStore();
  
  const sessionAttendance: AttendanceRecord[] = 
    currentSession ? getSessionRecords(currentSession.id) : [];
  
  const verifiedCount = sessionAttendance.filter(record => record.verified).length;
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);
  
  useEffect(() => {
    // If there's an active session, fetch attendance data when component mounts
    if (currentSession?.isActive && currentSession.id) {
      handleRefreshAttendance();
    }
  }, [currentSession?.id]);
  
  useEffect(() => {
    let timer: number | null = null;
    
    if (currentSession?.otp && currentSession.expiresAt) {
      const updateCountdown = () => {
        const expiryTime = new Date(currentSession.expiresAt!).getTime();
        const now = new Date().getTime();
        const timeLeft = Math.max(0, Math.floor((expiryTime - now) / 1000));
        
        setOtpCountdown(timeLeft);
        
        if (timeLeft <= 0 && timer) {
          window.clearInterval(timer);
        }
      };
      
      updateCountdown();
      timer = window.setInterval(updateCountdown, 1000);
    }
    
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [currentSession?.otp, currentSession?.expiresAt]);
  
  const handleCreateSessionClick = () => {
    setShowSessionDialog(true);
  };
  
  const handleSessionFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSessionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleCreateSession = async () => {
    if (!currentTeacher) return;
    
    setIsCreatingSession(true);
    
    try {
      await createSession(
        currentTeacher.id,
        sessionForm.subject,
        sessionForm.section,
        sessionForm.course
      );
      
      toast({
        title: "Session Created",
        description: "QR code generated successfully.",
      });
      
      setShowSessionDialog(false);
      // Automatically switch to OTP tab after QR generation
      setActiveTab("otp-verification");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Session Creation Failed",
        description: "Failed to create session. Please try again.",
      });
    } finally {
      setIsCreatingSession(false);
    }
  };
  
  const handleGenerateOTP = async () => {
    if (currentSession) {
      try {
        await generateOtp(currentSession.id);
        toast({
          title: "OTP Generated",
          description: "A new OTP has been generated and is valid for 20 seconds.",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "OTP Generation Failed",
          description: "Failed to generate OTP. Please try again.",
        });
      }
    }
  };
  
  const handleEndSession = () => {
    if (currentSession) {
      endSession(currentSession.id);
      toast({
        title: "Session Ended",
        description: "The attendance session has been closed.",
      });
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleRefreshAttendance = async () => {
    if (!currentSession) return;
    
    setIsRefreshing(true);
    
    try {
      await fetchAttendanceRecords(currentSession.id);
      
      toast({
        title: "Attendance Updated",
        description: "Successfully refreshed attendance data.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Refresh",
        description: "Could not fetch the latest attendance data.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!currentSession) return;
    
    setIsExporting(true);
    
    try {
      // Using the backend endpoint to get Excel file
      window.location.href = `https://ideal-octo-meme.onrender.com/api/session/${currentSession.id}/attendance/download`;
      
      toast({
        title: "Export Started",
        description: "Your attendance data download will begin shortly.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "An error occurred while exporting data.",
      });
    } finally {
      // Set timeout to ensure the exporting state doesn't disappear too quickly
      setTimeout(() => {
        setIsExporting(false);
      }, 1000);
    }
  };

  if (!currentTeacher) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
            <p className="text-gray-500">Welcome, {currentTeacher.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex gap-2">
            <LogOut size={18} />
            <span>Logout</span>
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Session Status</CardTitle>
              <CardDescription>
                {currentSession?.isActive 
                  ? "An attendance session is active"
                  : "No active attendance session"}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {currentSession?.isActive ? (
                <span className="text-green-600">Active</span>
              ) : (
                <span className="text-gray-500">Inactive</span>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Student Count</CardTitle>
              <CardDescription>Students who have submitted form</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {sessionAttendance.length}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Verified Attendance</CardTitle>
              <CardDescription>Students verified with OTP</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {verifiedCount} / {sessionAttendance.length}
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white rounded-lg shadow-sm">
          <TabsList className="p-0 w-full border-b rounded-none gap-8">
            <TabsTrigger value="qr-generator" className="flex-1">QR Generator</TabsTrigger>
            <TabsTrigger value="otp-verification" className="flex-1">OTP Verification</TabsTrigger>
            <TabsTrigger value="attendance-list" className="flex-1">Attendance List</TabsTrigger>
          </TabsList>
          
          <TabsContent value="qr-generator" className="p-6">
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-4">Attendance QR Code</h3>
              
              {!currentSession?.isActive ? (
                <div className="w-full max-w-md text-center">
                  <p className="text-gray-600 mb-4">
                    Generate a new QR code for students to scan and mark their attendance.
                  </p>
                  <Button 
                    onClick={handleCreateSessionClick} 
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    <QrCode size={18} />
                    Generate QR Code
                  </Button>
                </div>
              ) : (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-md mb-4">
                    <QRCode 
                      value={currentSession.qrCode} 
                      size={250}
                      level="H"
                      fgColor="#1e40af"
                    />
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-6 text-center">
                    Display this QR code to students. When scanned, they will be directed
                    to a page where they can mark their attendance.
                  </p>
                  
                  <div className="flex gap-4 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={handleEndSession}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      End Session
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("otp-verification")}
                      className="bg-blue-600 hover:bg-blue-700 gap-2"
                    >
                      <KeyRound size={18} />
                      Go to OTP Generation
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="otp-verification" className="p-6">
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-4">OTP Verification</h3>
              
              {!currentSession?.isActive ? (
                <p className="text-gray-600">
                  No active session. Generate a QR code first.
                </p>
              ) : (
                <div className="text-center">
                  <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-6 w-full max-w-md">
                    {currentSession.otp ? (
                      <div className="space-y-4">
                        <div className="text-5xl font-bold tracking-wider text-blue-700">
                          {currentSession.otp}
                        </div>
                        <div className="text-sm text-gray-600">
                          OTP expires in <span className="font-semibold">{otpCountdown}</span> seconds
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-600 mb-4">
                        Generate an OTP to verify student attendance.
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    onClick={handleGenerateOTP} 
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    <KeyRound size={18} />
                    {currentSession.otp ? "Generate New OTP" : "Generate OTP"}
                  </Button>
                  
                  {currentSession.otp && (
                    <p className="mt-4 text-sm text-gray-600">
                      Announce this OTP to your students. They will need to enter it to complete
                      their attendance verification.
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="attendance-list" className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Attendance Records</h3>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleRefreshAttendance} 
                  disabled={!currentSession || isRefreshing}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                  Refresh
                </Button>
                <Button 
                  onClick={handleExportToExcel} 
                  disabled={sessionAttendance.length === 0 || isExporting || !currentSession}
                  variant="outline"
                  className="gap-2"
                >
                  <FileSpreadsheet size={18} />
                  Export to Excel
                </Button>
              </div>
            </div>
            
            {sessionAttendance.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No attendance records yet.
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead className="w-[150px]">Timestamp</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionAttendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.studentId}</TableCell>
                        <TableCell>{record.studentName}</TableCell>
                        <TableCell>{record.rollNumber}</TableCell>
                        <TableCell>
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.verified ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Session Creation Dialog */}
        <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Attendance Session</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={sessionForm.subject}
                  onChange={handleSessionFormChange}
                  placeholder="Enter subject name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  name="section"
                  value={sessionForm.section}
                  onChange={handleSessionFormChange}
                  placeholder="Enter section (e.g., A, B)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="course">Course</Label>
                <Input
                  id="course"
                  name="course"
                  value={sessionForm.course}
                  onChange={handleSessionFormChange}
                  placeholder="Enter course code"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSessionDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSession}
                disabled={isCreatingSession}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreatingSession ? "Creating..." : "Create Session"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}