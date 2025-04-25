
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import TeacherLogin from "@/components/TeacherLogin";

const Index = () => {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip any navigation logic for attendance URLs
    if (location.pathname.startsWith("/attend/")) {
      return;
    }
    
    // Only redirect to dashboard if authenticated and not on an attendance URL
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate, location.pathname]);

  // Only show the teacher login if we're at the root path exactly
  return location.pathname === "/" ? <TeacherLogin /> : null;
};

export default Index;
