/**
 * ==========================================================================
 * EDUMARK - CORE APPLICATION LOGIC (FIREBASE ONLY)
 * Features: SPA Router, Firebase Storage/Auth, Seeding,
 * Real-Time Calculations, Permissions, and Reporting/Exporting
 * ==========================================================================
 */

// --------------------------------------------------------------------------
// 1. Core State & Constants
// --------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBfVVVr4aPY3MZJrf9bFb6cdolNUKWLPxE",
  authDomain: "dqia-mark-entry.firebaseapp.com",
  projectId: "dqia-mark-entry",
  storageBucket: "dqia-mark-entry.firebasestorage.app",
  messagingSenderId: "7443281933",
  appId: "1:7443281933:web:57c7f666dd376d39c97d44"
};

const DEFAULT_SUBJECTS = ["Arabic", "English", "Quran", "Malayalam", "Mathematics", "Science"];
const DEFAULT_CLASSES = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"];
const MONTHS = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];

const state = {
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
// 2. Data Definitions & Seeding Engine (For Firebase Initialization)
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

const CLASS_DISTRIBUTION_TARGETS = {
  "Class 1": 16, "Class 2": 8, "Class 3": 11, "Class 4": 11, 
  "Class 5": 14, "Class 6": 11, "Class 7": 11, "Class 8": 11
};

const FIRST_NAMES = ["Ahmad", "Fatima", "Zayd", "Maryam", "Omar", "Khadija", "Yusuf", "Aisha", "Bilal", "Safiya", "Hamza", "Zainab", "Ali", "Hana", "Ibrahim", "Sara", "Mustafa", "Ruqayya", "Yahya", "Hajar", "Sufyan", "Sumayya", "Anas", "Asma", "Imran", "Nour", "Tariq", "Layla", "Khalid", "Huda"];
const LAST_NAMES = ["Khan", "Ali", "Syed", "Hassan", "Ahmed", "Rahman", "Malik", "Sheikh", "Farook", "Abdullah", "Shaikh", "Patel", "Hussein", "Qureshi", "Begum"];

function generateRandomMarks() {
  const subjectsData = {};
  state.subjects.forEach(sub => {
    const ce = {};
    let ceTotal = 0;
    MONTHS.forEach(m => {
      const score = Math.floor(Math.random() * 4) + 7; // 7, 8, 9, 10
      ce[m] = score;
      ceTotal += score;
    });
    const ceConverted = parseFloat((ceTotal / 10).toFixed(1));
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
      
      students.push({
        studentId: studentId,
        name: `${fName} ${lName}`,
        class: className,
        subjects: generateRandomMarks()
      });
      globalIdCounter++;
    }
  });
  return students;
}

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
// 3. Database Driver (Firebase Only)
// --------------------------------------------------------------------------
const db = {
  init: function() {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      state.firebaseInitialized = true;
      this.updateStatusBadge();
      console.log('Connected to Firebase.');
    } catch (e) {
      console.error("Firebase init failed.", e);
      showToast('error', 'Firebase connection failed. Check console for details.');
    }
  },

  updateStatusBadge: function() {
    const indicators = [document.getElementById('db-indicator-login'), document.getElementById('db-indicator-header')];
    indicators.forEach(ind => {
      if (!ind) return;
      if (state.firebaseInitialized) {
        ind.className = 'db-badge firebase';
        ind.querySelector('.status-text').textContent = 'Firebase Live';
      }
    });
  },

  // Subjects Queries
  getSubjects: async function() {
    if (!state.firebaseInitialized) return DEFAULT_SUBJECTS;
    try {
      const doc = await firebase.firestore().collection('settings').doc('subjects').get();
      if (doc.exists && doc.data().list) {
        state.subjects = doc.data().list;
      } else {
        await firebase.firestore().collection('settings').doc('subjects').set({ list: DEFAULT_SUBJECTS });
        state.subjects = [...DEFAULT_SUBJECTS];
      }
      return state.subjects;
    } catch (e) {
      console.error("Failed to fetch Firestore subjects", e);
      state.subjects = [...DEFAULT_SUBJECTS];
      return state.subjects;
    }
  },

  addSubject: async function(subjectName) {
    if (!state.firebaseInitialized) throw new Error("Firebase not connected.");
    const current = await this.getSubjects();
    
    const trimmed = subjectName.trim();
    if (!trimmed) throw new Error("Subject name cannot be empty.");
    if (current.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Subject "${trimmed}" already exists.`);
    }
    
    current.push(trimmed);
    state.subjects = current;
    
    await firebase.firestore().collection('settings').doc('subjects').set({ list: current });
    
    // Update existing student docs
    const snapshot = await firebase.firestore().collection('students').get();
    for (const doc of snapshot.docs) {
      const studentData = doc.data();
      if (!studentData.subjects) studentData.subjects = {};
      if (!studentData.subjects[trimmed]) {
        studentData.subjects[trimmed] = { CE: {}, ceTotal: 0, ceConverted: 0.0, TE: 0 };
        MONTHS.forEach(m => studentData.subjects[trimmed].CE[m] = 0);
        await doc.ref.update({ subjects: studentData.subjects });
      }
    }
    return current;
  },

  // Teachers Queries
  getTeachers: async function() {
    if (!state.firebaseInitialized) return [];
    const snapshot = await firebase.firestore().collection('teachers').get();
    const teachers = [];
    snapshot.forEach(doc => {
      teachers.push({ id: doc.id, ...doc.data() });
    });
    state.teachers = teachers;
    return teachers;
  },

  saveTeacher: async function(teacher) {
    if (!state.firebaseInitialized) throw new Error("Firebase not connected.");
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
  },

  deleteTeacher: async function(teacherId) {
    if (!state.firebaseInitialized) return;
    await firebase.firestore().collection('teachers').doc(teacherId).delete();
    await this.getTeachers();
  },

  // Students Queries
  getStudents: async function() {
    if (!state.firebaseInitialized) return [];
    const snapshot = await firebase.firestore().collection('students').orderBy('studentId').get();
    const students = [];
    snapshot.forEach(doc => {
      students.push({ id: doc.id, ...doc.data() });
    });
    state.students = students;
    return students;
  },

  saveStudent: async function(student) {
    if (!state.firebaseInitialized) throw new Error("Firebase not connected.");
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
  },

  deleteStudent: async function(studentId) {
    if (!state.firebaseInitialized) return;
    const snapshot = await firebase.firestore().collection('students').where('studentId', '==', studentId).get();
    for (const doc of snapshot.docs) {
      await firebase.firestore().collection('students').doc(doc.id).delete();
    }
    await this.getStudents();
  },

  saveStudentMarks: async function(studentId, subjectName, marksData) {
    if (!state.firebaseInitialized) throw new Error("Firebase not connected.");
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
  },

  // Seeding Helper
  seedFirebaseDatabase: async function() {
    if (!state.firebaseInitialized) {
      showToast('error', 'Cannot seed: Firebase not connected.');
      return;
    }
    showToast('info', 'Seeding live Firebase database... Please wait.');
    try {
      const firestore = firebase.firestore();
      
      // Clear existing first
      const teachersSnap = await firestore.collection('teachers').get();
      for (const doc of teachersSnap.docs) await doc.ref.delete();
      
      const studentsSnap = await firestore.collection('students').get();
      for (const doc of studentsSnap.docs) await doc.ref.delete();
      
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
  if(window.lucide) lucide.createIcons({ attrs: { class: 'toast-icon-svg' } });
  
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
    'view-login', 'view-admin-home', 'view-admin-teachers', 
    'view-admin-students', 'view-teacher-home', 'view-teacher-marks',
    'view-reports', 'view-student-portal'
  ];
  
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.classList.add('hidden');
  });
  
  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.remove('hidden');
  
  state.activeView = viewId;
  
  const layout = document.getElementById('main-dashboard-layout');
  if (viewId === 'view-login' || viewId === 'view-student-portal') {
    layout.classList.add('hidden');
  } else {
    layout.classList.remove('hidden');
    const sidebar = document.querySelector('.sidebar');
    if(sidebar) sidebar.classList.remove('active');
  }
  
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  let headerTitle = "Dashboard";
  
  if (viewId === 'view-admin-home') {
    document.getElementById('nav-admin-home')?.classList.add('active');
    headerTitle = "Admin Console";
    renderAdminDashboard();
  } else if (viewId === 'view-admin-teachers') {
    document.getElementById('nav-admin-teachers')?.classList.add('active');
    headerTitle = "Manage Teachers";
    renderTeachersTable();
  } else if (viewId === 'view-admin-students') {
    document.getElementById('nav-admin-students')?.classList.add('active');
    headerTitle = "Manage Students";
    renderStudentsTable();
  } else if (viewId === 'view-teacher-home') {
    document.getElementById('nav-teacher-home')?.classList.add('active');
    headerTitle = "Teacher Classrooms";
    renderTeacherClasses();
  } else if (viewId === 'view-teacher-marks') {
    document.getElementById('nav-teacher-marks')?.classList.add('active');
    headerTitle = "Continuous Evaluation Matrix";
    setupMarksEntrySelectors();
  } else if (viewId === 'view-reports') {
    document.getElementById('nav-reports')?.classList.add('active');
    headerTitle = "Reports & Consolidated Sheets";
    renderActiveReportTab();
  }
  
  const headerViewTitle = document.getElementById('header-view-title');
  if(headerViewTitle) headerViewTitle.textContent = headerTitle;
  if(window.lucide) lucide.createIcons();
}

// --------------------------------------------------------------------------
// 6. Authentication Controller
// --------------------------------------------------------------------------
async function handleLogin(email, password) {
  const submitBtn = document.getElementById('btn-submit-login');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Verifying...</span>';
  
  try {
    // Admin Override Check
    if (email === 'admin@school.com' && password === 'admin123') {
      state.currentUser = { email: email, role: 'admin', name: 'Administrator', uid: 'admin_uid' };
      setupUserSession();
      showToast('success', 'Logged in successfully as Administrator.');
      switchView('view-admin-home');
      return;
    } else if (email === 'admin@school.com') {
      throw new Error("Invalid password for Admin.");
    }
    
    // Teacher Login (Firebase Auth)
    if (!state.firebaseInitialized) throw new Error("Firebase Auth is not initialized.");
    
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const teachers = await db.getTeachers();
    const teacherData = teachers.find(t => t.email.toLowerCase() === email.toLowerCase()) || { name: "Teacher", email: email };
    
    state.currentUser = {
      email: userCredential.user.email,
      role: 'teacher',
      name: teacherData.name,
      uid: userCredential.user.uid,
      teacherData: teacherData
    };
    
    setupUserSession();
    showToast('success', `Welcome back, ${state.currentUser.name}!`);
    switchView('view-teacher-home');

  } catch (error) {
    showToast('error', error.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Log In</span><i data-lucide="arrow-right"></i>';
    if(window.lucide) lucide.createIcons();
  }
}

function setupUserSession() {
  const u = state.currentUser;
  if(document.getElementById('header-user-display')) document.getElementById('header-user-display').textContent = u.email;
  if(document.getElementById('sidebar-user-name')) document.getElementById('sidebar-user-name').textContent = u.name;
  if(document.getElementById('sidebar-user-role')) document.getElementById('sidebar-user-role').textContent = u.role === 'admin' ? 'System Administrator' : 'Academic Staff';
  if(document.getElementById('sidebar-user-avatar')) document.getElementById('sidebar-user-avatar').textContent = u.name.charAt(0);
  
  const navAdmin = document.getElementById('nav-group-admin');
  const navTeacher = document.getElementById('nav-group-teacher');
  
  if (u.role === 'admin') {
    if(navAdmin) navAdmin.classList.remove('hidden');
    if(navTeacher) navTeacher.classList.add('hidden');
  } else {
    if(navAdmin) navAdmin.classList.add('hidden');
    if(navTeacher) navTeacher.classList.remove('hidden');
  }
  
  if(document.getElementById('form-login')) document.getElementById('form-login').reset();
}

function handleLogout() {
  if (state.firebaseInitialized) {
    firebase.auth().signOut().catch(console.error);
  }
  state.currentUser = null;
  showToast('info', 'Logged out successfully.');
  
  const submitBtn = document.getElementById('btn-submit-login');
  if(submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Log In</span><i data-lucide="arrow-right"></i>';
  }
  
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
    
    const classesBadges = (t.classes||[]).map(c => `<span class="badge badge-class">${c}</span>`).join('');
    const subjectsBadges = (t.subjects||[]).map(s => `<span class="badge badge-subject">${s}</span>`).join('');
    
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
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openTeacherModal(id);
    });
  });
  
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const teacherName = state.teachers.find(t => t.id === id)?.name;
      if (confirm(`Are you sure you want to delete teacher "${teacherName}"?`)) {
        await db.deleteTeacher(id);
        showToast('success', 'Teacher deleted successfully.');
        renderTeachersTable();
      }
    });
  });
  
  if(window.lucide) lucide.createIcons();
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
  
  renderTeacherSubjectsChecklist();
  modal.querySelectorAll('input[type="checkbox"]').forEach(box => box.checked = false);
  
  if (teacherId) {
    title.textContent = "Edit Teacher Record";
    const t = state.teachers.find(teacher => teacher.id === teacherId);
    if (t) {
      document.getElementById('teacher-form-id').value = t.id;
      document.getElementById('teacher-name').value = t.name;
      document.getElementById('teacher-email').value = t.email;
      passGroup.classList.add('hidden');
      
      (t.classes||[]).forEach(c => {
        const box = modal.querySelector(`input[value="${c}"]`);
        if (box) box.checked = true;
      });
      (t.subjects||[]).forEach(s => {
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
  if(window.lucide) lucide.createIcons();
}

document.getElementById('form-teacher')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('teacher-form-id').value;
  const name = document.getElementById('teacher-name').value;
  const email = document.getElementById('teacher-email').value;
  const password = document.getElementById('teacher-password').value; // Optional usage for Firebase Admin SDK if creating users
  
  const classes = [];
  document.getElementById('teacher-classes-checklist').querySelectorAll('input[type="checkbox"]:checked').forEach(box => classes.push(box.value));
  
  const subjects = [];
  document.getElementById('teacher-subjects-checklist').querySelectorAll('input[type="checkbox"]:checked').forEach(box => subjects.push(box.value));
  
  if (classes.length === 0 || subjects.length === 0) {
    showToast('error', 'Please assign at least one class and one subject.');
    return;
  }
  
  const teacherData = { name, email, classes, subjects };
  if (id) teacherData.id = id;
  
  try {
    // Note: To register auth credentials securely, a backend Firebase Admin SDK is typically required.
    // For this client side logic, we save the document in Firestore.
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
          <span style="font-size:0.8rem; color:var(--text-secondary);">Showing ${startIdx + 1}-${Math.min(startIdx + studentPageSize, filtered.length)} of ${filtered.length}</span>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" id="btn-page-prev" ${studentCurrentPage === 1 ? 'disabled' : ''}>Previous</button>
            <button class="btn btn-secondary btn-sm" id="btn-page-next" ${studentCurrentPage === totalPages ? 'disabled' : ''}>Next</button>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(controlsTr);
    
    document.getElementById('btn-page-prev').addEventListener('click', () => { studentCurrentPage--; renderStudentsTable(); });
    document.getElementById('btn-page-next').addEventListener('click', () => { studentCurrentPage++; renderStudentsTable(); });
  }
  
  tbody.querySelectorAll('.btn-view-profile').forEach(btn => btn.addEventListener('click', () => openStudentReportFromAdmin(btn.getAttribute('data-id'))));
  tbody.querySelectorAll('.btn-edit-student').forEach(btn => btn.addEventListener('click', () => openStudentModal(btn.getAttribute('data-id'))));
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
  
  if(window.lucide) lucide.createIcons();
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
  if(window.lucide) lucide.createIcons();
}

document.getElementById('form-student')?.addEventListener('submit', async (e) => {
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
  
  const teacher = state.currentUser.
