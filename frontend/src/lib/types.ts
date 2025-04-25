
// Define types for our application
export interface Teacher {
  id: string;
  name: string;
  email: string;
  password: string; // Note: In a real app, never store passwords in the frontend
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  studentId: string;
}

export interface AttendanceSession {
  id: string;
  teacherId: string;
  createdAt: string;
  qrCode: string;
  otp: string | null;
  otpGeneratedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  timestamp: string;
  verified: boolean;
}

// Mock data
export const mockTeachers: Teacher[] = [
  {
    id: "1",
    name: "Professor Smith",
    email: "prof@example.com", 
    password: "password123" // In a real app, use proper authentication
  }
];
