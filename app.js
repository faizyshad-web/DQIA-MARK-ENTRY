/**
 * ==========================================================================
 * EDUMARK - CORE APPLICATION LOGIC
 * Features: SPA Router, Dual-Mode Storage (Mock/Firebase), Seeding,
 * Real-Time Calculations, Permissions, and Reporting/Exporting
 * ==========================================================================
 */

// --------------------------------------------------------------------------
// 1. Core State & Constants
// --------------------------------------------------------------------------
const CONFIG_STORAGE_KEY = 'edumark_firebase_config';
const DB_MODE_KEY = 'edumark_db_mode';
const MOCK_DB_KEY = 'edumark_mock_database';

const DEFAULT_SUBJECTS = ["Arabic", "English", "Quran", "Malayalam", "Mathematics", "Science"];
const DEFAULT_CLASSES = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"];
const MONTHS = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];

const state = {
  dbMode: 'mock', // 'mock' or 'firebase'
  firebaseInitialized: false,
  currentUser: null, // { email, role: 'admin'|'teacher', name, uid, teacherData }
  activeView: 'view-login',
  activeReportTab: 'report-student',
  teachers: [],
  students: [],
  subjects: [], // Loaded dynamically from database
  // Current active selections for marks entry
  selectedClass: '',
  selectedSubject: '',
  // Theme state
  theme: 'dark'
};

// --------------------------------------------------------------------------
// 2. Mock Data Definitions & Seeding Engine
// --------------------------------------------------------------------------
const SAMPLE_TEACHERS = [
  { id: "teacher001", name: "Sarah Ahmed", email: "teacher1@school.com", classes: ["Class 1", "Class 2", "Class 5"], subjects: ["Arabic", "Quran"] },
  { id: "teacher002", name: "John Doe", email: "teacher2@school.com", classes: ["Class 3", "Class 4"], subjects: ["English", "Malayalam"] },
  { id: "teacher003", name: "David Miller", email: "teacher3@school.com", classes: ["Class 5", "Class 6"], subjects: ["Mathematics", "Science"] },
  { id: "teacher004", name: "Emily Davis", email: "teacher4@school.com", classes: ["Class 1", "Class 3"], subjects: ["English"] },
  { id: "teacher005", name: "Mohammed Al-Fatih", email: "teacher5@school.com", classes: ["Class 2", "Class 4"], subjects: ["Arabic"] },
  { id: "teacher006", name: "Fatima Hassan", email: "teacher6@school.com", classes: ["Class 7", "Class 8"], subjects: ["Quran", "Arabic"] },
  { id: "teacher007", name: "Aisha Rehman", email: "teacher7@school.com", classes: ["Class 7", "Class 8"], subjects: ["English", "Malayalam"] },
  { id: "teacher008", name: "Robert Chen", email: "teacher8@school.com", classes: ["Class 6", "Class 7"], subjects: ["Mathematics"] },
  { id: "teacher009", name: "Elena Rostova", email: "teacher9@school.com", classes: ["Class 5", "Class 8"], subjects: ["Science"] },
  { id: "teacher010", name: "Ravi Kumar", email: "teacher10@school.com", classes: ["Class 1", "Class 2", "Class 3"], subjects: ["Malayalam"] }
];

// Student Distribution Sizes: Class 1: 16, Class 2: 8, Class 3: 11, Class 4: 11, Class 5: 14, Class 6: 11, Class 7: 11, Class 8: 11 (Total: 93)
const CLASS_DISTRIBUTION_TARGETS = {
  "Class 1": 16,
  "Class 2": 8,
  "Class 3": 11,
  "Class 4": 11,
  "Class 5": 14,
  "Class 6": 11,
  "Class 7": 11,
  "Class 8": 11
};

const FIRST_NAMES = ["Ahmad", "Fatima", "Zayd", "Maryam", "Omar", "Khadija", "Yusuf", "Aisha", "Bilal", "Safiya", "Hamza", "Zainab", "Ali", "Hana", "Ibrahim", "Sara", "Mustafa", "Ruqayya", "Yahya", "Hajar", "Sufyan", "Sumayya", "Anas", "Asma", "Imran", "Nour", "Tariq", "Layla", "Khalid", "Huda"];
const LAST_NAMES = ["Khan", "Ali", "Syed", "Hassan", "Ahmed", "Rahman", "Malik", "Sheikh", "Farook", "Abdullah", "Shaikh", "Patel", "Hussein", "Qureshi", "Begum"];

function generateRandomMarks() {
  const subjectsData = {};
  state.subjects.forEach(sub => {
    const ce = {};
    let ceTotal = 0;
    MONTHS.forEach(m => {
      // Seed realistic marks, mostly between 7 and 10
      const score = Math.floor(Math.random() * 4) + 7; // 7, 8, 9, 10
      ce[m] = score;
      ceTotal += score;
    });
    const ceConverted = parseFloat((ceTotal / 10).toFixed(1));
    
    // Seed TE mark out of 50 (mostly 30 to 48)
    const te = Math.floor(Math.random() * 19) + 30; // 30-48
    
    subjectsData[sub] = {
      CE: ce,
      ceTotal: ceTotal,
      ceConverted: ceConverted,
      TE: te
    };
  });
  return subjectsData;
}

function generateStudentsList() {
  const students = [];
  let globalIdCounter = 1;
  
  Object.keys(CLASS_DISTRIBUTION_TARGETS).forEach(className => {
    const count = CLASS_DISTRIBUTION_TARGETS[className];
    for (let i = 0; i < count; i++) {
      const studentId = `ST${String(globalIdCounter).padStart(3, '0')}`;
      const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const name = `${fName} ${lName}`;
      
      students.push({
        studentId: studentId,
        name: name,
        class: className,
        subjects: generateRandomMarks()
      });
      globalIdCounter++;
    }
  });
  return students;
}

// --------------------------------------------------------------------------
// 3. Database Driver (Dual Mode: Firebase & LocalStorage Mock)
// --------------------------------------------------------------------------
const db = {
  // Initialize driver connection
  init: function() {
    const savedMode = localStorage.getItem(DB_MODE_KEY);
    if (savedMode === 'firebase') {
      const config = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY));
      if (config && config.apiKey) {
        try {
          if (!firebase.apps.length) {
            firebase.initializeApp(config);
          }
          state.dbMode = 'firebase';
          state.firebaseInitialized = true;
          showToast('info', 'Connected to live Firebase database.');
        } catch (e) {
          console.error("Firebase init failed, reverting to Mock.", e);
          state.dbMode = 'mock';
          showToast('error', 'Firebase connection failed. Reverted to Mock Mode.');
        }
      } else {
        state.dbMode = 'mock';
      }
    } else {
      state.dbMode = 'mock';
    }
    
    this.updateStatusBadge();
  },

  updateStatusBadge: function() {
    const indicators = [document.getElementById('db-indicator-login'), document.getElementById('db-indicator-header')];
    indicators.forEach(ind => {
      if (!ind) return;
      if (state.dbMode === 'firebase') {
        ind.className = 'db-badge firebase';
        ind.querySelector('.status-text').textContent = 'Firebase Live';
      } else {
        ind.className = 'db-badge mock';
        ind.querySelector('.status-text').textContent = 'Mock Database';
      }
    });
  },

  // Subjects Queries (Dynamic)
  getSubjects: async function() {
    if (state.dbMode === 'firebase' && state.firebaseInitialized) {
      try {
        const doc = await firebase.firestore().collection('settings').doc('subjects').get();
        if (doc.exists && doc.data().list) {
          state.subjects = doc.data().list;
        } else {
          // Initialize in Firestore
          await firebase.firestore().collection('settings').doc('subjects').set({ list: DEFAULT_SUBJECTS });
          state.subjects = [...DEFAULT_SUBJECTS];
        }
        return state.subjects;
      } catch (e) {
        console.error("Failed to fetch Firestore subjects, using fallback.", e);
        state.subjects = [...DEFAULT_SUBJECTS];
        return state.subjects;
      }
    } else {
      let saved = localStorage.getItem('edumark_subjects');
      if (!saved) {
        localStorage.setItem('edumark_subjects', JSON.stringify(DEFAULT_SUBJECTS));
        saved = JSON.stringify(DEFAULT_SUBJECTS);
      }
      state.subjects = JSON.parse(saved);
      return state.subjects;
    }
  },

  addSubject: async function(subjectName) {
    const current = await this.getSubjects();
    
    // Validate
    const trimmed = subjectName.trim();
    if (!trimmed) throw new Error("Subject name cannot be empty.");
    
    // Case insensitive check
    const exists = current.some(s => s.toLowerCase() === trimmed.toLowerCase());
    if (exists) throw new Error(`Subject "${trimmed}" already exists.`);
    
    current.push(trimmed);
    state.subjects = current;
    
    // Save updated list
    if (state.dbMode === 'firebase' && state.firebaseInitialized) {
      await firebase.firestore().collection('settings').doc('subjects').set({ list: current });
      
      // Update all existing student documents in Firestore to initialize this subject
      const snapshot = await firebase.firestore().collection('students').get();
      for (const doc of snapshot.docs) {
        const studentData = doc.data();
        if (!studentData.subjects) studentData.subjects = {};
        if (!studentData.subjects[trimmed]) {
          studentData.subjects[trimmed] = {
            CE: {}, ceTotal: 0, ceConverted: 0.0, TE: 0
          };
          MONTHS.forEach(m => studentData.subjects[trimmed].CE[m] = 0);
          await doc.ref.update({ subjects: studentData.subjects });
        }
      }
    } else {
      localStorage.setItem('edumark_subjects', JSON.stringify(current));
      
      // Update mock students in localStorage
      const mockDb = JSON.parse(localStorage.getItem(MOCK_DB_KEY));
      if (mockDb && mockDb.students) {
        mockDb.students.forEach(student => {
          if (!student.subjects) student.subjects = {};
          if (!student.subjects[trimmed]) {
            student.subjects[trimmed] = {
              CE: {}, ceTotal: 0, ceConverted: 0.0, TE: 0
            };
            MONTHS.forEach(m => student.subjects[trimmed].CE[m] = 0);
          }
        });
        localStorage.setItem(MOCK_DB_KEY, JSON.stringify(mockDb));
        state.students = mockDb.students;
      }
    }
    
    return current;
  },

  // Teachers Queries
  getTeachers: async function() {
    if (state.dbMode === 'firebase' && state.firebaseInitialized) {
      const snapshot = await firebase.firestore().collection('teachers').get();
      const teachers = [];
      snapshot.forEach(doc => {
        teachers.push({ id: doc.id, ...doc.data() });
      });
      state.teachers = teachers;
      return teachers;
    } else {
      let mockDb = JSON.parse(localStorage.getItem(MOCK_DB_KEY));
      if (!mockDb) {
        this.seedMockDatabase();
        mockDb = JSON.parse(localStorage.getItem(MOCK_DB_KEY));
      }
      state.teachers = mockDb.teachers;
      return mockDb.teachers;
    }
  },

  saveTeacher: async function(teacher) {
    if (state.dbMode === 'firebase' && state.firebaseInitialized) {
      const dbRef = firebase.firestore().collection('teachers');
      if (teacher.id) {
        const id = teacher.id;
        const data = { ...teacher };
        delete data.id;
        await dbRef.doc(id).set(data, { merge: true });
      } else {
        const docRef = await dbRef.add(teacher);
        teacher.id = docRef.id;
      }
      await this.getTeachers();
      return teacher;
    } else {
      const mockDb = JSON.parse(localStorage.getItem(MOCK_DB_KEY));
      if (teacher.id) {
        const idx = mockDb.teachers.findIndex(t => t.id === teacher.id);
        if (idx !== -1) mockDb.teachers[idx] = teacher;
      } else {
        teacher.id = `teacher${String(mockDb.teachers.length + 1).padStart(3, '0')}`;
        mockDb.teachers.push(teacher);
      }
      localStorage.setItem(MOCK_DB_KEY, JSON.stringify(mockDb));
      state.teachers = mockDb.teachers;
      return teacher;
    }
  },

  deleteTeacher: async function(teacherId) {
    if (state.dbMode === 'firebase' && state.firebaseInitialized) {
      await firebase.firestore().collection('teachers').doc(teacherId).delete();
      await this.getTeachers();
    } else {
      const mockDb = JSON.parse(localStorage.getItem(MOCK_DB_KEY));
      mockDb.teachers = mockDb.teachers.filter(t => t.id !== teacherId);
      localStorage.setItem(MOCK_DB_KEY, JSON.stringify(mockDb));
      state.teachers = mockDb.teachers;
    }
  },

  // Students Queries
  getStudents: async function() {
    if (state.dbMode === 'firebase' && state.firebaseInitialized) {
      const snapshot = await firebase.firestore().collection('students').orderBy('studentId').get();
      const students = [];
      snapshot.forEach(doc => {
        students.push({ id: doc.id, ...doc.data() });
      });
      state.students = students;
      return students;
    } else {
      let mockDb = JSON.parse(localStorage.getItem(MOCK_DB_KEY));
      if (!mockDb) {
        this.seedMockDatabase();
        mockDb = JSON.parse(localStorage.getItem(MOCK_DB_KEY));
      }
      state.students = mockDb.students;
      return mockDb.students;
    }
  },

  saveStudent: async function(student) {
    if (state.dbMode === 'firebase' && state.firebaseInitialized) {
      const dbRef = firebase.firestore().collection('students');
      if (student.id) {
        const id = student.id;
        const data = { ...student };
        delete data.id;
        await dbRef.doc(id).set(data, { merge: true });
      } else {
        if (!student.subjects) student.subjects = generateEmptySubjectsMap();
        await dbRef.add(student);
      }
      await this.getStudents();
      return student;
    } else {
      const mockDb = JSON.parse(localStorage.getItem(MOCK_DB_KEY));
      if (student.id) {
        const idx = mockDb.students.findIndex(s => s.studentId === student.studentId);
        if (idx !== -1) mockDb.students[idx] = student;
      } else {
        if (!student.subjects) student.subjects = generateEmptySubjectsMap();
        mockDb.students.push(student);
      }
      localStorage.setItem(MOCK_DB_KEY, JSON.stringify(mockDb));
      state.students = mockDb.students;
      return student;
    }
  },

  deleteStudent: async function(studentId) {
    if (state.dbMode === 'firebase' && state.firebaseInitialized) {
      const snapshot = await firebase.firestore().collection('students').where('studentId', '==', studentId).get();
      snapshot.forEach(async doc => {
        await firebase.firestore().collection('students').doc(doc.id).delete();
      });
      await this.getStudents();
    } else {
      const mockDb = JSON.parse(localStorage.getItem(MOCK_DB_KEY));
      mockDb.students = mockDb.students.filter(s => s.studentId !== studentId);
      localStorage.setItem(MOCK_DB_KEY, JSON.stringify(mockDb));
      state.students = mockDb.students;
    }
  },

  saveStudentMarks: async function(studentId, subjectName, marksData) {
    if (state.dbMode === 'firebase' && state.firebaseInitialized) {
      const snapshot = await firebase.firestore().collection('students').where('studentId', '==', studentId).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const studentData = doc.data();
        if (!studentData.subjects) studentData.subjects = {};
        studentData.subjects[subjectName] = marksData;
        await firebase.firestore().collection('students').doc(doc.id).update({
          subjects: studentData.subjects
        });
      }
    } else {
      const mockDb = JSON.parse(localStorage.getItem(MOCK_DB_KEY));
      const idx = mockDb.students.findIndex(s => s.studentId === studentId);
      if (idx !== -1) {
        if (!mockDb.students[idx].subjects) mockDb.students[idx].subjects = {};
        mockDb.students[idx].subjects[subjectName] = marksData;
        localStorage.setItem(MOCK_DB_KEY, JSON.stringify(mockDb));
        state.students = mockDb.students;
      }
    }
  },

  // Seeding Helpers
  seedMockDatabase: function() {
    const database = {
      teachers: SAMPLE_TEACHERS,
      students: generateStudentsList()
    };
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(database));
    // Reset custom subjects
    localStorage.removeItem('edumark_subjects');
    state.subjects = [...DEFAULT_SUBJECTS];
    state.teachers = database.teachers;
    state.students = database.students;
  },

  seedFirebaseDatabase: async function() {
    if (!state.firebaseInitialized) return;
    showToast('info', 'Seeding live Firebase database... Please wait.');
    try {
      const firestore = firebase.firestore();
      
      // Clear existing first
      const teachersSnap = await firestore.collection('teachers').get();
      teachersSnap.forEach(async doc => await doc.ref.delete());
      
      const studentsSnap = await firestore.collection('students').get();
      studentsSnap.forEach(async doc => await doc.ref.delete());
      
      // Reset subjects list
      await firestore.collection('settings').doc('subjects').set({ list: DEFAULT_SUBJECTS });
      state.subjects = [...DEFAULT_SUBJECTS];
      
      // Upload Teachers
      for (const t of SAMPLE_TEACHERS) {
        await firestore.collection('teachers').doc(t.id).set(t);
      }
      
      // Upload Students
      const studentsList = generateStudentsList();
      for (const s of studentsList) {
        await firestore.collection('students').add(s);
      }
      
      showToast('success', 'Firebase Database successfully seeded with 10 teachers and 93 students!');
      await this.getStudents();
      await this.getTeachers();
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to seed Firebase database: ' + e.message);
    }
  }
};

function generateEmptySubjectsMap() {
  const subjectsMap = {};
  state.subjects.forEach(sub => {
    const ce = {};
    MONTHS.forEach(m => ce[m] = 0);
    subjectsMap[sub] = {
      CE: ce,
      ceTotal: 0,
      ceConverted: 0.0,
      TE: 0
    };
  });
  return subjectsMap;
}

// --------------------------------------------------------------------------
// 4. Toast Notifications System
// --------------------------------------------------------------------------
function showToast(type, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';
  
  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  lucide.createIcons({ attrs: { class: 'toast-icon-svg' } });
  
  // Remove toast after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'toastSlideIn 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --------------------------------------------------------------------------
// 5. Routing and View Controller
// --------------------------------------------------------------------------
function switchView(viewId) {
  const views = [
    'view-login', 
    'view-admin-home', 
    'view-admin-teachers', 
    'view-admin-students',
    'view-teacher-home', 
    'view-teacher-marks',
    'view-reports',
    'view-student-portal'
  ];
  
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.classList.add('hidden');
  });
  
  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.remove('hidden');
  
  state.activeView = viewId;
  
  // Handle sidebar layout visibility
  const layout = document.getElementById('main-dashboard-layout');
  if (viewId === 'view-login' || viewId === 'view-student-portal') {
    layout.classList.add('hidden');
  } else {
    layout.classList.remove('hidden');
    document.querySelector('.sidebar').classList.remove('active');
  }
  
  // Update Navigation Active Links
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  let headerTitle = "Dashboard";
  
  if (viewId === 'view-admin-home') {
    document.getElementById('nav-admin-home').classList.add('active');
    headerTitle = "Admin Console";
    renderAdminDashboard();
  } else if (viewId === 'view-admin-teachers') {
    document.getElementById('nav-admin-teachers').classList.add('active');
    headerTitle = "Manage Teachers";
    renderTeachersTable();
  } else if (viewId === 'view-admin-students') {
    document.getElementById('nav-admin-students').classList.add('active');
    headerTitle = "Manage Students";
    renderStudentsTable();
  } else if (viewId === 'view-teacher-home') {
    document.getElementById('nav-teacher-home').classList.add('active');
    headerTitle = "Teacher Classrooms";
    renderTeacherClasses();
  } else if (viewId === 'view-teacher-marks') {
    document.getElementById('nav-teacher-marks').classList.add('active');
    headerTitle = "Continuous Evaluation Matrix";
    setupMarksEntrySelectors();
  } else if (viewId === 'view-reports') {
    document.getElementById('nav-reports').classList.add('active');
    headerTitle = "Reports & Consolidated Sheets";
    renderActiveReportTab();
  }
  
  document.getElementById('header-view-title').textContent = headerTitle;
  lucide.createIcons();
}

// --------------------------------------------------------------------------
// 6. Authentication Controller
// --------------------------------------------------------------------------
async function handleLogin(email, password) {
  const submitBtn = document.getElementById('btn-submit-login');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Verifying...</span>';
  
  try {
    // 1. Check Admin Credentials
    if (email === 'admin@school.com') {
      if (password === 'admin123') {
        state.currentUser = {
          email: email,
          role: 'admin',
          name: 'Administrator',
          uid: 'admin_uid'
        };
        setupUserSession();
        showToast('success', 'Logged in successfully as Administrator.');
        switchView('view-admin-home');
      } else {
        throw new Error("Invalid password for Admin.");
      }
      return;
    }
    
    // 2. Check Teacher Login
    const teachers = await db.getTeachers();
    const teacher = teachers.find(t => t.email.toLowerCase() === email.toLowerCase());
    
    if (teacher) {
      if (state.dbMode === 'mock') {
        const expectedPass = 'teacher123';
        if (password === expectedPass) {
          state.currentUser = {
            email: teacher.email,
            role: 'teacher',
            name: teacher.name,
            uid: teacher.id,
            teacherData: teacher
          };
          setupUserSession();
          showToast('success', `Welcome back, ${teacher.name}!`);
          switchView('view-teacher-home');
        } else {
          throw new Error("Invalid password for Teacher.");
        }
      } else {
        // Firebase Auth Mode
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        state.currentUser = {
          email: userCredential.user.email,
          role: 'teacher',
          name: teacher.name,
          uid: userCredential.user.uid,
          teacherData: teacher
        };
        setupUserSession();
        showToast('success', `Welcome back, ${teacher.name}!`);
        switchView('view-teacher-home');
      }
    } else {
      throw new Error("No staff account found with this email address.");
    }
  } catch (error) {
    showToast('error', error.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Log In</span><i data-lucide="arrow-right"></i>';
    lucide.createIcons();
  }
}

function setupUserSession() {
  const u = state.currentUser;
  document.getElementById('header-user-display').textContent = u.email;
  
  document.getElementById('sidebar-user-name').textContent = u.name;
  document.getElementById('sidebar-user-role').textContent = u.role === 'admin' ? 'System Administrator' : 'Academic Staff';
  document.getElementById('sidebar-user-avatar').textContent = u.name.charAt(0);
  
  const navAdmin = document.getElementById('nav-group-admin');
  const navTeacher = document.getElementById('nav-group-teacher');
  
  if (u.role === 'admin') {
    navAdmin.classList.remove('hidden');
    navTeacher.classList.add('hidden');
  } else {
    navAdmin.classList.add('hidden');
    navTeacher.classList.remove('hidden');
  }
  
  document.getElementById('form-login').reset();
}

function handleLogout() {
  if (state.dbMode === 'firebase' && state.firebaseInitialized) {
    firebase.auth().signOut();
  }
  state.currentUser = null;
  showToast('info', 'Logged out successfully.');
  
  const submitBtn = document.getElementById('btn-submit-login');
  submitBtn.disabled = false;
  submitBtn.innerHTML = '<span>Log In</span><i data-lucide="arrow-right"></i>';
  
  switchView('view-login');
}

// --------------------------------------------------------------------------
// 7. Admin Dashboard View Logic
// --------------------------------------------------------------------------
async function renderAdminDashboard() {
  const teachers = await db.getTeachers();
  const students = await db.getStudents();
  
  document.getElementById('stat-teachers').textContent = teachers.length;
  document.getElementById('stat-students').textContent = students.length;
  document.getElementById('stat-classes').textContent = DEFAULT_CLASSES.length;
  document.getElementById('admin-display-name').textContent = state.currentUser.name;
  
  const container = document.getElementById('class-distribution-list');
  container.innerHTML = '';
  
  const counts = {};
  DEFAULT_CLASSES.forEach(c => counts[c] = 0);
  students.forEach(s => {
    if (counts[s.class] !== undefined) counts[s.class]++;
  });
  
  const maxInClass = Math.max(...Object.values(counts), 1);
  
  DEFAULT_CLASSES.forEach(cName => {
    const sCount = counts[cName];
    const pct = (sCount / maxInClass) * 100;
    
    const item = document.createElement('div');
    item.className = 'class-dist-item';
    item.innerHTML = `
      <span class="class-lbl">${cName}</span>
      <div class="class-progress-bar-wrapper">
        <div class="class-progress-bar" style="width: ${pct}%"></div>
      </div>
      <span class="class-count">${sCount} Students</span>
    `;
    container.appendChild(item);
  });
}

// --------------------------------------------------------------------------
// 8. Teacher Management Logic
// --------------------------------------------------------------------------
let teacherSearchQuery = '';
function renderTeachersTable() {
  const tbody = document.getElementById('teachers-table-body');
  tbody.innerHTML = '';
  
  const filtered = state.teachers.filter(t => 
    t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(teacherSearchQuery.toLowerCase())
  );
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">No teacher records found.</td></tr>`;
    return;
  }
  
  filtered.forEach(t => {
    const tr = document.createElement('tr');
    
    const classesBadges = t.classes.map(c => `<span class="badge badge-class">${c}</span>`).join('');
    const subjectsBadges = t.subjects.map(s => `<span class="badge badge-subject">${s}</span>`).join('');
    
    tr.innerHTML = `
      <td><strong>${t.name}</strong></td>
      <td>${t.email}</td>
      <td><div class="flex-wrap">${classesBadges}</div></td>
      <td><div class="flex-wrap">${subjectsBadges}</div></td>
      <td>
        <div class="flex-row">
          <button class="btn-icon-only btn-edit" data-id="${t.id}" title="Edit Teacher">
            <i data-lucide="edit"></i>
          </button>
          <button class="btn-icon-only btn-delete" data-id="${t.id}" title="Delete Teacher">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-id');
      openTeacherModal(id);
    });
  });
  
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.getAttribute('data-id');
      const teacherName = state.teachers.find(t => t.id === id)?.name;
      if (confirm(`Are you sure you want to delete teacher "${teacherName}"?`)) {
        await db.deleteTeacher(id);
        showToast('success', 'Teacher deleted successfully.');
        renderTeachersTable();
      }
    });
  });
  
  lucide.createIcons();
}

function renderTeacherSubjectsChecklist() {
  const container = document.getElementById('teacher-subjects-checklist');
  if (!container) return;
  container.innerHTML = '';
  state.subjects.forEach(sub => {
    const div = document.createElement('div');
    div.className = 'checkbox-item';
    const safeId = `t-sub-${sub.toLowerCase().replace(/\s+/g, '-')}`;
    div.innerHTML = `
      <input type="checkbox" id="${safeId}" value="${sub}">
      <label for="${safeId}">${sub}</label>
    `;
    container.appendChild(div);
  });
}

function openTeacherModal(teacherId = null) {
  const modal = document.getElementById('modal-teacher');
  const form = document.getElementById('form-teacher');
  const title = document.getElementById('modal-teacher-title');
  const passGroup = document.getElementById('teacher-password-group');
  
  form.reset();
  document.getElementById('teacher-form-id').value = '';
  
  // Render subjects checklist dynamically to support any new subjects
  renderTeacherSubjectsChecklist();
  
  // Uncheck all boxes
  modal.querySelectorAll('input[type="checkbox"]').forEach(box => box.checked = false);
  
  if (teacherId) {
    title.textContent = "Edit Teacher Record";
    const t = state.teachers.find(teacher => teacher.id === teacherId);
    if (t) {
      document.getElementById('teacher-form-id').value = t.id;
      document.getElementById('teacher-name').value = t.name;
      document.getElementById('teacher-email').value = t.email;
      passGroup.classList.add('hidden');
      
      t.classes.forEach(c => {
        const box = modal.querySelector(`input[value="${c}"]`);
        if (box) box.checked = true;
      });
      t.subjects.forEach(s => {
        const box = modal.querySelector(`input[value="${s}"]`);
        if (box) box.checked = true;
      });
    }
  } else {
    title.textContent = "Register New Teacher";
    passGroup.classList.remove('hidden');
    document.getElementById('teacher-password').setAttribute('required', 'required');
  }
  
  modal.classList.remove('hidden');
  lucide.createIcons();
}

document.getElementById('form-teacher').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('teacher-form-id').value;
  const name = document.getElementById('teacher-name').value;
  const email = document.getElementById('teacher-email').value;
  const password = document.getElementById('teacher-password').value;
  
  const classes = [];
  document.getElementById('teacher-classes-checklist').querySelectorAll('input[type="checkbox"]:checked').forEach(box => {
    classes.push(box.value);
  });
  
  const subjects = [];
  document.getElementById('teacher-subjects-checklist').querySelectorAll('input[type="checkbox"]:checked').forEach(box => {
    subjects.push(box.value);
  });
  
  if (classes.length === 0 || subjects.length === 0) {
    showToast('error', 'Please assign at least one class and one subject to the teacher.');
    return;
  }
  
  const teacherData = { name, email, classes, subjects };
  if (id) teacherData.id = id;
  
  try {
    await db.saveTeacher(teacherData);
    showToast('success', 'Teacher record saved successfully.');
    document.getElementById('modal-teacher').classList.add('hidden');
    renderTeachersTable();
  } catch (error) {
    showToast('error', error.message);
  }
});

// --------------------------------------------------------------------------
// 9. Student Management Logic
// --------------------------------------------------------------------------
let studentSearchQuery = '';
let studentFilterClass = '';
const studentPageSize = 15;
let studentCurrentPage = 1;

function renderStudentsTable() {
  const tbody = document.getElementById('students-table-body');
  tbody.innerHTML = '';
  
  let filtered = state.students;
  
  if (studentSearchQuery) {
    const query = studentSearchQuery.toLowerCase();
    filtered = filtered.filter(s => 
      s.studentId.toLowerCase().includes(query) ||
      s.name.toLowerCase().includes(query)
    );
  }
  
  if (studentFilterClass) {
    filtered = filtered.filter(s => s.class === studentFilterClass);
  }
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">No student records found.</td></tr>`;
    return;
  }
  
  const totalPages = Math.ceil(filtered.length / studentPageSize);
  if (studentCurrentPage > totalPages) studentCurrentPage = 1;
  
  const startIdx = (studentCurrentPage - 1) * studentPageSize;
  const pageData = filtered.slice(startIdx, startIdx + studentPageSize);
  
  pageData.forEach(s => {
    const tr = document.createElement('tr');
    const numSubs = Object.keys(s.subjects || {}).length;
    
    tr.innerHTML = `
      <td><strong>${s.studentId}</strong></td>
      <td>
        <button class="btn-link btn-view-profile" data-id="${s.studentId}" style="text-align: left; font-weight:600; color:var(--text-primary);">
          ${s.name}
        </button>
      </td>
      <td><span class="badge badge-class">${s.class}</span></td>
      <td class="text-center">${numSubs}</td>
      <td>
        <div class="flex-row">
          <button class="btn-icon-only btn-edit-student" data-id="${s.studentId}" title="Edit Student">
            <i data-lucide="edit"></i>
          </button>
          <button class="btn-icon-only btn-delete-student" data-id="${s.studentId}" title="Delete Student">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  if (totalPages > 1) {
    const controlsTr = document.createElement('tr');
    controlsTr.innerHTML = `
      <td colspan="5">
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.5rem 0;">
          <span style="font-size:0.8rem; color:var(--text-secondary);">Showing ${startIdx + 1}-${Math.min(startIdx + studentPageSize, filtered.length)} of ${filtered.length} students</span>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" id="btn-page-prev" ${studentCurrentPage === 1 ? 'disabled' : ''}>Previous</button>
            <button class="btn btn-secondary btn-sm" id="btn-page-next" ${studentCurrentPage === totalPages ? 'disabled' : ''}>Next</button>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(controlsTr);
    
    document.getElementById('btn-page-prev').addEventListener('click', () => {
      studentCurrentPage--;
      renderStudentsTable();
    });
    document.getElementById('btn-page-next').addEventListener('click', () => {
      studentCurrentPage++;
      renderStudentsTable();
    });
  }
  
  tbody.querySelectorAll('.btn-view-profile').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openStudentReportFromAdmin(id);
    });
  });

  tbody.querySelectorAll('.btn-edit-student').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openStudentModal(id);
    });
  });
  
  tbody.querySelectorAll('.btn-delete-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm(`Are you sure you want to delete student ID "${id}"?`)) {
        await db.deleteStudent(id);
        showToast('success', 'Student record deleted successfully.');
        renderStudentsTable();
      }
    });
  });
  
  lucide.createIcons();
}

function openStudentModal(studentId = null) {
  const modal = document.getElementById('modal-student');
  const form = document.getElementById('form-student');
  const title = document.getElementById('modal-student-title');
  const idField = document.getElementById('student-id-field');
  
  form.reset();
  document.getElementById('student-form-id').value = '';
  idField.removeAttribute('readonly');
  
  if (studentId) {
    title.textContent = "Edit Student Record";
    const s = state.students.find(student => student.studentId === studentId);
    if (s) {
      document.getElementById('student-form-id').value = s.studentId;
      idField.value = s.studentId;
      idField.setAttribute('readonly', 'readonly');
      document.getElementById('student-name-field').value = s.name;
      document.getElementById('student-class-field').value = s.class;
    }
  } else {
    title.textContent = "Enroll New Student";
    let maxId = 0;
    state.students.forEach(s => {
      const num = parseInt(s.studentId.replace('ST', ''));
      if (num > maxId) maxId = num;
    });
    idField.value = `ST${String(maxId + 1).padStart(3, '0')}`;
  }
  
  modal.classList.remove('hidden');
  lucide.createIcons();
}

document.getElementById('form-student').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('student-form-id').value;
  const studentId = document.getElementById('student-id-field').value;
  const name = document.getElementById('student-name-field').value;
  const className = document.getElementById('student-class-field').value;
  
  const studentData = { studentId, name, class: className };
  if (id) {
    studentData.id = id;
    const existing = state.students.find(s => s.studentId === id);
    if (existing) studentData.subjects = existing.subjects;
  }
  
  try {
    await db.saveStudent(studentData);
    showToast('success', 'Student record saved successfully.');
    document.getElementById('modal-student').classList.add('hidden');
    renderStudentsTable();
  } catch (error) {
    showToast('error', error.message);
  }
});

function openStudentReportFromAdmin(studentId) {
  switchView('view-reports');
  document.getElementById('btn-rep-tab-student').click();
  const searchInput = document.getElementById('report-student-search');
  searchInput.value = studentId;
  generateStudentReport(studentId);
}

// --------------------------------------------------------------------------
// 10. Teacher Dashboard View Logic
// --------------------------------------------------------------------------
function renderTeacherClasses() {
  const grid = document.getElementById('assigned-classes-subjects-grid');
  grid.innerHTML = '';
  
  const teacher = state.currentUser.teacherData;
  if (!teacher || !teacher.classes || teacher.classes.length === 0) {
    grid.innerHTML = `<div class="text-center" style="grid-column: 1/-1;">You have no assigned classes. Please contact the administrator.</div>`;
    return;
  }
  
  document.getElementById('teacher-display-name').textContent = teacher.name;
  
  teacher.classes.forEach(cName => {
    teacher.subjects.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'assigned-card glass-card';
      card.innerHTML = `
        <div class="assigned-icon">
          <i data-lucide="book-open"></i>
        </div>
        <h4>${cName}</h4>
        <p>${sub}</p>
      `;
      card.addEventListener('click', () => {
        state.selectedClass = cName;
        state.selectedSubject = sub;
        switchView('view-teacher-marks');
      });
      grid.appendChild(card);
    });
  });
}

// --------------------------------------------------------------------------
// 11. Marks Entry Spreadsheet Controller
// --------------------------------------------------------------------------
function setupMarksEntrySelectors() {
  const classSelect = document.getElementById('marks-select-class');
  const subjectSelect = document.getElementById('marks-select-subject');
  const t = state.currentUser.teacherData;
  
  if (!t) return;
  
  classSelect.innerHTML = `<option value="">-- Choose Class --</option>`;
  subjectSelect.innerHTML = `<option value="">-- Choose Subject --</option>`;
  subjectSelect.disabled = true;
  
  t.classes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    if (c === state.selectedClass) opt.selected = true;
    classSelect.appendChild(opt);
  });
  
  classSelect.addEventListener('change', () => {
    const cls = classSelect.value;
    state.selectedClass = cls;
    
    subjectSelect.innerHTML = `<option value="">-- Choose Subject --</option>`;
    if (cls) {
      subjectSelect.disabled = false;
      t.subjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        if (s === state.selectedSubject) opt.selected = true;
        subjectSelect.appendChild(opt);
      });
    } else {
      subjectSelect.disabled = true;
      state.selectedSubject = '';
      hideMarksEntryGrid();
    }
  });
  
  subjectSelect.addEventListener('change', () => {
    state.selectedSubject = subjectSelect.value;
    loadMarksEntryGrid();
  });
  
  if (state.selectedClass) {
    classSelect.dispatchEvent(new Event('change'));
    if (state.selectedSubject) {
      subjectSelect.value = state.selectedSubject;
      loadMarksEntryGrid();
    }
  }
}

function hideMarksEntryGrid() {
  document.getElementById('marks-entry-container').classList.add('hidden');
  document.getElementById('marks-entry-empty-state').classList.remove('hidden');
}

let activeGridStudents = [];

async function loadMarksEntryGrid() {
  const cls = state.selectedClass;
  const sub = state.selectedSubject;
  
  if (!cls || !sub) {
    hideMarksEntryGrid();
    return;
  }
  
  document.getElementById('marks-permission-badge').classList.remove('hidden');
  document.getElementById('marks-entry-empty-state').classList.add('hidden');
  
  const container = document.getElementById('marks-entry-container');
  container.classList.remove('hidden');
  
  document.getElementById('spreadsheet-title').textContent = `${cls} - ${sub}`;
  
  const allStudents = await db.getStudents();
  activeGridStudents = allStudents.filter(s => s.class === cls);
  
  const tbody = document.getElementById('marks-entry-table-body');
  tbody.innerHTML = '';
  
  if (activeGridStudents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="16" class="text-center">No students enrolled in ${cls}.</td></tr>`;
    return;
  }
  
  activeGridStudents.forEach(s => {
    if (!s.subjects) s.subjects = {};
    if (!s.subjects[sub]) {
      s.subjects[sub] = {
        CE: {}, ceTotal: 0, ceConverted: 0.0, TE: 0
      };
      MONTHS.forEach(m => s.subjects[sub].CE[m] = 0);
    }
    
    const mData = s.subjects[sub];
    const tr = document.createElement('tr');
    tr.setAttribute('data-student-id', s.studentId);
    
    let html = `
      <td class="sticky-col first-col"><strong>${s.studentId}</strong></td>
      <td class="sticky-col second-col">${s.name}</td>
    `;
    
    MONTHS.forEach(m => {
      const val = mData.CE[m] !== undefined ? mData.CE[m] : 0;
      html += `
        <td>
          <input type="number" class="cell-input ce-input" data-month="${m}" min="0" max="10" step="1" value="${val}">
        </td>
      `;
    });
    
    html += `
      <td class="cell-summary ce-total-cell">${mData.ceTotal}</td>
      <td class="cell-summary-converted ce-converted-cell">${mData.ceConverted.toFixed(1)}</td>
      <td>
        <input type="number" class="cell-input te-input" min="0" max="50" step="1" value="${mData.TE || 0}">
      </td>
      <td class="cell-summary-total row-total-cell">${(mData.ceConverted + (mData.TE || 0)).toFixed(1)}</td>
    `;
    
    tr.innerHTML = html;
    tbody.appendChild(tr);
  });
  
  tbody.querySelectorAll('.cell-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const row = input.closest('tr');
      calculateRowMarks(row);
    });
    
    input.addEventListener('change', () => {
      const max = parseInt(input.getAttribute('max'));
      const min = parseInt(input.getAttribute('min'));
      let val = parseInt(input.value) || 0;
      
      if (val > max) val = max;
      if (val < min) val = min;
      input.value = val;
      
      calculateRowMarks(input.closest('tr'));
    });
  });
  
  lucide.createIcons();
}

function calculateRowMarks(row) {
  const ceInputs = row.querySelectorAll('.ce-input');
  let ceTotal = 0;
  
  ceInputs.forEach(input => {
    const val = Math.min(Math.max(parseInt(input.value) || 0, 0), 10);
    ceTotal += val;
  });
  
  const ceConverted = parseFloat((ceTotal / 10).toFixed(1));
  
  const teInput = row.querySelector('.te-input');
  const teVal = Math.min(Math.max(parseInt(teInput.value) || 0, 0), 50);
  
  const grandTotal = ceConverted + teVal;
  
  row.querySelector('.ce-total-cell').textContent = ceTotal;
  row.querySelector('.ce-converted-cell').textContent = ceConverted.toFixed(1);
  row.querySelector('.row-total-cell').textContent = grandTotal.toFixed(1);
}

document.getElementById('btn-save-marks').addEventListener('click', async () => {
  const tbody = document.getElementById('marks-entry-table-body');
  const rows = tbody.querySelectorAll('tr[data-student-id]');
  const sub = state.selectedSubject;
  
  if (rows.length === 0) return;
  
  showToast('info', 'Saving marks... Please wait.');
  
  try {
    for (const row of rows) {
      const studentId = row.getAttribute('data-student-id');
      
      const ce = {};
      row.querySelectorAll('.ce-input').forEach(input => {
        const month = input.getAttribute('data-month');
        ce[month] = parseInt(input.value) || 0;
      });
      
      const ceTotal = parseInt(row.querySelector('.ce-total-cell').textContent) || 0;
      const ceConverted = parseFloat(row.querySelector('.ce-converted-cell').textContent) || 0;
      const te = parseInt(row.querySelector('.te-input').value) || 0;
      
      const marksData = {
        CE: ce,
        ceTotal,
        ceConverted,
        TE: te
      };
      
      await db.saveStudentMarks(studentId, sub, marksData);
    }
    
    showToast('success', `All marks for Class ${state.selectedClass} (${sub}) have been saved successfully.`);
    await db.getStudents();
  } catch (e) {
    showToast('error', 'Error saving marks: ' + e.message);
  }
});

// --------------------------------------------------------------------------
// 12. Reports Portal Controller
// --------------------------------------------------------------------------
function renderActiveReportTab() {
  const tabs = ['report-student', 'report-class', 'report-subject', 'report-rank'];
  tabs.forEach(t => {
    const el = document.getElementById(t);
    if (el) el.classList.add('hidden');
  });
  
  document.getElementById(state.activeReportTab).classList.remove('hidden');
  
  if (state.activeReportTab === 'report-student') {
    setupStudentReportSearch();
  } else if (state.activeReportTab === 'report-class') {
    setupClassReportSelector();
  } else if (state.activeReportTab === 'report-subject') {
    setupSubjectReportSelectors();
  } else if (state.activeReportTab === 'report-rank') {
    setupRankReportSelector();
  }
}

// 12.1 Student Transcript Tab
function setupStudentReportSearch() {
  const searchInput = document.getElementById('report-student-search');
  const suggestionsBox = document.getElementById('report-student-suggestions');
  
  searchInput.value = '';
  suggestionsBox.innerHTML = '';
  suggestionsBox.classList.add('hidden');
  
  document.getElementById('student-transcript-card').classList.add('hidden');
  document.getElementById('student-report-empty-state').classList.remove('hidden');
  document.getElementById('btn-print-student-report').disabled = true;
  
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    suggestionsBox.innerHTML = '';
    
    if (query.length < 2) {
      suggestionsBox.classList.add('hidden');
      return;
    }
    
    const matches = state.students.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.studentId.toLowerCase().includes(query)
    ).slice(0, 5);
    
    if (matches.length === 0) {
      suggestionsBox.classList.add('hidden');
      return;
    }
    
    matches.forEach(s => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `
        <span><strong>${s.studentId}</strong> - ${s.name}</span>
        <span class="badge badge-class" style="margin:0;">${s.class}</span>
      `;
      item.addEventListener('click', () => {
        searchInput.value = s.studentId;
        suggestionsBox.classList.add('hidden');
        generateStudentReport(s.studentId);
      });
      suggestionsBox.appendChild(item);
    });
    
    suggestionsBox.classList.remove('hidden');
  });
  
  document.addEventListener('click', (e) => {
    if (e.target !== searchInput) {
      suggestionsBox.classList.add('hidden');
    }
  });
}

function generateStudentReport(studentId) {
  const student = state.students.find(s => s.studentId === studentId);
  if (!student) {
    showToast('error', 'Student not found.');
    return;
  }
  
  document.getElementById('student-report-empty-state').classList.add('hidden');
  const card = document.getElementById('student-transcript-card');
  card.classList.remove('hidden');
  document.getElementById('btn-print-student-report').disabled = false;
  
  document.getElementById('rep-student-name').textContent = student.name;
  document.getElementById('rep-student-id').textContent = student.studentId;
  document.getElementById('rep-student-class').textContent = student.class;
  
  const tbody = document.getElementById('rep-student-marks-body');
  tbody.innerHTML = '';
  
  let grandTotalScore = 0;
  let maxPossibleScore = 0;
  let failedSubjectsCount = 0;
  
  state.subjects.forEach(sub => {
    const sData = student.subjects?.[sub] || { ceConverted: 0, TE: 0 };
    const ce = sData.ceConverted || 0;
    const te = sData.TE || 0;
    const total = ce + te;
    const percentage = (total / 60) * 100;
    
    grandTotalScore += total;
    maxPossibleScore += 60;
    
    const isPass = te >= 15 && total >= 24;
    if (!isPass) failedSubjectsCount++;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${sub}</strong></td>
      <td class="text-center">${ce.toFixed(1)}</td>
      <td class="text-center">${te}</td>
      <td class="text-center" style="font-weight:600;">${total.toFixed(1)}</td>
      <td class="text-center">${percentage.toFixed(1)}%</td>
      <td class="text-center ${isPass ? 'pass-text' : 'fail-text'}">${isPass ? 'PASS' : 'FAIL'}</td>
    `;
    tbody.appendChild(tr);
  });
  
  const overallPct = (grandTotalScore / maxPossibleScore) * 100;
  document.getElementById('rep-student-grand-total').textContent = `${grandTotalScore.toFixed(1)} / ${maxPossibleScore}`;
  document.getElementById('rep-student-overall-percentage').textContent = `${overallPct.toFixed(1)}%`;
  
  const statusEl = document.getElementById('rep-student-overall-status');
  if (failedSubjectsCount === 0 && overallPct >= 40) {
    statusEl.textContent = "PASS";
    statusEl.className = "pass-text";
  } else {
    statusEl.textContent = `COMPARTMENT (${failedSubjectsCount} Sub)`;
    statusEl.className = "fail-text";
  }
  
  lucide.createIcons();
}

// 12.2 Class Consolidated Report Tab
function setupClassReportSelector() {
  const select = document.getElementById('report-class-select');
  select.value = '';
  
  document.getElementById('class-report-container').classList.add('hidden');
  document.getElementById('class-report-empty-state').classList.remove('hidden');
  document.getElementById('btn-pdf-class-report').disabled = true;
  document.getElementById('btn-excel-class-report').disabled = true;
  
  const newSelect = select.cloneNode(true);
  select.parentNode.replaceChild(newSelect, select);
  
  newSelect.addEventListener('change', () => {
    const clsName = newSelect.value;
    if (clsName) {
      generateClassReport(clsName);
    } else {
      document.getElementById('class-report-container').classList.add('hidden');
      document.getElementById('class-report-empty-state').classList.remove('hidden');
      document.getElementById('btn-pdf-class-report').disabled = true;
      document.getElementById('btn-excel-class-report').disabled = true;
    }
  });
}

function generateClassReport(className) {
  document.getElementById('class-report-empty-state').classList.add('hidden');
  document.getElementById('class-report-container').classList.remove('hidden');
  document.getElementById('btn-pdf-class-report').disabled = false;
  document.getElementById('btn-excel-class-report').disabled = false;
  
  document.getElementById('class-report-title').textContent = `CLASS REPORT - ${className.toUpperCase()}`;
  
  const classStudents = state.students.filter(s => s.class === className);
  document.getElementById('class-rep-student-count').textContent = classStudents.length;
  
  const table = document.getElementById('class-report-table');
  
  let headerHtml = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Student Name</th>
  `;
  state.subjects.forEach(sub => {
    headerHtml += `<th class="text-center">${sub}</th>`;
  });
  headerHtml += `
        <th class="text-center">Total</th>
        <th class="text-center">Avg %</th>
        <th class="text-center">Status</th>
      </tr>
    </thead>
  `;
  
  let tbodyHtml = '<tbody id="class-report-table-body">';
  
  let classTotalSum = 0;
  let totalMaxScore = 0;
  let passedStudents = 0;
  
  if (classStudents.length === 0) {
    tbodyHtml += `<tr><td colspan="${state.subjects.length + 5}" class="text-center">No student records in this class.</td></tr>`;
  } else {
    classStudents.forEach(s => {
      tbodyHtml += `
        <tr>
          <td><strong>${s.studentId}</strong></td>
          <td>${s.name}</td>
      `;
      
      let studentTotal = 0;
      let failedSubjects = 0;
      
      state.subjects.forEach(sub => {
        const sData = s.subjects?.[sub] || { ceConverted: 0, TE: 0 };
        const total = (sData.ceConverted || 0) + (sData.TE || 0);
        studentTotal += total;
        
        const isSubjectPass = (sData.TE || 0) >= 15 && total >= 24;
        if (!isSubjectPass) failedSubjects++;
        
        tbodyHtml += `<td class="text-center">${total.toFixed(1)}</td>`;
      });
      
      const maxScore = state.subjects.length * 60;
      const avgPct = (studentTotal / maxScore) * 100;
      
      classTotalSum += studentTotal;
      totalMaxScore += maxScore;
      
      const isPass = failedSubjects === 0 && avgPct >= 40;
      if (isPass) passedStudents++;
      
      tbodyHtml += `
        <td class="text-center" style="font-weight:600;">${studentTotal.toFixed(1)}</td>
        <td class="text-center">${avgPct.toFixed(1)}%</td>
        <td class="text-center ${isPass ? 'pass-text' : 'fail-text'}">${isPass ? 'PASS' : 'FAIL'}</td>
      </tr>
      `;
    });
  }
  
  tbodyHtml += '</tbody>';
  table.innerHTML = headerHtml + tbodyHtml;
  
  const classAvgPct = classStudents.length > 0 ? (classTotalSum / totalMaxScore) * 100 : 0;
  const passRate = classStudents.length > 0 ? (passedStudents / classStudents.length) * 100 : 0;
  
  document.getElementById('class-rep-class-avg').textContent = `${classAvgPct.toFixed(1)}%`;
  document.getElementById('class-rep-pass-rate').textContent = `${passRate.toFixed(1)}%`;
}

// 12.3 Subject Specific Report Tab
function setupSubjectReportSelectors() {
  const classSelect = document.getElementById('report-sub-select-class');
  const subjectSelect = document.getElementById('report-sub-select-subject');
  
  classSelect.value = '';
  subjectSelect.innerHTML = `<option value="">-- Choose Subject --</option>`;
  subjectSelect.disabled = true;
  
  document.getElementById('subject-report-container').classList.add('hidden');
  document.getElementById('subject-report-empty-state').classList.remove('hidden');
  document.getElementById('btn-pdf-subject-report').disabled = true;
  document.getElementById('btn-excel-subject-report').disabled = true;
  
  const newClassSelect = classSelect.cloneNode(true);
  classSelect.parentNode.replaceChild(newClassSelect, classSelect);
  
  const newSubjectSelect = subjectSelect.cloneNode(true);
  subjectSelect.parentNode.replaceChild(newSubjectSelect, subjectSelect);
  
  newClassSelect.addEventListener('change', () => {
    const clsName = newClassSelect.value;
    newSubjectSelect.innerHTML = `<option value="">-- Choose Subject --</option>`;
    
    if (clsName) {
      newSubjectSelect.disabled = false;
      state.subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        newSubjectSelect.appendChild(opt);
      });
    } else {
      newSubjectSelect.disabled = true;
      document.getElementById('subject-report-container').classList.add('hidden');
      document.getElementById('subject-report-empty-state').classList.remove('hidden');
      document.getElementById('btn-pdf-subject-report').disabled = true;
      document.getElementById('btn-excel-subject-report').disabled = true;
    }
  });
  
  newSubjectSelect.addEventListener('change', () => {
    const clsName = newClassSelect.value;
    const subName = newSubjectSelect.value;
    if (clsName && subName) {
      generateSubjectReport(clsName, subName);
    } else {
      document.getElementById('subject-report-container').classList.add('hidden');
      document.getElementById('subject-report-empty-state').classList.remove('hidden');
      document.getElementById('btn-pdf-subject-report').disabled = true;
      document.getElementById('btn-excel-subject-report').disabled = true;
    }
  });
}

function generateSubjectReport(className, subjectName) {
  document.getElementById('subject-report-empty-state').classList.add('hidden');
  document.getElementById('subject-report-container').classList.remove('hidden');
  document.getElementById('btn-pdf-subject-report').disabled = false;
  document.getElementById('btn-excel-subject-report').disabled = false;
  
  document.getElementById('subject-report-title').textContent = `SUBJECT REPORT: ${subjectName.toUpperCase()}`;
  document.getElementById('subject-report-subtitle').textContent = `${className} | Continuous Evaluation & Exam Analysis`;
  
  const classStudents = state.students.filter(s => s.class === className);
  const tbody = document.getElementById('subject-report-table-body');
  tbody.innerHTML = '';
  
  if (classStudents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No students in this class.</td></tr>`;
    document.getElementById('sub-rep-avg').textContent = '0.0';
    document.getElementById('sub-rep-high').textContent = '0.0';
    document.getElementById('sub-rep-low').textContent = '0.0';
    return;
  }
  
  let scoreSum = 0;
  let highestScore = -1;
  let lowestScore = 999;
  
  classStudents.forEach(s => {
    const sData = s.subjects?.[subjectName] || { ceTotal: 0, ceConverted: 0, TE: 0 };
    const ceTotal = sData.ceTotal || 0;
    const ceConverted = sData.ceConverted || 0;
    const te = sData.TE || 0;
    const total = ceConverted + te;
    const pct = (total / 60) * 100;
    
    scoreSum += total;
    if (total > highestScore) highestScore = total;
    if (total < lowestScore) lowestScore = total;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.studentId}</strong></td>
      <td>${s.name}</td>
      <td class="text-center">${ceTotal}</td>
      <td class="text-center">${ceConverted.toFixed(1)}</td>
      <td class="text-center">${te}</td>
      <td class="text-center" style="font-weight:600;">${total.toFixed(1)}</td>
      <td class="text-center">${pct.toFixed(1)}%</td>
    `;
    tbody.appendChild(tr);
  });
  
  const classAvg = scoreSum / classStudents.length;
  document.getElementById('sub-rep-avg').textContent = classAvg.toFixed(1);
  document.getElementById('sub-rep-high').textContent = highestScore.toFixed(1);
  document.getElementById('sub-rep-low').textContent = lowestScore === 999 ? '0.0' : lowestScore.toFixed(1);
}

// 12.4 Rank List Leaderboard Tab
function setupRankReportSelector() {
  const select = document.getElementById('report-rank-select-class');
  select.value = '';
  
  document.getElementById('rank-report-container').classList.add('hidden');
  document.getElementById('rank-report-empty-state').classList.remove('hidden');
  document.getElementById('btn-pdf-rank-report').disabled = true;
  document.getElementById('btn-excel-rank-report').disabled = true;
  
  const newSelect = select.cloneNode(true);
  select.parentNode.replaceChild(newSelect, select);
  
  newSelect.addEventListener('change', () => {
    const clsName = newSelect.value;
    if (clsName) {
      generateRankReport(clsName);
    } else {
      document.getElementById('rank-report-container').classList.add('hidden');
      document.getElementById('rank-report-empty-state').classList.remove('hidden');
      document.getElementById('btn-pdf-rank-report').disabled = true;
      document.getElementById('btn-excel-rank-report').disabled = true;
    }
  });
}

function generateRankReport(className) {
  document.getElementById('rank-report-empty-state').classList.add('hidden');
  document.getElementById('rank-report-container').classList.remove('hidden');
  document.getElementById('btn-pdf-rank-report').disabled = false;
  document.getElementById('btn-excel-rank-report').disabled = false;
  
  document.getElementById('rank-report-title').textContent = `ACADEMIC RANK LIST - ${className.toUpperCase()}`;
  
  const classStudents = state.students.filter(s => s.class === className);
  
  const rankedStudents = classStudents.map(s => {
    let totalCEConverted = 0;
    let totalTE = 0;
    
    state.subjects.forEach(sub => {
      const sData = s.subjects?.[sub] || { ceConverted: 0, TE: 0 };
      totalCEConverted += sData.ceConverted || 0;
      totalTE += sData.TE || 0;
    });
    
    const cumulative = totalCEConverted + totalTE;
    const maxScore = state.subjects.length * 60;
    const overallPct = (cumulative / maxScore) * 100;
    
    return {
      studentId: s.studentId,
      name: s.name,
      totalCEConverted,
      totalTE,
      cumulative,
      overallPct
    };
  }).sort((a, b) => b.cumulative - a.cumulative);
  
  const podiumContainer = document.getElementById('podium-container');
  podiumContainer.innerHTML = '';
  
  if (rankedStudents.length >= 3) {
    const podiumData = [
      { stepClass: 'second', rank: 2, student: rankedStudents[1] },
      { stepClass: 'first', rank: 1, student: rankedStudents[0] },
      { stepClass: 'third', rank: 3, student: rankedStudents[2] }
    ];
    
    podiumData.forEach(p => {
      const step = document.createElement('div');
      step.className = `podium-step ${p.stepClass}`;
      
      const initials = p.student.name.split(' ').map(n => n[0]).join('');
      
      step.innerHTML = `
        <div class="avatar">${initials}</div>
        <div class="name">${p.student.name}</div>
        <div class="score">${p.student.cumulative.toFixed(1)} Pts</div>
        <div class="podium-pillar">${p.rank}</div>
      `;
      podiumContainer.appendChild(step);
    });
    podiumContainer.style.display = 'flex';
  } else {
    podiumContainer.style.display = 'none';
  }
  
  const tbody = document.getElementById('rank-table-body');
  tbody.innerHTML = '';
  
  if (rankedStudents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No student records.</td></tr>`;
    return;
  }
  
  rankedStudents.forEach((s, index) => {
    const rank = index + 1;
    let rankBadgeClass = 'rank-badge-other';
    if (rank === 1) rankBadgeClass = 'rank-badge-1';
    if (rank === 2) rankBadgeClass = 'rank-badge-2';
    if (rank === 3) rankBadgeClass = 'rank-badge-3';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center">
        <span class="rank-badge-item ${rankBadgeClass}">${rank}</span>
      </td>
      <td><strong>${s.studentId}</strong></td>
      <td>${s.name}</td>
      <td class="text-center">${s.totalCEConverted.toFixed(1)}</td>
      <td class="text-center">${s.totalTE}</td>
      <td class="text-center" style="font-weight:700; color:var(--color-primary);">${s.cumulative.toFixed(1)}</td>
      <td class="text-center">${s.overallPct.toFixed(1)}%</td>
    `;
    tbody.appendChild(tr);
  });
}

// --------------------------------------------------------------------------
// 13. Student Public Portal View
// --------------------------------------------------------------------------
function loadStudentPublicPortal(studentId) {
  const student = state.students.find(s => s.studentId.toUpperCase() === studentId.toUpperCase());
  if (!student) {
    showToast('error', `Student ID ${studentId} not found.`);
    return;
  }
  
  switchView('view-student-portal');
  
  document.getElementById('portal-student-welcome-name').textContent = student.name;
  document.getElementById('portal-student-name').textContent = student.name;
  document.getElementById('portal-student-id').textContent = student.studentId;
  document.getElementById('portal-student-class').textContent = student.class;
  
  const tbody = document.getElementById('portal-student-marks-body');
  tbody.innerHTML = '';
  
  let grandTotalScore = 0;
  let maxPossibleScore = 0;
  let failedSubjectsCount = 0;
  
  state.subjects.forEach(sub => {
    const sData = student.subjects?.[sub] || { ceConverted: 0, TE: 0 };
    const ce = sData.ceConverted || 0;
    const te = sData.TE || 0;
    const total = ce + te;
    const percentage = (total / 60) * 100;
    
    grandTotalScore += total;
    maxPossibleScore += 60;
    
    const isPass = te >= 15 && total >= 24;
    if (!isPass) failedSubjectsCount++;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${sub}</strong></td>
      <td class="text-center">${ce.toFixed(1)}</td>
      <td class="text-center">${te}</td>
      <td class="text-center" style="font-weight:600;">${total.toFixed(1)}</td>
      <td class="text-center">${percentage.toFixed(1)}%</td>
      <td class="text-center ${isPass ? 'pass-text' : 'fail-text'}">${isPass ? 'PASS' : 'FAIL'}</td>
    `;
    tbody.appendChild(tr);
  });
  
  const overallPct = (grandTotalScore / maxPossibleScore) * 100;
  document.getElementById('portal-student-grand-total').textContent = `${grandTotalScore.toFixed(1)} / ${maxPossibleScore}`;
  document.getElementById('portal-student-overall-percentage').textContent = `${overallPct.toFixed(1)}%`;
  
  const statusEl = document.getElementById('portal-student-overall-status');
  if (failedSubjectsCount === 0 && overallPct >= 40) {
    statusEl.textContent = "PASS";
    statusEl.className = "pass-text";
  } else {
    statusEl.textContent = `COMPARTMENT (${failedSubjectsCount} Sub)`;
    statusEl.className = "fail-text";
  }
}

// --------------------------------------------------------------------------
// 14. Export Utilities (PDF and Excel/CSV downloads)
// --------------------------------------------------------------------------
function exportElementToPDF(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  showToast('info', 'Generating PDF... Please wait.');
  
  const opt = {
    margin:       0.5,
    filename:     `${filename}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save().then(() => {
    showToast('success', 'PDF exported successfully!');
  }).catch(err => {
    console.error(err);
    showToast('error', 'Failed to generate PDF.');
  });
}

function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  let csv = [];
  const rows = table.querySelectorAll('tr');
  
  for (let i = 0; i < rows.length; i++) {
    let row = [];
    const cols = rows[i].querySelectorAll('td, th');
    
    for (let j = 0; j < cols.length; j++) {
      let text = cols[j].textContent.trim().replace(/(\r\n|\n|\r)/gm, "");
      text = text.replace(/"/g, '""');
      row.push('"' + text + '"');
    }
    csv.push(row.join(','));
  }
  
  const csvString = csv.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  
  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, `${filename}.csv`);
  } else {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  showToast('success', 'CSV Excel spreadsheet exported successfully.');
}

// --------------------------------------------------------------------------
// 15. Database Configurations & Settings Modals
// --------------------------------------------------------------------------
function setupDatabaseModal() {
  const modal = document.getElementById('modal-db-config');
  const form = document.getElementById('form-db-config');
  
  const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (saved) {
    const config = JSON.parse(saved);
    document.getElementById('fb-apiKey').value = config.apiKey || '';
    document.getElementById('fb-authDomain').value = config.authDomain || '';
    document.getElementById('fb-projectId').value = config.projectId || '';
    document.getElementById('fb-storageBucket').value = config.storageBucket || '';
    document.getElementById('fb-messagingSenderId').value = config.messagingSenderId || '';
    document.getElementById('fb-appId').value = config.appId || '';
  }
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const config = {
      apiKey: document.getElementById('fb-apiKey').value.trim(),
      authDomain: document.getElementById('fb-authDomain').value.trim(),
      projectId: document.getElementById('fb-projectId').value.trim(),
      storageBucket: document.getElementById('fb-storageBucket').value.trim(),
      messagingSenderId: document.getElementById('fb-messagingSenderId').value.trim(),
      appId: document.getElementById('fb-appId').value.trim()
    };
    
    if (config.apiKey && config.projectId) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      localStorage.setItem(DB_MODE_KEY, 'firebase');
      showToast('info', 'Firebase configuration saved. Reloading app to connect...');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showToast('error', 'API Key and Project ID are required to connect.');
    }
  });
  
  document.getElementById('btn-clear-db-config').addEventListener('click', () => {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    localStorage.setItem(DB_MODE_KEY, 'mock');
    showToast('info', 'Cleared Firebase config. Reverting to local Mock Mode...');
    setTimeout(() => window.location.reload(), 1500);
  });
}

// --------------------------------------------------------------------------
// 16. Theme Toggler
// --------------------------------------------------------------------------
function setupThemeToggler() {
  const btn = document.getElementById('btn-theme-toggle');
  
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  state.theme = savedTheme;
  
  btn.addEventListener('click', () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    state.theme = newTheme;
    localStorage.setItem('theme', newTheme);
  });
}

// --------------------------------------------------------------------------
// 17. Bind Main Events (DOM Loaded Initialization)
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  setupThemeToggler();
  db.init();
  
  // 1. Load subjects dynamically first, then other entities
  await db.getSubjects();
  await db.getTeachers();
  await db.getStudents();
  
  setupDatabaseModal();
  
  document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    handleLogin(email, pass);
  });
  
  document.getElementById('form-student-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const stId = document.getElementById('student-search-id').value.trim();
    loadStudentPublicPortal(stId);
  });
  
  document.getElementById('nav-admin-home').addEventListener('click', (e) => { e.preventDefault(); switchView('view-admin-home'); });
  document.getElementById('nav-admin-teachers').addEventListener('click', (e) => { e.preventDefault(); switchView('view-admin-teachers'); });
  document.getElementById('nav-admin-students').addEventListener('click', (e) => { e.preventDefault(); switchView('view-admin-students'); });
  document.getElementById('nav-teacher-home').addEventListener('click', (e) => { e.preventDefault(); switchView('view-teacher-home'); });
  document.getElementById('nav-teacher-marks').addEventListener('click', (e) => { e.preventDefault(); switchView('view-teacher-marks'); });
  document.getElementById('nav-reports').addEventListener('click', (e) => { e.preventDefault(); switchView('view-reports'); });
  
  document.getElementById('btn-sidebar-open').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.add('active');
  });
  document.getElementById('btn-sidebar-close').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('active');
  });
  
  document.getElementById('btn-logout').addEventListener('click', handleLogout);
  document.getElementById('btn-student-portal-exit').addEventListener('click', () => {
    switchView('view-login');
  });
  
  document.getElementById('btn-add-teacher').addEventListener('click', () => openTeacherModal());
  document.getElementById('btn-add-student').addEventListener('click', () => openStudentModal());
  
  // Subject Quick Add triggers modal
  document.getElementById('btn-quick-add-subject').addEventListener('click', () => {
    document.getElementById('modal-subject').classList.remove('hidden');
    document.getElementById('subject-name-field').value = '';
    lucide.createIcons();
  });
  
  // Add Subject Form Submit
  document.getElementById('form-subject').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subName = document.getElementById('subject-name-field').value;
    try {
      await db.addSubject(subName);
      showToast('success', `Subject "${subName}" added to system database successfully.`);
      document.getElementById('modal-subject').classList.add('hidden');
      
      // Update UI and refresh student list
      await db.getStudents();
      if (state.activeView === 'view-admin-home') {
        renderAdminDashboard();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  });
  
  const openDbModalBtns = [document.getElementById('btn-open-db-config-login'), document.getElementById('btn-open-db-config')];
  openDbModalBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => {
      document.getElementById('modal-db-config').classList.remove('hidden');
      lucide.createIcons();
    });
  });
  
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay').classList.add('hidden');
    });
  });
  
  document.getElementById('btn-quick-add-student').addEventListener('click', () => openStudentModal());
  document.getElementById('btn-quick-add-teacher').addEventListener('click', () => openTeacherModal());
  document.getElementById('btn-quick-view-reports').addEventListener('click', () => {
    switchView('view-reports');
  });
  
  document.getElementById('btn-seed-database').addEventListener('click', async () => {
    if (confirm("Are you sure you want to seed the database? This will clear all existing custom edits and overwrite with fresh sample data.")) {
      if (state.dbMode === 'firebase') {
        await db.seedFirebaseDatabase();
      } else {
        db.seedMockDatabase();
        showToast('success', 'Mock database successfully seeded with 10 teachers and 93 students!');
        renderAdminDashboard();
      }
    }
  });
  
  const repBtns = [
    { btnId: 'btn-rep-tab-student', paneId: 'report-student' },
    { btnId: 'btn-rep-tab-class', paneId: 'report-class' },
    { btnId: 'btn-rep-tab-subject', paneId: 'report-subject' },
    { btnId: 'btn-rep-tab-rank', paneId: 'report-rank' }
  ];
  
  repBtns.forEach(config => {
    const btn = document.getElementById(config.btnId);
    if (btn) {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.reports-tabs-bar .report-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeReportTab = config.paneId;
        renderActiveReportTab();
      });
    }
  });
  
  document.getElementById('search-teachers').addEventListener('input', (e) => {
    teacherSearchQuery = e.target.value;
    renderTeachersTable();
  });
  
  document.getElementById('search-students').addEventListener('input', (e) => {
    studentSearchQuery = e.target.value;
    studentCurrentPage = 1;
    renderStudentsTable();
  });
  
  document.getElementById('filter-student-class').addEventListener('change', (e) => {
    studentFilterClass = e.target.value;
    studentCurrentPage = 1;
    renderStudentsTable();
  });
  
  document.getElementById('btn-print-student-report').addEventListener('click', () => {
    const stId = document.getElementById('report-student-search').value;
    exportElementToPDF('printable-student-card', `ReportCard_${stId}`);
  });
  
  document.getElementById('btn-pdf-student-portal').addEventListener('click', () => {
    const stId = document.getElementById('portal-student-id').textContent;
    exportElementToPDF('portal-student-printable-card', `ReportCard_${stId}`);
  });
  
  document.getElementById('btn-pdf-class-report').addEventListener('click', () => {
    const cls = document.getElementById('report-class-select').value;
    exportElementToPDF('printable-class-report', `ClassReport_${cls.replace(' ', '')}`);
  });
  document.getElementById('btn-excel-class-report').addEventListener('click', () => {
    const cls = document.getElementById('report-class-select').value;
    exportTableToCSV('class-report-table', `ClassReportConsolidated_${cls.replace(' ', '')}`);
  });
  
  document.getElementById('btn-pdf-subject-report').addEventListener('click', () => {
    const cls = document.getElementById('report-sub-select-class').value;
    const sub = document.getElementById('report-sub-select-subject').value;
    exportElementToPDF('printable-subject-report', `SubjectReport_${cls.replace(' ', '')}_${sub}`);
  });
  document.getElementById('btn-excel-subject-report').addEventListener('click', () => {
    const cls = document.getElementById('report-sub-select-class').value;
    const sub = document.getElementById('report-sub-select-subject').value;
    exportTableToCSV('subject-report-table', `SubjectReport_${cls.replace(' ', '')}_${sub}`);
  });
  
  document.getElementById('btn-pdf-rank-report').addEventListener('click', () => {
    const cls = document.getElementById('report-rank-select-class').value;
    exportElementToPDF('printable-rank-report', `RankList_${cls.replace(' ', '')}`);
  });
  document.getElementById('btn-excel-rank-report').addEventListener('click', () => {
    const cls = document.getElementById('report-rank-select-class').value;
    exportTableToCSV('printable-rank-report', `RankList_${cls.replace(' ', '')}`);
  });
  
  lucide.createIcons();
});
