
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentAttendance from "./components/StudentAttendance";
import MarkAttendance from "./components/MarkAttendance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Place the student attendance route first for priority and make sure it works with mobile scans */}
          <Route path="/attend/:sessionId" element={<StudentAttendance />} />
          <Route path="/dashboard" element={<TeacherDashboard />} />
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/mark-attendance" element={<MarkAttendance/>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
