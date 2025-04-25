import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AttendanceRecord, AttendanceSession, Student, Teacher } from './types';
import { v4 as uuidv4 } from 'uuid';
import { mockTeachers } from './types';
import axios from 'axios';

interface AppState {
  // Auth
  currentTeacher: Teacher | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  
  // Sessions
  currentSession: AttendanceSession | null;
  sessions: AttendanceSession[];
  createSession: (
    teacherId: string, 
    subject: string,
    section: string,
    course: string
  ) => Promise<AttendanceSession>;
  generateOtp: (sessionId: string) => Promise<string>;
  endSession: (sessionId: string) => void;
  
  // Attendance
  attendanceRecords: AttendanceRecord[];
  addAttendanceRecord: (
    sessionId: string, 
    studentName: string, 
    rollNumber: string, 
    studentId: string
  ) => AttendanceRecord;
  verifyAttendance: (recordId: string, otp: string) => boolean;
  fetchAttendanceRecords: (sessionId: string) => Promise<AttendanceRecord[]>;
  
  // Utility
  getSessionRecords: (sessionId: string) => AttendanceRecord[];
  getActiveSession: () => AttendanceSession | null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth state
      currentTeacher: null,
      isAuthenticated: false,
      
      // Sessions state
      currentSession: null,
      sessions: [],
      
      // Attendance state
      attendanceRecords: [],
      
      // Auth actions
      login: (email: string, password: string) => {
        const teacher = mockTeachers.find(
          (t) => t.email === email && t.password === password
        );
        
        if (teacher) {
          set({ currentTeacher: teacher, isAuthenticated: true });
          return true;
        }
        return false;
      },
      
      logout: () => {
        set({ 
          currentTeacher: null, 
          isAuthenticated: false,
          currentSession: null 
        });
      },
      
      // Session actions
      createSession: async (teacherId, subject, section, course) => {
        try {
          // Call the backend API to create a session
          const response = await axios.post('https://ideal-octo-meme.onrender.com/api/start-session', {
            subject,
            section,
            course
          });
          //@ts-ignore
          const { sessionId, otp } = response.data;
          
          // Get the fully qualified domain
          let baseUrl = '';
          
          // Check if we're running in a browser environment
          if (typeof window !== 'undefined') {
            // Use current hostname and protocol
            baseUrl = `${window.location.protocol}//${window.location.host}`;
          }
          
          const newSession: AttendanceSession = {
            id: sessionId,
            teacherId,
            createdAt: new Date().toISOString(),
            qrCode: `${baseUrl}/mark-attendance?sessionid=${sessionId}`,
            otp: otp,
            otpGeneratedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 20000).toISOString(), // 20 seconds expiry
            isActive: true,
            //@ts-ignore
            subject,
            section,
            course
          };
          
          set((state) => ({ 
            sessions: [...state.sessions, newSession],
            currentSession: newSession
          }));
          
          return newSession;
        } catch (error) {
          console.error('Error creating session:', error);
          throw error;
        }
      },
      
      generateOtp: async (sessionId: string) => {
        try {
          const response = await axios.post('https://ideal-octo-meme.onrender.com/api/generate-otp', {
            sessionId
          });
          //@ts-ignore
          const { otp } = response.data;
          const now = new Date();
          const expiresAt = new Date(now.getTime() + 20000); // 20 seconds expiry
          
          set((state) => ({
            sessions: state.sessions.map((session) => {
              if (session.id === sessionId) {
                return { 
                  ...session, 
                  otp, 
                  otpGeneratedAt: now.toISOString(),
                  expiresAt: expiresAt.toISOString() 
                };
              }
              return session;
            }),
            currentSession: state.currentSession && state.currentSession.id === sessionId
              ? { 
                  ...state.currentSession, 
                  otp, 
                  otpGeneratedAt: now.toISOString(),
                  expiresAt: expiresAt.toISOString() 
                }
              : state.currentSession
          }));
          
          return otp;
        } catch (error) {
          console.error('Error generating OTP:', error);
          throw error;
        }
      },
      endSession: (sessionId: string) => {
        // TODO: Add API call to end session in backend
        // This should be implemented to keep frontend and backend in sync
        
        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id === sessionId) {
              return { ...session, isActive: false };
            }
            return session;
          }),
          currentSession: state.currentSession && state.currentSession.id === sessionId
            ? { ...state.currentSession, isActive: false }
            : state.currentSession
        }));
      },
      
      // Attendance actions
      addAttendanceRecord: (sessionId, studentName, rollNumber, studentId) => {
        const newRecord: AttendanceRecord = {
          id: uuidv4(),
          sessionId,
          studentId,
          studentName,
          rollNumber,
          timestamp: new Date().toISOString(),
          verified: false,
        };
        
        set((state) => ({ 
          attendanceRecords: [...state.attendanceRecords, newRecord] 
        }));
        
        return newRecord;
      },
      
      verifyAttendance: (recordId, otp) => {
        const state = get();
        const record = state.attendanceRecords.find(r => r.id === recordId);
        
        if (!record) return false;
        
        const session = state.sessions.find(s => s.id === record.sessionId);
        if (!session) return false;
        
        // Check if OTP matches and is not expired
        const isOtpValid = session.otp === otp;
        const isNotExpired = session.expiresAt ? new Date(session.expiresAt) > new Date() : false;
        
        if (isOtpValid && isNotExpired) {
          set((state) => ({
            attendanceRecords: state.attendanceRecords.map((r) => {
              if (r.id === recordId) {
                return { ...r, verified: true };
              }
              return r;
            })
          }));
          return true;
        }
        
        return false;
      },
      
      // Fetch attendance records from backend
      fetchAttendanceRecords: async (sessionId) => {
        try {
          const response = await axios.get(`https://ideal-octo-meme.onrender.com/api/session/${sessionId}/attendance`);
          const attendanceData = response.data as any[];
          
          // Transform backend data to match our AttendanceRecord format
          const transformedRecords: AttendanceRecord[] = attendanceData.map((item: any) => ({
            id: item.id || uuidv4(), // Use backend ID if available, otherwise generate one
            sessionId,
            studentName: item.name,
            rollNumber: item.rollno,
            studentId: item.rollno, // Using rollno as studentId if not provided by API
            timestamp: item.timestamp || new Date().toISOString(),
            verified: true, // Assuming all records from backend are verified
          }));
          
          // Update store with records from the backend
          set((state) => {
            // Remove existing records for this session (to avoid duplicates)
            const otherRecords = state.attendanceRecords.filter(
              record => record.sessionId !== sessionId
            );
            
            return { 
              attendanceRecords: [...otherRecords, ...transformedRecords] 
            };
          });
          
          return transformedRecords;
        } catch (error) {
          console.error('Error fetching attendance records:', error);
          throw error;
        }
      },
      
      // Utility methods
      getSessionRecords: (sessionId) => {
        return get().attendanceRecords.filter(
          record => record.sessionId === sessionId
        );
      },
      
      getActiveSession: () => {
        const sessions = get().sessions;
        return sessions.find(session => session.isActive) || null;
      }
    }),
    {
      name: 'attendance-app-storage'
    }
  )
);