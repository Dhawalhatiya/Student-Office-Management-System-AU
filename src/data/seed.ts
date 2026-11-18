import type {
  AcademicYear,
  AuditLog,
  CourseResult,
  DatabaseState,
  Department,
  Document,
  DocumentReviewStatus,
  FeePayment,
  FeeReceipt,
  FeeRecord,
  Notification,
  Programme,
  ReportExportLog,
  RequestPriority,
  RequestStatus,
  Result,
  Scholarship,
  ScholarshipDocument,
  Semester,
  StaffAccount,
  Student,
  StudentRequest,
  StudentScholarship,
  UserAccount,
} from '../types/domain';
import { calculateGradeFromMarks, computeSGPA } from '../utils/calculations';
import { hashPassword } from '../utils/crypto';

export const DEMO_ACCOUNTS_DISPLAY = [
  {
    label: 'Aarav Mehta — Student (B.Tech CSE, Batch 2024)',
    email: 'student.demo@example.com',
    password: 'DemoStudent123!',
    portalHint: 'student' as const,
  },
  {
    label: 'Ritu Kapoor — Staff (Student Office)',
    email: 'staff.demo@example.com',
    password: 'DemoStaff123!',
    portalHint: 'staff' as const,
  },
  {
    label: 'Karan Malhotra — Staff (Finance)',
    email: 'finance.demo@example.com',
    password: 'DemoStaff123!',
    portalHint: 'staff' as const,
  },
  {
    label: 'Neha Iyer — Staff (Examination)',
    email: 'exam.demo@example.com',
    password: 'DemoStaff123!',
    portalHint: 'staff' as const,
  },
  {
    label: 'Anil Verma — Staff (Academic)',
    email: 'academic.demo@example.com',
    password: 'DemoStaff123!',
    portalHint: 'staff' as const,
  },
];

function makeCourse(
  code: string,
  title: string,
  credits: number,
  marks: number
): CourseResult {
  const { grade, gradePoint } = calculateGradeFromMarks(marks);
  return {
    courseCode: code,
    courseTitle: title,
    credits,
    marksObtained: marks,
    maxMarks: 100,
    grade,
    gradePoint,
  };
}

export function createSeedDatabase(): DatabaseState {
  const departments: Department[] = [
    { id: 'dept-cse', code: 'CSE', name: 'Computer Science & Engineering' },
    { id: 'dept-ece', code: 'ECE', name: 'Electronics & Communication Engineering' },
    { id: 'dept-som', code: 'SOM', name: 'School of Management' },
  ];

  const programmes: Programme[] = [
    {
      id: 'prog-btech-cse',
      code: 'CSE',
      name: 'B.Tech CSE',
      departmentId: 'dept-cse',
      durationSemesters: 8,
    },
    {
      id: 'prog-btech-ece',
      code: 'ECE',
      name: 'B.Tech ECE',
      departmentId: 'dept-ece',
      durationSemesters: 8,
    },
    {
      id: 'prog-bba',
      code: 'BBA',
      name: 'BBA',
      departmentId: 'dept-som',
      durationSemesters: 6,
    },
    {
      id: 'prog-mba',
      code: 'MBA',
      name: 'MBA',
      departmentId: 'dept-som',
      durationSemesters: 4,
    },
  ];

  const academicYears: AcademicYear[] = [
    { id: 'ay-2023-24', label: '2023-24', startYear: 2023, endYear: 2024, isCurrent: false },
    { id: 'ay-2024-25', label: '2024-25', startYear: 2024, endYear: 2025, isCurrent: false },
    { id: 'ay-2025-26', label: '2025-26', startYear: 2025, endYear: 2026, isCurrent: false },
    { id: 'ay-2026-27', label: '2026-27', startYear: 2026, endYear: 2027, isCurrent: true },
  ];

  const semesters: Semester[] = [
    { id: 'sem-1', number: 1, academicYearId: 'ay-2024-25', term: 'Odd' },
    { id: 'sem-2', number: 2, academicYearId: 'ay-2024-25', term: 'Even' },
    { id: 'sem-3', number: 3, academicYearId: 'ay-2025-26', term: 'Odd' },
    { id: 'sem-4', number: 4, academicYearId: 'ay-2025-26', term: 'Even' },
    { id: 'sem-5', number: 5, academicYearId: 'ay-2026-27', term: 'Odd' },
    { id: 'sem-6', number: 6, academicYearId: 'ay-2026-27', term: 'Even' },
    { id: 'sem-7', number: 7, academicYearId: 'ay-2026-27', term: 'Odd' },
    { id: 'sem-8', number: 8, academicYearId: 'ay-2026-27', term: 'Even' },
  ];

  const staffAccounts: StaffAccount[] = [
    {
      id: 'staff-1',
      fullName: 'Ritu Kapoor',
      email: 'staff.demo@example.com',
      designation: 'Senior Administrative Officer',
      staffGroup: 'STUDENT_OFFICE',
    },
    {
      id: 'staff-2',
      fullName: 'Karan Malhotra',
      email: 'finance.demo@example.com',
      designation: 'Accounts & Fee Officer',
      staffGroup: 'FINANCE',
    },
    {
      id: 'staff-3',
      fullName: 'Neha Iyer',
      email: 'exam.demo@example.com',
      designation: 'Controller of Examinations Representative',
      staffGroup: 'EXAMINATION',
    },
    {
      id: 'staff-4',
      fullName: 'Anil Verma',
      email: 'academic.demo@example.com',
      designation: 'Academic Coordinator',
      staffGroup: 'ACADEMIC',
    },
  ];

  const staffPasswordHash = hashPassword('DemoStaff123!');
  const studentDemoPasswordHash = hashPassword('DemoStudent123!');
  const genericStudentPasswordHash = hashPassword('DemoPeerStudent123!');

  // 37 fictional students across batches 2023-2026
  const fictionalRoster: Array<{
    name: string;
    progId: string;
    batch: number;
    city: string;
    status?: Student['enrollmentStatus'];
  }> = [
    // Student 1: Demo student Aarav Mehta
    { name: 'Aarav Mehta', progId: 'prog-btech-cse', batch: 2024, city: 'Pune, Maharashtra' },
    // Additional Batch 2024 CSE
    { name: 'Diya Deshmukh', progId: 'prog-btech-cse', batch: 2024, city: 'Indore, Madhya Pradesh' },
    { name: 'Rohan Kulkarni', progId: 'prog-btech-cse', batch: 2024, city: 'Nagpur, Maharashtra' },
    { name: 'Ishita Sharma', progId: 'prog-btech-cse', batch: 2024, city: 'Bhopal, Madhya Pradesh' },
    { name: 'Kabir Joshi', progId: 'prog-btech-cse', batch: 2024, city: 'Ujjain, Madhya Pradesh' },
    // Batch 2023 CSE (Sem 7)
    { name: 'Ananya Nair', progId: 'prog-btech-cse', batch: 2023, city: 'Kochi, Kerala' },
    { name: 'Siddharth Rao', progId: 'prog-btech-cse', batch: 2023, city: 'Hyderabad, Telangana' },
    { name: 'Meera Patel', progId: 'prog-btech-cse', batch: 2023, city: 'Ahmedabad, Gujarat' },
    { name: 'Vivaan Gupta', progId: 'prog-btech-cse', batch: 2023, city: 'Jaipur, Rajasthan' },
    { name: 'Nandini Bose', progId: 'prog-btech-cse', batch: 2023, city: 'Kolkata, West Bengal', status: 'ON_LEAVE' },
    // Batch 2025 CSE (Sem 3)
    { name: 'Arjun Tiwari', progId: 'prog-btech-cse', batch: 2025, city: 'Lucknow, Uttar Pradesh' },
    { name: 'Tanvi Agarwal', progId: 'prog-btech-cse', batch: 2025, city: 'Surat, Gujarat' },
    { name: 'Pranav Menon', progId: 'prog-btech-cse', batch: 2025, city: 'Chennai, Tamil Nadu' },
    // Batch 2026 CSE (Sem 1)
    { name: 'Kavya Reddy', progId: 'prog-btech-cse', batch: 2026, city: 'Vijayawada, Andhra Pradesh' },
    { name: 'Devansh Bansal', progId: 'prog-btech-cse', batch: 2026, city: 'Indore, Madhya Pradesh' },
    // ECE students across 2023-2026
    { name: 'Sanya Khanna', progId: 'prog-btech-ece', batch: 2023, city: 'Chandigarh' },
    { name: 'Harshvardhan Singh', progId: 'prog-btech-ece', batch: 2023, city: 'Udaipur, Rajasthan' },
    { name: 'Riya Chatterjee', progId: 'prog-btech-ece', batch: 2024, city: 'Kolkata, West Bengal' },
    { name: 'Aditya Mishra', progId: 'prog-btech-ece', batch: 2024, city: 'Varanasi, Uttar Pradesh' },
    { name: 'Pooja Hegde', progId: 'prog-btech-ece', batch: 2024, city: 'Bengaluru, Karnataka' },
    { name: 'Nikhil Bhat', progId: 'prog-btech-ece', batch: 2025, city: 'Mysuru, Karnataka' },
    { name: 'Shreya Kulkarni', progId: 'prog-btech-ece', batch: 2025, city: 'Pune, Maharashtra' },
    { name: 'Yashwant Choudhary', progId: 'prog-btech-ece', batch: 2026, city: 'Jodhpur, Rajasthan' },
    { name: 'Aditi Saxena', progId: 'prog-btech-ece', batch: 2026, city: 'Gwalior, Madhya Pradesh' },
    // BBA students across 2024-2026
    { name: 'Kunal Oberoi', progId: 'prog-bba', batch: 2024, city: 'New Delhi' },
    { name: 'Aishwarya Bhosale', progId: 'prog-bba', batch: 2024, city: 'Nashik, Maharashtra' },
    { name: 'Raghavendra Jain', progId: 'prog-bba', batch: 2024, city: 'Indore, Madhya Pradesh' },
    { name: 'Simran Kaur', progId: 'prog-bba', batch: 2025, city: 'Amritsar, Punjab' },
    { name: 'Tushar Gokhale', progId: 'prog-bba', batch: 2025, city: 'Pune, Maharashtra' },
    { name: 'Zoya Siddiqui', progId: 'prog-bba', batch: 2025, city: 'Bhopal, Madhya Pradesh' },
    { name: 'Mahek Shah', progId: 'prog-bba', batch: 2026, city: 'Vadodara, Gujarat' },
    { name: 'Omkar Pawar', progId: 'prog-bba', batch: 2026, city: 'Kolhapur, Maharashtra' },
    // MBA students across 2025-2026
    { name: 'Gaurav Malhotra', progId: 'prog-mba', batch: 2025, city: 'Gurugram, Haryana' },
    { name: 'Sneha Krishnan', progId: 'prog-mba', batch: 2025, city: 'Coimbatore, Tamil Nadu' },
    { name: 'Varun Nambiar', progId: 'prog-mba', batch: 2025, city: 'Thiruvananthapuram, Kerala' },
    { name: 'Palak Sethi', progId: 'prog-mba', batch: 2026, city: 'Noida, Uttar Pradesh' },
    { name: 'Hrithik Dubey', progId: 'prog-mba', batch: 2026, city: 'Jabalpur, Madhya Pradesh' },
  ];

  const seqCounters: Record<string, number> = {};
  const students: Student[] = [];
  const userAccounts: UserAccount[] = [];

  staffAccounts.forEach((s, idx) => {
    userAccounts.push({
      id: `user-staff-${idx + 1}`,
      email: s.email,
      passwordHash: staffPasswordHash,
      role: 'STAFF',
      staffId: s.id,
    });
  });

  fictionalRoster.forEach((entry, index) => {
    const prog = programmes.find((p) => p.id === entry.progId)!;
    const yy = String(entry.batch).slice(-2);
    const key = `${yy}-${prog.code}`;
    seqCounters[key] = (seqCounters[key] ?? 0) + 1;
    const nnn = String(seqCounters[key]).padStart(3, '0');
    const enrollmentNumber = `AVU-DEMO-${yy}-${prog.code}-${nnn}`;
    const currentSemester = (2026 - entry.batch) * 2 + 1;

    const studentId = `stu-${index + 1}`;
    const isDemo = index === 0;
    const slug = entry.name.toLowerCase().replace(/[^a-z]+/g, '.');
    const email = isDemo ? 'student.demo@example.com' : `${slug}@demo-student.avu.edu.example`;

    const dobYear = entry.batch - 18 - (prog.code === 'MBA' ? 4 : 0);
    const dobMonth = String(((index * 3) % 12) + 1).padStart(2, '0');
    const dobDay = String(((index * 5) % 25) + 2).padStart(2, '0');

    students.push({
      id: studentId,
      enrollmentNumber,
      fullName: entry.name,
      dateOfBirth: isDemo ? '2006-04-18' : `${dobYear}-${dobMonth}-${dobDay}`,
      email,
      phone: isDemo ? '+91 98260 41209' : `+91 9826${String(100000 + index * 731).slice(0, 6)}`,
      departmentId: prog.departmentId,
      programmeId: prog.id,
      batchYear: entry.batch,
      currentSemester,
      currentAcademicYearId: 'ay-2026-27',
      enrollmentStatus: entry.status ?? 'ACTIVE',
      address: isDemo
        ? '42, Prabhat Colony, Kothrud, Pune, Maharashtra 411038'
        : `${12 + index}, University Link Road, ${entry.city}`,
    });

    userAccounts.push({
      id: `user-stu-${index + 1}`,
      email,
      passwordHash: isDemo ? studentDemoPasswordHash : genericStudentPasswordHash,
      role: 'STUDENT',
      studentId,
    });
  });

  // Fee Records, Payments, Receipts
  // ~half paid (18 students), ~quarter partial (10 students, incl Aarav), ~quarter unpaid (9 students)
  const feeRecords: FeeRecord[] = [];
  const feePayments: FeePayment[] = [];
  const feeReceipts: FeeReceipt[] = [];

  const progTuition: Record<string, number> = {
    'prog-btech-cse': 145000,
    'prog-btech-ece': 140000,
    'prog-bba': 95000,
    'prog-mba': 185000,
  };

  students.forEach((stu, idx) => {
    const total = progTuition[stu.programmeId] ?? 145000;
    const feeId = `fee-${stu.id}-2627`;
    feeRecords.push({
      id: feeId,
      studentId: stu.id,
      academicYearId: 'ay-2026-27',
      totalAmountInr: total,
      dueDate: '2026-11-30',
    });

    if (idx === 0) {
      // Aarav Mehta: ₹72,500 verified paid (PARTIAL) + 1 PENDING payment ₹35,000 (not counted)
      const p1Id = 'pay-demo-1';
      feePayments.push({
        id: p1Id,
        feeRecordId: feeId,
        studentId: stu.id,
        amountInr: 72500,
        paidAt: '2026-07-18',
        mode: 'NEFT',
        referenceNumber: 'NEFT-AVU-260718-001',
        status: 'VERIFIED',
      });
      feeReceipts.push({
        id: 'rec-demo-1',
        paymentId: p1Id,
        studentId: stu.id,
        receiptNumber: 'AVU-RCPT-2026-0101',
        issuedAt: '2026-07-19',
        amountInr: 72500,
      });
      feePayments.push({
        id: 'pay-demo-2',
        feeRecordId: feeId,
        studentId: stu.id,
        amountInr: 35000,
        paidAt: '2026-11-12',
        mode: 'UPI',
        referenceNumber: 'UPI-AVU-261112-884',
        status: 'PENDING',
      });
      return;
    }

    // Distribution for remaining 36 students: 18 Paid, 9 Partial, 9 Unpaid
    if (idx <= 18) {
      const pId = `pay-${stu.id}-1`;
      feePayments.push({
        id: pId,
        feeRecordId: feeId,
        studentId: stu.id,
        amountInr: total,
        paidAt: '2026-07-22',
        mode: idx % 2 === 0 ? 'NEFT' : 'Card',
        referenceNumber: `TXN-2026-${1000 + idx}`,
        status: 'VERIFIED',
      });
      feeReceipts.push({
        id: `rec-${stu.id}-1`,
        paymentId: pId,
        studentId: stu.id,
        receiptNumber: `AVU-RCPT-2026-${String(102 + idx).padStart(4, '0')}`,
        issuedAt: '2026-07-23',
        amountInr: total,
      });
    } else if (idx <= 27) {
      const half = Math.round(total / 2);
      const pId = `pay-${stu.id}-1`;
      feePayments.push({
        id: pId,
        feeRecordId: feeId,
        studentId: stu.id,
        amountInr: half,
        paidAt: '2026-08-04',
        mode: 'UPI',
        referenceNumber: `UPI-2026-${2000 + idx}`,
        status: 'VERIFIED',
      });
      feeReceipts.push({
        id: `rec-${stu.id}-1`,
        paymentId: pId,
        studentId: stu.id,
        receiptNumber: `AVU-RCPT-2026-${String(202 + idx).padStart(4, '0')}`,
        issuedAt: '2026-08-05',
        amountInr: half,
      });
      if (idx % 3 === 0) {
        feePayments.push({
          id: `pay-${stu.id}-pending`,
          feeRecordId: feeId,
          studentId: stu.id,
          amountInr: total - half,
          paidAt: '2026-11-14',
          mode: 'Demand Draft',
          referenceNumber: `DD-2026-${3000 + idx}`,
          status: 'PENDING',
        });
      }
    } else {
      // Unpaid (28..36), a couple have pending payments awaiting verification
      if (idx % 2 === 0) {
        feePayments.push({
          id: `pay-${stu.id}-pending`,
          feeRecordId: feeId,
          studentId: stu.id,
          amountInr: 40000,
          paidAt: '2026-11-15',
          mode: 'NEFT',
          referenceNumber: `NEFT-PEND-${4000 + idx}`,
          status: 'PENDING',
        });
      }
    }
  });

  // Results for completed semesters with 5 courses each
  const results: Result[] = [];
  const sampleCourseCatalog: Record<number, Array<[string, string, number]>> = {
    1: [
      ['CS101', 'Programming Fundamentals', 4],
      ['MA101', 'Engineering Mathematics I', 4],
      ['PH101', 'Applied Physics', 4],
      ['HU101', 'Academic Communication', 3],
      ['ME102', 'Engineering Design Studio', 3],
    ],
    2: [
      ['CS102', 'Data Structures', 4],
      ['MA102', 'Linear Algebra & Calculus', 4],
      ['EC102', 'Digital Logic Systems', 4],
      ['HU102', 'Design Thinking Seminar', 3],
      ['CS104', 'Discrete Mathematics', 3],
    ],
    3: [
      ['CS201', 'Algorithms & Complexity', 4],
      ['CS202', 'Computer Architecture', 4],
      ['CS203', 'Database Management Systems', 4],
      ['MA201', 'Probability & Statistics', 3],
      ['HU201', 'Professional Ethics', 3],
    ],
    4: [
      ['CS204', 'Operating Systems', 4],
      ['CS205', 'Computer Networks', 4],
      ['CS206', 'Software Engineering', 4],
      ['CS207', 'Theory of Computation', 3],
      ['OE201', 'Economics for Engineers', 3],
    ],
    5: [
      ['CS301', 'Machine Learning Foundations', 4],
      ['CS302', 'Distributed Systems', 4],
      ['CS303', 'Compiler Design', 4],
      ['CS304', 'Web & Cloud Architecture', 3],
      ['OE301', 'Technology Law & Policy', 3],
    ],
    6: [
      ['CS305', 'Information Security', 4],
      ['CS306', 'Human-Computer Interaction', 4],
      ['CS307', 'Data Engineering', 4],
      ['CS308', 'Applied AI Systems', 3],
      ['PR301', 'Minor Project Seminar', 3],
    ],
  };

  // Aarav Mehta exact results:
  // Sem 1: 140/18 = 7.78 ([8, 8, 7, 9, 7])
  // Sem 2: 141/18 = 7.83 ([8, 8, 8, 8, 7])
  // Sem 3: 144/18 = 8.00 ([8, 8, 8, 8, 8])
  // Sem 4: 141/18 = 7.83 ([9, 8, 7, 7, 8]) -> Overall CGPA = 566/72 = 7.86!
  // Sem 5: DRAFT (hidden from student!)
  const aaravMarksBySem: Record<number, number[]> = {
    1: [74, 76, 65, 83, 64],
    2: [75, 72, 78, 74, 67],
    3: [77, 75, 73, 76, 72],
    4: [84, 75, 66, 63, 74],
    5: [86, 78, 75, 82, 74],
  };

  const ayForSem = (batch: number, sem: number): string => {
    const offset = Math.floor((sem - 1) / 2);
    const start = batch + offset;
    return `ay-${start}-${String(start + 1).slice(-2)}`;
  };

  students.forEach((stu, stuIdx) => {
    const completed = stu.currentSemester - 1;
    if (stuIdx === 0) {
      for (let s = 1; s <= 4; s++) {
        const defs = sampleCourseCatalog[s];
        const marks = aaravMarksBySem[s];
        const courses = defs.map(([code, title, cr], i) =>
          makeCourse(code, title, cr, marks[i])
        );
        results.push({
          id: `res-${stu.id}-sem-${s}`,
          studentId: stu.id,
          semesterNumber: s,
          academicYearId: ayForSem(stu.batchYear, s),
          status: 'PUBLISHED',
          courses,
          sgpa: computeSGPA(courses),
          publishedAt: `202${4 + Math.floor(s / 2)}-${s % 2 === 1 ? '12-20' : '06-15'}`,
        });
      }
      // Hidden Semester 5 DRAFT result
      const sem5Courses = sampleCourseCatalog[5].map(([code, title, cr], i) =>
        makeCourse(code, title, cr, aaravMarksBySem[5][i])
      );
      results.push({
        id: `res-${stu.id}-sem-5`,
        studentId: stu.id,
        semesterNumber: 5,
        academicYearId: 'ay-2026-27',
        status: 'DRAFT',
        courses: sem5Courses,
        sgpa: computeSGPA(sem5Courses),
      });
      return;
    }

    for (let s = 1; s <= completed; s++) {
      const defs = sampleCourseCatalog[((s - 1) % 6) + 1];
      const base = 62 + ((stuIdx * 7 + s * 5) % 28);
      const courses = defs.map(([code, title, cr], i) =>
        makeCourse(code, title, cr, Math.min(96, base + ((i * 4) % 15)))
      );
      results.push({
        id: `res-${stu.id}-sem-${s}`,
        studentId: stu.id,
        semesterNumber: s,
        academicYearId: ayForSem(stu.batchYear, s),
        status: 'PUBLISHED',
        courses,
        sgpa: computeSGPA(courses),
        publishedAt: '2026-06-18',
      });
    }

    // Add a few non-published current semester results for staff workflow realism
    if (stuIdx % 5 === 1) {
      const defs = sampleCourseCatalog[1];
      const courses = defs.map(([code, title, cr], i) =>
        makeCourse(code, title, cr, 70 + i * 3)
      );
      results.push({
        id: `res-${stu.id}-sem-${stu.currentSemester}`,
        studentId: stu.id,
        semesterNumber: stu.currentSemester,
        academicYearId: 'ay-2026-27',
        status: stuIdx % 10 === 1 ? 'UNDER_REVIEW' : 'APPROVED',
        courses,
        sgpa: computeSGPA(courses),
      });
    }
  });

  // 13 Requests across priorities & statuses, with conversation threads incl staff-only internal note
  const requests: StudentRequest[] = [
    // Aarav Mehta's 3 requests (1 Submitted, 1 Waiting for Student, 1 Resolved)
    {
      id: 'req-1',
      ticketNumber: 'REQ-2026-0001',
      studentId: 'stu-1',
      subject: 'Bonafide student certificate for internship onboarding',
      category: 'Certificate / Letter',
      priority: 'MEDIUM',
      status: 'SUBMITTED',
      assignedStaffId: 'staff-1',
      createdAt: '2026-11-15T10:15:00Z',
      updatedAt: '2026-11-15T10:15:00Z',
      messages: [
        {
          id: 'msg-1-1',
          requestId: 'req-1',
          senderName: 'Aarav Mehta',
          senderRole: 'STUDENT',
          isInternal: false,
          body: 'Requesting an official bonafide certificate addressed to my summer internship host organisation.',
          sentAt: '2026-11-15T10:15:00Z',
        },
      ],
    },
    {
      id: 'req-2',
      ticketNumber: 'REQ-2026-0002',
      studentId: 'stu-1',
      subject: 'Pending NEFT fee transaction reconciliation',
      category: 'Fee Clarification',
      priority: 'HIGH',
      status: 'WAITING_FOR_STUDENT',
      assignedStaffId: 'staff-2',
      createdAt: '2026-11-12T09:30:00Z',
      updatedAt: '2026-11-14T14:20:00Z',
      messages: [
        {
          id: 'msg-2-1',
          requestId: 'req-2',
          senderName: 'Aarav Mehta',
          senderRole: 'STUDENT',
          isInternal: false,
          body: 'I transferred ₹35,000 via UPI/NEFT on 12 Nov 2026. Please verify the status.',
          sentAt: '2026-11-12T09:30:00Z',
        },
        {
          id: 'msg-2-2',
          requestId: 'req-2',
          senderName: 'Karan Malhotra',
          senderRole: 'STAFF',
          isInternal: true,
          body: 'Internal note: Bank statement shows partial UTR truncation; request clearer receipt image.',
          sentAt: '2026-11-13T11:05:00Z',
        },
        {
          id: 'msg-2-3',
          requestId: 'req-2',
          senderName: 'Karan Malhotra',
          senderRole: 'STAFF',
          isInternal: false,
          body: 'Please upload a clearer bank proof showing the full 12-digit UTR number so Finance can verify the transfer.',
          sentAt: '2026-11-14T14:20:00Z',
        },
      ],
    },
    {
      id: 'req-3',
      ticketNumber: 'REQ-2026-0003',
      studentId: 'stu-1',
      subject: 'Enrollment verification letter',
      category: 'Certificate / Letter',
      priority: 'LOW',
      status: 'RESOLVED',
      assignedStaffId: 'staff-1',
      createdAt: '2026-10-18T11:00:00Z',
      updatedAt: '2026-10-21T16:40:00Z',
      messages: [
        {
          id: 'msg-3-1',
          requestId: 'req-3',
          senderName: 'Aarav Mehta',
          senderRole: 'STUDENT',
          isInternal: false,
          body: 'Need an enrollment verification letter for my education loan renewal.',
          sentAt: '2026-10-18T11:00:00Z',
        },
        {
          id: 'msg-3-2',
          requestId: 'req-3',
          senderName: 'Ritu Kapoor',
          senderRole: 'STAFF',
          isInternal: false,
          body: 'Your signed enrollment verification letter is ready for download from the office counter.',
          sentAt: '2026-10-21T16:40:00Z',
        },
      ],
    },
  ];

  const additionalRequestTemplates: Array<{
    stuIdx: number;
    subject: string;
    cat: StudentRequest['category'];
    priority: RequestPriority;
    status: RequestStatus;
    assignee?: string;
    date: string;
  }> = [
    { stuIdx: 1, subject: 'Transcript copy for exchange semester application', cat: 'Examination & Results', priority: 'URGENT', status: 'UNDER_REVIEW', assignee: 'staff-3', date: '2026-11-16T09:10:00Z' },
    { stuIdx: 2, subject: 'Spelling update on parent contact record', cat: 'Profile Correction', priority: 'LOW', status: 'SUBMITTED', date: '2026-11-16T11:45:00Z' },
    { stuIdx: 5, subject: 'Final year scholarship renewal disbursement check', cat: 'Scholarship Query', priority: 'HIGH', status: 'UNDER_REVIEW', assignee: 'staff-1', date: '2026-11-15T15:30:00Z' },
    { stuIdx: 6, subject: 'Semester 6 grade card verification stamp', cat: 'Examination & Results', priority: 'MEDIUM', status: 'WAITING_FOR_STUDENT', assignee: 'staff-3', date: '2026-11-14T10:00:00Z' },
    { stuIdx: 9, subject: 'Medical leave continuation documentation', cat: 'General Administration', priority: 'URGENT', status: 'UNDER_REVIEW', assignee: 'staff-1', date: '2026-11-14T08:50:00Z' },
    { stuIdx: 15, subject: 'Hostel & tuition fee split receipt request', cat: 'Fee Clarification', priority: 'MEDIUM', status: 'SUBMITTED', assignee: 'staff-2', date: '2026-11-13T16:20:00Z' },
    { stuIdx: 18, subject: 'Duplicate university ID card issuance', cat: 'General Administration', priority: 'MEDIUM', status: 'RESOLVED', assignee: 'staff-1', date: '2026-11-10T12:15:00Z' },
    { stuIdx: 24, subject: 'Address update for couriered marksheet', cat: 'Profile Correction', priority: 'LOW', status: 'CLOSED', assignee: 'staff-1', date: '2026-11-05T09:40:00Z' },
    { stuIdx: 29, subject: 'Installment due date extension inquiry', cat: 'Fee Clarification', priority: 'HIGH', status: 'SUBMITTED', date: '2026-11-16T14:05:00Z' },
    { stuIdx: 32, subject: 'Merit scholarship eligibility review', cat: 'Scholarship Query', priority: 'MEDIUM', status: 'CLOSED', assignee: 'staff-4', date: '2026-10-29T13:10:00Z' },
  ];

  additionalRequestTemplates.forEach((tpl, i) => {
    const stu = students[tpl.stuIdx];
    const id = `req-${i + 4}`;
    requests.push({
      id,
      ticketNumber: `REQ-2026-${String(i + 4).padStart(4, '0')}`,
      studentId: stu.id,
      subject: tpl.subject,
      category: tpl.cat,
      priority: tpl.priority,
      status: tpl.status,
      assignedStaffId: tpl.assignee,
      createdAt: tpl.date,
      updatedAt: tpl.date,
      messages: [
        {
          id: `msg-${id}-1`,
          requestId: id,
          senderName: stu.fullName,
          senderRole: 'STUDENT',
          isInternal: false,
          body: `Submitted request regarding: ${tpl.subject}.`,
          sentAt: tpl.date,
        },
      ],
    });
  });

  // Documents in all review statuses
  const documents: Document[] = [
    // Aarav Mehta documents, including 1 Rejected ("Bank proof - image is unclear")
    {
      id: 'doc-1',
      studentId: 'stu-1',
      title: 'Bank proof',
      category: 'Bank & Fee Proof',
      fileName: 'aarav_neft_receipt_nov2026.jpg',
      uploadedAt: '2026-11-12',
      status: 'REJECTED',
      reviewerNote: 'Bank proof - image is unclear',
    },
    {
      id: 'doc-2',
      studentId: 'stu-1',
      title: 'Aadhaar identity verification',
      category: 'Identity Proof',
      fileName: 'aarav_id_verified.pdf',
      uploadedAt: '2024-07-14',
      status: 'VERIFIED',
    },
    {
      id: 'doc-3',
      studentId: 'stu-1',
      title: 'Class XII marksheet',
      category: 'Admission Record',
      fileName: 'aarav_12th_marksheet.pdf',
      uploadedAt: '2024-07-14',
      status: 'VERIFIED',
    },
  ];

  const docStatuses: DocumentReviewStatus[] = [
    'UPLOADED',
    'UNDER_REVIEW',
    'VERIFIED',
    'REJECTED',
    'REPLACEMENT_REQUIRED',
  ];
  docStatuses.forEach((st, idx) => {
    const stu = students[idx + 1];
    documents.push({
      id: `doc-peer-${idx + 1}`,
      studentId: stu.id,
      title:
        st === 'REPLACEMENT_REQUIRED'
          ? 'Income certificate renewal'
          : st === 'UPLOADED'
            ? 'Transfer certificate'
            : st === 'UNDER_REVIEW'
              ? 'Migration certificate'
              : 'Fee transfer receipt',
      category: 'Admission Record',
      fileName: `doc_${stu.enrollmentNumber.toLowerCase()}.pdf`,
      uploadedAt: '2026-11-11',
      status: st,
      reviewerNote:
        st === 'REPLACEMENT_REQUIRED'
          ? 'Document expired; please upload current year certificate.'
          : st === 'REJECTED'
            ? 'Scan is cropped at the bottom signature.'
            : undefined,
    });
  });

  // 3 Scholarships with configurable required-document lists
  const scholarships: Scholarship[] = [
    {
      id: 'sch-1',
      name: 'Avantika Merit Excellence Scholarship',
      academicYearId: 'ay-2026-27',
      awardAmountInr: 45000,
      summary: 'Merit-based tuition waiver for undergraduate students maintaining CGPA 7.50 or above.',
      requirements: [
        {
          id: 'req-sch-1a',
          documentName: 'Previous Academic Year Consolidated Grade Sheet',
          description: 'Official published semester grade record.',
          mandatory: true,
        },
        {
          id: 'req-sch-1b',
          documentName: 'Department Recommendation Letter',
          description: 'Endorsement from faculty mentor or programme chair.',
          mandatory: true,
        },
      ],
    },
    {
      id: 'sch-2',
      name: 'Means-Cum-Merit Financial Assistance Grant',
      academicYearId: 'ay-2026-27',
      awardAmountInr: 60000,
      summary: 'Need-based financial grant supporting annual tuition fees.',
      requirements: [
        {
          id: 'req-sch-2a',
          documentName: 'Annual Family Income Certificate',
          description: 'Issued by competent revenue authority for FY 2025-26.',
          mandatory: true,
        },
        {
          id: 'req-sch-2b',
          documentName: 'Bank Account Passbook Copy',
          description: 'First page showing account holder name and IFSC.',
          mandatory: true,
        },
        {
          id: 'req-sch-2c',
          documentName: 'Statement of Purpose',
          description: 'Brief note on academic goals (optional).',
          mandatory: false,
        },
      ],
    },
    {
      id: 'sch-3',
      name: 'Women in Engineering & Management Fellowship',
      academicYearId: 'ay-2026-27',
      awardAmountInr: 35000,
      summary: 'Encouraging leadership and research participation across engineering and management programmes.',
      requirements: [
        {
          id: 'req-sch-3a',
          documentName: 'Research / Project Portfolio Summary',
          description: 'One-page summary of coursework or studio projects.',
          mandatory: true,
        },
        {
          id: 'req-sch-3b',
          documentName: 'Enrollment Verification Record',
          description: 'Current academic year active enrollment confirmation.',
          mandatory: true,
        },
      ],
    },
  ];

  const studentScholarships: StudentScholarship[] = [
    {
      id: 'stusch-1',
      studentId: 'stu-1',
      scholarshipId: 'sch-1',
      status: 'PENDING',
      appliedAt: '2026-10-10',
    },
    {
      id: 'stusch-2',
      studentId: 'stu-6',
      scholarshipId: 'sch-2',
      status: 'PENDING',
      appliedAt: '2026-10-14',
    },
    {
      id: 'stusch-3',
      studentId: 'stu-16',
      scholarshipId: 'sch-3',
      status: 'APPROVED',
      appliedAt: '2026-09-25',
    },
  ];

  const scholarshipDocuments: ScholarshipDocument[] = [
    {
      id: 'schdoc-1',
      studentScholarshipId: 'stusch-1',
      studentId: 'stu-1',
      requirementId: 'req-sch-1a',
      fileName: 'aarav_grade_sheet_sem4.pdf',
      uploadedAt: '2026-10-10',
      status: 'VERIFIED',
    },
    {
      id: 'schdoc-2',
      studentScholarshipId: 'stusch-1',
      studentId: 'stu-1',
      requirementId: 'req-sch-1b',
      fileName: 'aarav_faculty_endorsement.pdf',
      uploadedAt: '2026-11-10',
      status: 'UNDER_REVIEW',
    },
    {
      id: 'schdoc-3',
      studentScholarshipId: 'stusch-2',
      studentId: 'stu-6',
      requirementId: 'req-sch-2a',
      fileName: 'ananya_income_cert.pdf',
      uploadedAt: '2026-11-13',
      status: 'UPLOADED',
    },
    {
      id: 'schdoc-4',
      studentScholarshipId: 'stusch-2',
      studentId: 'stu-6',
      requirementId: 'req-sch-2b',
      fileName: 'ananya_bank_passbook.pdf',
      uploadedAt: '2026-11-13',
      status: 'UNDER_REVIEW',
    },
  ];

  // Notifications: Aarav Mehta has 4 unread notifications
  const notifications: Notification[] = [
    {
      id: 'notif-1',
      userAccountId: 'user-stu-1',
      title: 'Document requires attention: Bank proof',
      body: 'Your uploaded bank proof was marked Rejected ("Bank proof - image is unclear"). Please review your document checklist.',
      category: 'Documents',
      createdAt: '2026-11-15T15:30:00Z',
      isRead: false,
      linkPath: '/student/documents',
    },
    {
      id: 'notif-2',
      userAccountId: 'user-stu-1',
      title: 'Response on request REQ-2026-0002',
      body: 'Finance Office requested a clearer bank transfer receipt with the full 12-digit UTR reference.',
      category: 'Requests',
      createdAt: '2026-11-14T14:22:00Z',
      isRead: false,
      linkPath: '/student/requests',
    },
    {
      id: 'notif-3',
      userAccountId: 'user-stu-1',
      title: 'Academic Year 2026-27 fee balance reminder',
      body: 'Remaining balance of ₹72,500 is due by 30 Nov 2026. Pending payments are reflected once verified.',
      category: 'Fees',
      createdAt: '2026-11-10T09:00:00Z',
      isRead: false,
      linkPath: '/student/fees',
    },
    {
      id: 'notif-4',
      userAccountId: 'user-stu-1',
      title: 'Semester 4 results published',
      body: 'Your official Semester 4 examination results (SGPA 7.83) have been published to your academic record.',
      category: 'Results',
      createdAt: '2026-06-15T12:00:00Z',
      isRead: false,
      linkPath: '/student/results',
    },
    {
      id: 'notif-5',
      userAccountId: 'user-stu-1',
      title: 'Enrollment verification letter resolved',
      body: 'Request REQ-2026-0003 has been marked Resolved by Student Office.',
      category: 'Requests',
      createdAt: '2026-10-21T16:42:00Z',
      isRead: true,
      linkPath: '/student/requests',
    },
    // Staff notifications
    {
      id: 'notif-staff-1',
      userAccountId: 'user-staff-1',
      title: '2 urgent administrative requests open',
      body: 'Requests REQ-2026-0004 and REQ-2026-0008 require Student Office review.',
      category: 'Requests',
      createdAt: '2026-11-16T09:15:00Z',
      isRead: false,
      linkPath: '/staff/requests',
    },
    {
      id: 'notif-staff-2',
      userAccountId: 'user-staff-1',
      title: '3 documents awaiting review',
      body: 'New student admission and scholarship documents were uploaded this week.',
      category: 'Documents',
      createdAt: '2026-11-15T11:20:00Z',
      isRead: false,
      linkPath: '/staff/documents',
    },
    {
      id: 'notif-staff-3',
      userAccountId: 'user-staff-2',
      title: 'Pending fee transfers awaiting reconciliation',
      body: '7 student fee transfers are currently in Pending status awaiting bank verification.',
      category: 'Fees',
      createdAt: '2026-11-15T16:00:00Z',
      isRead: false,
      linkPath: '/staff/fees',
    },
    {
      id: 'notif-staff-4',
      userAccountId: 'user-staff-3',
      title: 'Semester 5 results in draft',
      body: 'B.Tech CSE Semester 5 draft result batch is awaiting Examination moderation.',
      category: 'Results',
      createdAt: '2026-11-14T10:30:00Z',
      isRead: false,
      linkPath: '/staff/results',
    },
    {
      id: 'notif-staff-5',
      userAccountId: 'user-staff-4',
      title: 'Scholarship review cycle open',
      body: 'Academic Year 2026-27 merit scholarship submissions are ready for committee review.',
      category: 'General',
      createdAt: '2026-11-12T10:00:00Z',
      isRead: false,
      linkPath: '/staff/scholarships',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'audit-1',
      timestamp: '2026-11-16T09:05:00Z',
      actorAccountId: 'user-staff-1',
      actorEmail: 'staff.demo@example.com',
      actorRole: 'STAFF',
      action: 'LOGIN_SUCCESS',
      detail: 'Signed in as Ritu Kapoor (Student Office).',
    },
    {
      id: 'audit-2',
      timestamp: '2026-11-15T16:12:00Z',
      actorAccountId: 'user-staff-2',
      actorEmail: 'finance.demo@example.com',
      actorRole: 'STAFF',
      action: 'LOGIN_SUCCESS',
      detail: 'Signed in as Karan Malhotra (Finance).',
    },
    {
      id: 'audit-3',
      timestamp: '2026-11-15T11:45:00Z',
      actorAccountId: 'user-stu-1',
      actorEmail: 'student.demo@example.com',
      actorRole: 'STUDENT',
      action: 'LOGIN_SUCCESS',
      detail: 'Signed in as Aarav Mehta (AVU-DEMO-24-CSE-001).',
    },
  ];

  const reportExportLogs: ReportExportLog[] = [
    {
      id: 'rep-1',
      exportedByStaffId: 'staff-1',
      reportType: 'Enrollment Roster 2026-27',
      createdAt: '2026-11-10T15:00:00Z',
      rowCount: 37,
    },
  ];

  return {
    departments,
    programmes,
    academicYears,
    semesters,
    students,
    staffAccounts,
    userAccounts,
    feeRecords,
    feePayments,
    feeReceipts,
    results,
    requests,
    documents,
    scholarships,
    studentScholarships,
    scholarshipDocuments,
    notifications,
    auditLogs,
    reportExportLogs,
    loginAttempts: {},
  };
}
