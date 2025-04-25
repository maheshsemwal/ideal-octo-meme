import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const MarkAttendance = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionid");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    rollNo: "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionId) {
      toast({
        title: "Error",
        description: "Session ID is missing",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/mark-attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      toast({
        title: "Success",
        description: "Attendance marked successfully!",
      });

      // Reset form
      setFormData({
        name: "",
        rollNo: "",
        otp: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark attendance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Mark Attendance</h1>
          <p className="text-sm text-slate-600 mt-2">Please enter your details and the OTP</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              Full Name
            </label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your full name"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rollNo" className="text-sm font-medium text-slate-700">
              Roll Number
            </label>
            <Input
              id="rollNo"
              required
              value={formData.rollNo}
              onChange={(e) => setFormData(prev => ({ ...prev, rollNo: e.target.value }))}
              placeholder="Enter your roll number"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="otp" className="text-sm font-medium text-slate-700">
              OTP
            </label>
            <Input
              id="otp"
              required
              value={formData.otp}
              onChange={(e) => setFormData(prev => ({ ...prev, otp: e.target.value }))}
              placeholder="Enter the OTP"
              className="w-full"
              maxLength={6}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Marking Attendance...
              </>
            ) : (
              "Mark Attendance"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default MarkAttendance;