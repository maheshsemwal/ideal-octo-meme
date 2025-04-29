import express, { Request, Response } from 'express';
import cors from 'cors';
import ExcelJS from 'exceljs';
import { supabase } from './supabaseClient';
import path from 'path';
const app = express();

app.use(cors());
app.use(express.json());

interface StartSessionBody {
    subject: string;
    section: string;
    course: string;
}

interface MarkAttendanceBody {
    name: string;
    rollNo: string;
    otp: string;
    sessionId: string;
}



// 1. Start Attendance Session
// Start Attendance Session
app.post('/api/start-session', async (req: any, res: any) => {
    const { subject, section, course } = req.body;
    console.log("Starting session with data:", req.body);

    const { data, error } = await supabase.from('session').insert([
        { subject, section, course },
    ]).select().single();
    console.log("Session data:", data);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ sessionId: data.id });
});

app.post('/api/generate-otp', async (req: any, res: any) => {
    const { sessionId } = req.body;
    console.log("Generating OTP for session ID:", sessionId);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpgeneratedat = new Date();

    const { data, error } = await supabase
        .from('session')
        .update({ otp, otpgeneratedat })
        .eq('id', sessionId)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ otp });
}
);


// 2. Mark Attendance
// Mark Attendance
app.post('/api/mark-attendance', async (req: any, res: any) => {
    const { name, rollNo, otp, sessionId } = req.body;

    const { data: session, error: sessionError } = await supabase
        .from('session')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (sessionError) return res.status(404).json({ message: "Session not found" });
    if (session.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    const otpAge = Math.abs((new Date().getTime() - new Date(session.otpgeneratedat).getTime()))/1000.0; // in seconds
    console.log('OTP Age in seconds:', otpAge);
    if (otpAge > 500) {  
        return res.status(400).json({ message: "OTP expired" });
    }




    const { data: alreadyMarked } = await supabase
        .from('attendance')
        .select('*')
        .eq('name', name)
        .eq('rollno', rollNo)
        .eq('sessionid', sessionId)
        .maybeSingle();

    if (alreadyMarked) return res.status(409).json({ message: "Already marked" });

    const { error } = await supabase.from('attendance').insert([
        { name, rollno: rollNo, sessionid: sessionId },
    ]);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Attendance marked!" });
});


// 3. Get Attendance List

app.get('/api/session/:id/attendance', async (req: any, res: any) => {
    const { id } = req.params;

    const { data: attendanceList, error } = await supabase
        .from('attendance')
        .select('name, rollno, timestamp')
        .eq('sessionid', id);

    if (error) return res.status(500).json({ message: 'Error fetching attendance', error });

    res.json(attendanceList);
});


// 4. Download Attendance as Excel
app.get('/api/session/:id/attendance/download', async (req: any, res: any) => {
    const { id } = req.params;

    const { data: session, error: sessionError } = await supabase
        .from('session')
        .select('*')
        .eq('id', id)
        .single();

    if (sessionError || !session) return res.status(404).json({ message: 'Session not found' });

    const { data: attendanceList, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('sessionid', id);

    if (attendanceError) return res.status(500).json({ message: 'Error fetching attendance' });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');

    sheet.addRow(['Subject', session.subject]);
    sheet.addRow(['Section', session.section]);
    sheet.addRow(['Course', session.course]);
    sheet.addRow([]);
    sheet.addRow(['Name', 'Roll No', 'Timestamp']);

    attendanceList.forEach(entry => {
        // Convert roll number to a number if possible
        const rollNoAsNumber = parseInt(entry.rollno, 10);
        const rollNoValue = isNaN(rollNoAsNumber) ? entry.rollno : rollNoAsNumber;
        
        sheet.addRow([entry.name, rollNoValue, entry.timestamp]);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${id}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
});

const __dirname1 = path.resolve();
app.use(express.static(path.join(__dirname1, '../frontend/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname1, '../frontend','dist', 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
