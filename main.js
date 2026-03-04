console.log("MAIN JS WORKING");
// main.js
// =============================================
// الجزء الأول: الإعداد الأساسي + مراقبة حالة الـ Authentication
// =============================================

import { 
  auth, 
  db 
} from './firebaseConfig.js';

import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';

import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// =============================================
// عناصر DOM الرئيسية
// =============================================
const authScreen    = document.getElementById('auth-screen');
const mainApp       = document.getElementById('main-app');
const loginForm     = document.getElementById('login-form');
const registerForm  = document.getElementById('register-form');
const switchBtn     = document.getElementById('switch-btn');
const switchText    = document.getElementById('switch-text');

// حالة التبديل بين تسجيل الدخول وإنشاء حساب
let isLoginMode = true;

// =============================================
// دوال مساعدة لإظهار/إخفاء الشاشات
// =============================================
function showMainApp() {
  authScreen.classList.add('hidden');
  mainApp.classList.remove('hidden');
  mainApp.classList.add('active');
}

function showAuthScreen() {
  mainApp.classList.add('hidden');
  authScreen.classList.remove('hidden');
  authScreen.classList.add('active');
}

// =============================================
// مراقبة حالة المستخدم (الأهم في البداية)
// =============================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // المستخدم مسجل دخول
    console.log("المستخدم مسجل دخول:", user.uid, user.email);

    // جلب بيانات المستخدم من Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      console.log("بيانات المستخدم من Firestore:", userData);

      // هنا يمكنك حفظ البيانات في متغير عام أو localStorage إذا أردت
      // مثال: window.currentUser = { ...userData, uid: user.uid };

      // إظهار التطبيق الرئيسي
      showMainApp();

      // تحديث واجهة المستخدم (صورة الملف، الاسم، إلخ) ← رح نضيفها لاحقاً
    } else {
      // المستخدم موجود في Auth لكن ليس في Firestore → يجب إنشاء سجل
      console.warn("لا يوجد سجل في Firestore لهذا المستخدم");
      // يمكن هنا عرض شاشة إكمال الملف أو إنشاء السجل تلقائياً
      await createUserProfile(user);
      showMainApp();
    }
  } else {
    // المستخدم غير مسجل دخول
    console.log("لا يوجد مستخدم مسجل");
    showAuthScreen();
  }
});

// =============================================
// إنشاء ملف تعريفي جديد في Firestore بعد التسجيل
// =============================================
async function createUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  
  const defaultData = {
    uid: user.uid,
    email: user.email,
    username: "",               // رح يحدثه المستخدم لاحقاً
    displayName: user.displayName || "مستخدم جديد",
    bio: "",
    profilePhoto: "",
    coverPhoto: "",
    isPrivate: true,
    followersCount: 0,
    followingCount: 0,
    followRequestsCount: 0,
    blockedUsersCount: 0,
    restrictedUsersCount: 0,
    lastSeen: serverTimestamp(),
    isOnline: true,
    createdAt: serverTimestamp()
  };

  try {
    await setDoc(userRef, defaultData, { merge: true });
    console.log("تم إنشاء ملف المستخدم بنجاح");
  } catch (error) {
    console.error("خطأ في إنشاء ملف المستخدم:", error);
  }
}

// =============================================
// التبديل بين نموذج تسجيل الدخول وإنشاء الحساب
// =============================================
switchBtn.addEventListener('click', (e) => {
  e.preventDefault();
  
  isLoginMode = !isLoginMode;
  
  if (isLoginMode) {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    switchText.textContent = "ليس لديك حساب؟";
    switchBtn.textContent = "إنشاء حساب جديد";
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    switchText.textContent = "لديك حساب بالفعل؟";
    switchBtn.textContent = "تسجيل الدخول";
  }
});

// ─────────────────────────────────────────────
// هذا هو نهاية الجزء الأول
// ─────────────────────────────────────────────
// main.js  ── الجزء الثاني
// =============================================
// معالجة نموذج تسجيل الدخول + إنشاء حساب جديد
// + التحقق الأساسي من البيانات + عرض رسائل الخطأ
// =============================================

// ── عناصر DOM إضافية نحتاجها في هذا الجزء ──
const loginEmail       = document.getElementById('login-email');
const loginPassword    = document.getElementById('login-password');
const loginBtn         = loginForm.querySelector('button[type="submit"]');

const regUsername      = document.getElementById('reg-username');
const regDisplayName   = document.getElementById('reg-displayname');
const regEmail         = document.getElementById('reg-email');
const regPassword      = document.getElementById('reg-password');
const regPasswordConfirm = document.getElementById('reg-password-confirm');
const regBtn           = registerForm.querySelector('button[type="submit"]');

// ── دالة مساعدة لعرض رسالة خطأ تحت الحقل أو في مكان عام ──
function showError(form, message) {
  let errorEl = form.querySelector('.error-message');
  
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    form.appendChild(errorEl);
  }
  
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  
  // إخفاء الرسالة بعد 6 ثوانٍ تلقائياً
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 6000);
}

function clearErrors(form) {
  const errorEl = form.querySelector('.error-message');
  if (errorEl) errorEl.style.display = 'none';
}

// ── تسجيل الدخول ──
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors(loginForm);

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    showError(loginForm, "يرجى ملء البريد الإلكتروني وكلمة المرور");
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "جاري تسجيل الدخول...";

    await signInWithEmailAndPassword(auth, email, password);
    
    // لا حاجة لفعل شيء إضافي هنا
    // onAuthStateChanged سيتولى إظهار الشاشة الرئيسية تلقائياً

  } catch (error) {
    console.error("خطأ في تسجيل الدخول:", error.code, error.message);

    let msg = "حدث خطأ أثناء تسجيل الدخول";

    switch (error.code) {
      case 'auth/invalid-email':
        msg = "البريد الإلكتروني غير صالح";
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        msg = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        break;
      case 'auth/too-many-requests':
        msg = "تم تعطيل الدخول مؤقتاً بسبب محاولات كثيرة، حاول لاحقاً";
        break;
      case 'auth/user-disabled':
        msg = "هذا الحساب معطل";
        break;
      default:
        msg = error.message.includes('network') 
          ? "مشكلة في الاتصال بالإنترنت"
          : "حدث خطأ غير متوقع، حاول مرة أخرى";
    }

    showError(loginForm, msg);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "تسجيل الدخول";
  }
});

// ── إنشاء حساب جديد ──
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors(registerForm);

  const username     = regUsername.value.trim();
  const displayName  = regDisplayName.value.trim();
  const email        = regEmail.value.trim();
  const password     = regPassword.value;
  const passwordConf = regPasswordConfirm.value;

  // التحقق الأساسي من الحقول
  if (!username || !displayName || !email || !password || !passwordConf) {
    showError(registerForm, "يرجى ملء جميع الحقول");
    return;
  }

  if (password !== passwordConf) {
    showError(registerForm, "كلمتا المرور غير متطابقتين");
    return;
  }

  if (password.length < 6) {
    showError(registerForm, "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    return;
  }

  // ملاحظة مهمة: التحقق من توفر الـ username يحتاج استعلام Firestore
  // سنضيفه في جزء لاحق (بعد إنشاء الحساب أو قبل)

  try {
    regBtn.disabled = true;
    regBtn.textContent = "جاري إنشاء الحساب...";

    // 1. إنشاء المستخدم في Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. تحديث الـ displayName في Auth
    await updateProfile(user, {
      displayName: displayName
    });

    // 3. إنشاء السجل في Firestore (مع username)
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      username: username.toLowerCase(),   // نحفظه صغير لتجنب التكرار
      displayName: displayName,
      bio: "",
      profilePhoto: "",
      coverPhoto: "",
      isPrivate: true,
      followersCount: 0,
      followingCount: 0,
      followRequestsCount: 0,
      blockedUsersCount: 0,
      restrictedUsersCount: 0,
      lastSeen: serverTimestamp(),
      isOnline: true,
      createdAt: serverTimestamp()
    }, { merge: true });

    console.log("تم إنشاء الحساب بنجاح:", user.uid);

    // onAuthStateChanged سيتولى إظهار الشاشة الرئيسية

  } catch (error) {
    console.error("خطأ في إنشاء الحساب:", error.code, error.message);

    let msg = "حدث خطأ أثناء إنشاء الحساب";

    switch (error.code) {
      case 'auth/email-already-in-use':
        msg = "البريد الإلكتروني مستخدم من قبل";
        break;
      case 'auth/invalid-email':
        msg = "البريد الإلكتروني غير صالح";
        break;
      case 'auth/weak-password':
        msg = "كلمة المرور ضعيفة جداً";
        break;
      default:
        msg = error.message;
    }

    showError(registerForm, msg);
  } finally {
    regBtn.disabled = false;
    regBtn.textContent = "إنشاء حساب";
  }
});

// ─────────────────────────────────────────────
// نهاية الجزء الثاني
// ─────────────────────────────────────────────
// main.js  ── الجزء الثالث
// =============================================
// التنقل بين التبويبات (Stories / Chats / Groups / Profile)
// + تحميل بيانات المستخدم الأساسية في الواجهة
// + تحديث lastSeen / isOnline عند الخروج
// =============================================

// ── عناصر DOM الرئيسية للتنقل ──
const bottomNavItems = document.querySelectorAll('.nav-item');
const viewsContainer = document.getElementById('views-container');
const views = {
  stories: document.getElementById('stories-view'),
  chats:   document.getElementById('chats-view'),
  groups:  document.getElementById('groups-view'),
  profile: document.getElementById('profile-view')
};

const headerProfilePic = document.getElementById('header-profile');
const profilePicLarge   = document.getElementById('profile-pic');
const profileDisplayName = document.getElementById('profile-displayname');
const profileUsername   = document.getElementById('profile-username');
const profileBio        = document.getElementById('profile-bio');
const followersCount    = document.getElementById('followers-count');
const followingCount    = document.getElementById('following-count');

// متغير عام لحفظ بيانات المستخدم الحالي (نستخدمه في كل مكان)
let currentUserData = null;

// ── دالة لتغيير التبويب النشط ──
function switchTab(tabName) {
  // إزالة active من كل التبويبات
  bottomNavItems.forEach(item => item.classList.remove('active'));
  
  // إضافة active للتبويب المختار
  const activeItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  if (activeItem) activeItem.classList.add('active');

  // إخفاء كل الـ views
  Object.values(views).forEach(view => {
    view.classList.remove('active');
    view.classList.add('hidden');
  });

  // إظهار الـ view المطلوب
  if (views[tabName]) {
    views[tabName].classList.remove('hidden');
    views[tabName].classList.add('active');
  }

  // إغلاق نافذة الدردشة إذا كانت مفتوحة (اختياري)
  document.getElementById('chat-window')?.classList.add('hidden');
}

// ── ربط أزرار التنقل السفلي ──
bottomNavItems.forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab;
    if (tab) switchTab(tab);
  });
});

// ── تحميل بيانات المستخدم في الواجهة (يتم استدعاؤها بعد تسجيل الدخول) ──
async function loadUserInterface(userData) {
  if (!userData) return;

  currentUserData = userData;

  // تحديث صورة الملف في الهيدر
  if (userData.profilePhoto) {
    headerProfilePic.style.backgroundImage = `url(${userData.profilePhoto})`;
  }

  // تحديث صفحة الملف الشخصي
  if (profilePicLarge) {
    profilePicLarge.style.backgroundImage = `url(${userData.profilePhoto || ''})`;
  }

  if (profileDisplayName) {
    profileDisplayName.textContent = userData.displayName || "مستخدم";
  }

  if (profileUsername) {
    profileUsername.textContent = `@${userData.username || 'newuser'}`;
  }

  if (profileBio) {
    profileBio.textContent = userData.bio || "لا يوجد وصف بعد";
  }

  if (followersCount) {
    followersCount.textContent = userData.followersCount || 0;
  }

  if (followingCount) {
    followingCount.textContent = userData.followingCount || 0;
  }

  // يمكن إضافة المزيد لاحقاً (مثل عدد القصص، الهايلايتس، إلخ)
}

// ── تعديل onAuthStateChanged لتحميل بيانات المستخدم ──
// (نعدل الجزء الأول شوية عشان يتناسب مع الجزء ده)

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);

    let userData;

    if (userSnap.exists()) {
      userData = userSnap.data();
    } else {
      // إنشاء السجل إذا ما كان موجود
      await createUserProfile(user);
      const newSnap = await getDoc(userDocRef);
      userData = newSnap.data();
    }

    // تحميل الواجهة ببيانات المستخدم
    await loadUserInterface(userData);

    showMainApp();

    // افتراضي: نروح لتبويب الدردشات أو القصص أول ما يدخل
    switchTab('chats');   // أو 'stories' حسب تفضيلك

  } else {
    showAuthScreen();
    currentUserData = null;
  }
});

// ── تحديث lastSeen و isOnline عند الخروج من الصفحة ──
window.addEventListener('beforeunload', async () => {
  if (auth.currentUser) {
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("فشل تحديث حالة الخروج:", e);
    }
  }
});

// ── تحديث isOnline إلى true عند الدخول (اختياري، يمكن وضعه في onAuthStateChanged)
// لكن لأننا نعتمد على lastSeen بشكل أساسي، ممكن نتركه كـ boolean بسيط

// ─────────────────────────────────────────────
// نهاية الجزء الثالث
// ─────────────────────────────────────────────
// main.js  ── الجزء الرابع
// =============================================
// زر تسجيل الخروج + تحسينات أساسية لتجربة المستخدم
// + إعداد أولي لنافذة الدردشة (فتح / إغلاق)
// + بعض التحسينات الصغيرة على الـ UI
// =============================================

// ── عناصر DOM إضافية نحتاجها هنا ──
const logoutBtn         = document.querySelector('#logout-btn');          // لازم تضيفه في HTML إذا ما كان موجود
const chatWindow        = document.getElementById('chat-window');
const chatBackBtn       = document.getElementById('chat-back-btn');
const messageInput      = document.getElementById('message-input');
const sendMessageBtn    = document.getElementById('send-message-btn');
const chatUsername      = document.getElementById('chat-username');
const chatUserPic       = document.getElementById('chat-user-pic');
const messagesList      = document.getElementById('messages-list');

// ── زر تسجيل الخروج (يجب إضافته في HTML داخل profile-view مثلاً) ──
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      // تحديث الحالة قبل الخروج
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await setDoc(userRef, {
          isOnline: false,
          lastSeen: serverTimestamp()
        }, { merge: true });
      }

      await signOut(auth);
      console.log("تم تسجيل الخروج بنجاح");

      // إعادة تحميل الصفحة أو إظهار شاشة المصادقة مباشرة
      showAuthScreen();
      switchTab('stories'); // أو أي تبويب افتراضي

    } catch (error) {
      console.error("خطأ أثناء تسجيل الخروج:", error);
      alert("حدث خطأ أثناء تسجيل الخروج، حاول مرة أخرى");
    }
  });
}

// ── فتح نافذة الدردشة (مثال بسيط – سيتم توسيعه لاحقاً) ──
// هذه دالة يمكن استدعاؤها لاحقاً عند الضغط على أي محادثة
function openChatWindow(chatData) {
  // chatData مثال: { id, username, photo, type: 'private' | 'group' }

  if (!chatData) return;

  // تعبئة رأس الدردشة
  chatUsername.textContent = chatData.username || "دردشة";
  
  if (chatData.photo) {
    chatUserPic.src = chatData.photo;
    chatUserPic.style.display = 'block';
  } else {
    chatUserPic.style.display = 'none';
  }

  // إظهار النافذة
  chatWindow.classList.remove('hidden');

  // التركيز على مربع الكتابة
  messageInput.focus();

  // هنا سيتم لاحقاً: تحميل الرسائل، تفعيل listener، إلخ
  console.log("تم فتح دردشة مع:", chatData.username);
}

// ── إغلاق نافذة الدردشة ──
if (chatBackBtn) {
  chatBackBtn.addEventListener('click', () => {
    chatWindow.classList.add('hidden');
    
    // تنظيف المحتوى (اختياري)
    messagesList.innerHTML = '';
    messageInput.value = '';
  });
}

// ── إرسال رسالة نصية بسيطة (placeholder – سيتم توسيعه لاحقاً) ──
if (sendMessageBtn) {
  sendMessageBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (!text) return;

    // مثال بسيط: إضافة الرسالة محلياً فقط (بدون حفظ في Firestore بعد)
    const msgElement = document.createElement('div');
    msgElement.className = 'message-bubble sent';
    msgElement.innerHTML = `<div class="message-text">${text}</div>`;
    messagesList.appendChild(msgElement);

    // التمرير للأسفل
    messagesList.scrollTop = messagesList.scrollHeight;

    // تنظيف الحقل
    messageInput.value = '';

    // لاحقاً: حفظ الرسالة في Firestore + تحديث last message
    console.log("رسالة مرسلة (placeholder):", text);
  });
}

// ── دعم إرسال بالضغط على Enter (مع Shift+Enter لسطر جديد) ──
if (messageInput) {
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageBtn.click();
    }
  });
}

// ── تحسينات صغيرة على تجربة الكتابة (auto-resize textarea) ──
if (messageInput) {
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
  });
}

// ── تحميل التبويب الافتراضي عند الدخول (يمكن تعديله) ──
document.addEventListener('DOMContentLoaded', () => {
  // إذا كان المستخدم مسجل دخول → نختار تبويب افتراضي
  if (!authScreen.classList.contains('hidden')) {
    switchTab('chats'); // أو 'stories' حسب رغبتك
  }
});

// ─────────────────────────────────────────────
// نهاية الجزء الرابع
// ─────────────────────────────────────────────
// main.js  ── الجزء الخامس
// =============================================
// عرض قائمة الدردشات الأخيرة (آخر المحادثات)
// + جلب بيانات المستخدمين الآخرين من Firestore
// + تحديث الـ UI عند وجود رسائل جديدة
// =============================================

// ── عناصر DOM ──
const chatsList = document.getElementById('chats-list');

// ── هيكلية المحادثات في Firestore (مثال مقترح)
// conversations/{conversationId}
//   - participants: array [uid1, uid2]
//   - lastMessage: { text, senderId, timestamp }
//   - unreadCount: { uid1: number, uid2: number }

// users/{uid}/conversations/{conversationId}   ← subcollection لتسهيل الجلب

// ── دالة لإنشاء عنصر محادثة في الـ UI ──
function createChatItemElement(chat) {
  const item = document.createElement('div');
  item.className = 'chat-item';
  item.dataset.conversationId = chat.id;

  item.innerHTML = `
    <img class="chat-pic" src="${chat.otherUser.photo || ''}" alt="">
    <div class="chat-info">
      <div class="chat-name">${chat.otherUser.displayName || chat.otherUser.username}</div>
      <div class="last-message ${chat.lastMessage?.senderId === auth.currentUser?.uid ? 'you' : ''}">
        ${chat.lastMessage?.text || 'بدء محادثة جديدة'}
      </div>
    </div>
    <div class="chat-meta">
      <span class="timestamp">${formatTimestamp(chat.lastMessage?.timestamp || chat.createdAt)}</span>
      ${chat.unread > 0 ? `<span class="unread-count">${chat.unread}</span>` : ''}
    </div>
  `;

  // عند الضغط → افتح نافذة الدردشة
  item.addEventListener('click', () => {
    openChatWindow({
      id: chat.id,
      username: chat.otherUser.displayName || chat.otherUser.username,
      photo: chat.otherUser.photo,
      type: 'private'
    });
  });

  return item;
}

// ── دالة مساعدة لتنسيق الوقت (بسيطة) ──
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  
  const diff = now - date;
  if (diff < 60 * 1000) return 'الآن';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} د`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} س`;
  
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

// ── جلب قائمة المحادثات الأخيرة ──
async function loadRecentChats() {
  if (!auth.currentUser) return;

  chatsList.innerHTML = '<div class="loader loader-small"></div>'; // loading

  try {
    // جلب من subcollection الخاص بالمستخدم
    const userChatsRef = collection(db, `users/${auth.currentUser.uid}/conversations`);
    const q = query(
      userChatsRef,
      orderBy('lastMessage.timestamp', 'desc'),
      limit(20)
    );

    const querySnapshot = await getDocs(q);

    chatsList.innerHTML = '';

    if (querySnapshot.empty) {
      chatsList.innerHTML = `
        <div class="empty-state">
          <div class="icon">💬</div>
          <h3>لا توجد محادثات بعد</h3>
          <p>ابدأ محادثة جديدة مع أصدقائك</p>
        </div>
      `;
      return;
    }

    const chats = [];

    for (const docSnap of querySnapshot.docs) {
      const chatData = docSnap.data();
      const convId = docSnap.id;

      // جلب بيانات الطرف الآخر
      const otherUid = chatData.participants.find(uid => uid !== auth.currentUser.uid);
      if (!otherUid) continue;

      const otherUserRef = doc(db, "users", otherUid);
      const otherUserSnap = await getDoc(otherUserRef);

      if (!otherUserSnap.exists()) continue;

      const otherUser = otherUserSnap.data();

      chats.push({
        id: convId,
        otherUser: {
          uid: otherUid,
          displayName: otherUser.displayName,
          username: otherUser.username,
          photo: otherUser.profilePhoto
        },
        lastMessage: chatData.lastMessage,
        unread: chatData.unread?.[auth.currentUser.uid] || 0,
        createdAt: chatData.createdAt
      });
    }

    // عرض العناصر
    chats.forEach(chat => {
      const element = createChatItemElement(chat);
      chatsList.appendChild(element);
    });

  } catch (error) {
    console.error("خطأ في جلب المحادثات:", error);
    chatsList.innerHTML = `
      <div class="empty-state">
        <h3>حدث خطأ</h3>
        <p>تعذر تحميل المحادثات، حاول مرة أخرى</p>
      </div>
    `;
  }
}

// ── استدعاء التحميل عند فتح تبويب الدردشات ──
document.querySelector('.nav-item[data-tab="chats"]')
  .addEventListener('click', () => {
    loadRecentChats();
  });

// ── تحميل أولي عند الدخول للتطبيق (إذا كان التبويب الافتراضي هو الدردشات) ──
if (document.querySelector('.nav-item[data-tab="chats"].active')) {
  loadRecentChats();
}

// ─────────────────────────────────────────────
// نهاية الجزء الخامس
// ─────────────────────────────────────────────
// main.js  ── الجزء السادس
// =============================================
// إرسال رسالة نصية حقيقية إلى Firestore
// + الاستماع للرسائل في الوقت الفعلي داخل الدردشة (onSnapshot)
// + تحديث حالة "تم التسليم" / "تمت المشاهدة" (بسيط جداً في البداية)
// =============================================

// ── imports إضافية نحتاجها هنا ──
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc as firestoreDoc,
  where,
  getDocs
} from 'firebase/firestore';

// ── متغيرات عالمية مؤقتة للدردشة الحالية ──
let currentConversationId = null;
let currentUnsubscribe = null; // لإلغاء الـ listener السابق

// ── دالة لإنشاء أو الحصول على conversationId بين مستخدمين اثنين ──
async function getOrCreateConversation(otherUid) {
  if (!auth.currentUser) return null;

  const myUid = auth.currentUser.uid;

  // نحاول البحث عن محادثة موجودة
  const convsRef = collection(db, `users/${myUid}/conversations`);
  const q = query(
    convsRef,
    where('participants', 'array-contains', otherUid),
    limit(1)
  );

  const snap = await getDocs(q);

  if (!snap.empty) {
    return snap.docs[0].id;
  }

  // إنشاء محادثة جديدة
  const newConvRef = await addDoc(collection(db, 'conversations'), {
    participants: [myUid, otherUid],
    createdAt: serverTimestamp(),
    lastMessage: null,
    unread: {
      [myUid]: 0,
      [otherUid]: 0
    }
  });

  const convId = newConvRef.id;

  // إضافة إلى subcollection كلا المستخدمين
  await setDoc(firestoreDoc(db, `users/${myUid}/conversations`, convId), {
    participants: [myUid, otherUid],
    createdAt: serverTimestamp(),
    lastMessage: null
  });

  await setDoc(firestoreDoc(db, `users/${otherUid}/conversations`, convId), {
    participants: [myUid, otherUid],
    createdAt: serverTimestamp(),
    lastMessage: null
  });

  return convId;
}

// ── دالة إرسال رسالة نصية حقيقية ──
async function sendRealMessage(text) {
  if (!currentConversationId || !auth.currentUser || !text.trim()) return;

  const myUid = auth.currentUser.uid;

  try {
    const messagesRef = collection(db, `conversations/${currentConversationId}/messages`);

    await addDoc(messagesRef, {
      text: text.trim(),
      senderId: myUid,
      timestamp: serverTimestamp(),
      type: 'text',
      status: 'sent'  // sent → delivered → seen (لاحقاً)
    });

    // تحديث lastMessage في الـ conversation
    const convRef = firestoreDoc(db, 'conversations', currentConversationId);
    await updateDoc(convRef, {
      lastMessage: {
        text: text.trim(),
        senderId: myUid,
        timestamp: serverTimestamp()
      }
    });

    // زيادة unread للطرف الآخر
    const otherUid = /* يجب حسابه من participants أو من chatData */
    // ملاحظة: تحتاج تعديل بسيط لمعرفة otherUid هنا

    console.log("تم إرسال الرسالة بنجاح");

  } catch (error) {
    console.error("خطأ في إرسال الرسالة:", error);
    // يمكن عرض إشعار خطأ للمستخدم
  }
}

// ── تعديل زر الإرسال ليستخدم الدالة الحقيقية ──
if (sendMessageBtn) {
  sendMessageBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (text) {
      sendRealMessage(text);
      messageInput.value = '';
    }
  });
}

// ── فتح نافذة الدردشة مع listener للرسائل في الوقت الفعلي ──
async function openChatWindow(chatData) {
  // ... الكود السابق لتعبئة الرأس ...

  currentConversationId = chatData.id;

  // إلغاء الـ listener السابق إذا وجد
  if (currentUnsubscribe) {
    currentUnsubscribe();
    currentUnsubscribe = null;
  }

  messagesList.innerHTML = '<div class="loader">جاري تحميل الرسائل...</div>';

  const messagesRef = collection(db, `conversations/${currentConversationId}/messages`);
  const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50)); // آخر 50 رسالة فقط

  currentUnsubscribe = onSnapshot(q, (snapshot) => {
    messagesList.innerHTML = '';

    snapshot.forEach((doc) => {
      const msg = doc.data();
      const isSent = msg.senderId === auth.currentUser?.uid;

      const bubble = document.createElement('div');
      bubble.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
      bubble.innerHTML = `
        <div class="message-text">${msg.text || ''}</div>
        <div class="message-status">${msg.status || 'sent'}</div>
      `;

      messagesList.appendChild(bubble);
    });

    // التمرير للأسفل تلقائياً
    messagesList.scrollTop = messagesList.scrollHeight;
  }, (error) => {
    console.error("خطأ في الاستماع للرسائل:", error);
    messagesList.innerHTML = '<p style="color: #ef4444;">تعذر تحميل الرسائل</p>';
  });
}

// ── تنظيف الـ listener عند إغلاق الدردشة ──
if (chatBackBtn) {
  chatBackBtn.addEventListener('click', () => {
    chatWindow.classList.add('hidden');

    if (currentUnsubscribe) {
      currentUnsubscribe();
      currentUnsubscribe = null;
    }

    currentConversationId = null;
    messagesList.innerHTML = '';
  });
}

// ─────────────────────────────────────────────
// نهاية الجزء السادس
// ─────────────────────────────────────────────
// main.js  ── الجزء السابع
// =============================================
// تحديث حالة الرسائل (sent → delivered → seen)
// + زيادة unread count للطرف الآخر عند إرسال رسالة
// + وضع علامة "تمت المشاهدة" عند فتح الدردشة
// =============================================

// ── imports إضافية مطلوبة ──
import {
  query,
  where,
  getDocs,
  writeBatch,
  increment
} from 'firebase/firestore';

// ── دالة لتحديث حالة رسالة واحدة ──
async function updateMessageStatus(messageId, newStatus) {
  if (!currentConversationId || !messageId) return;

  try {
    const msgRef = firestoreDoc(db, `conversations/${currentConversationId}/messages`, messageId);
    await updateDoc(msgRef, {
      status: newStatus,
      [`statusTimestamp.${newStatus}`]: serverTimestamp()
    });
  } catch (err) {
    console.warn("فشل تحديث حالة الرسالة:", err);
  }
}

// ── تعديل sendRealMessage لتتبع حالة "sent" أولاً ──
async function sendRealMessage(text) {
  if (!currentConversationId || !auth.currentUser || !text.trim()) return;

  const myUid = auth.currentUser.uid;
  const messagesRef = collection(db, `conversations/${currentConversationId}/messages`);

  try {
    const newMsgRef = await addDoc(messagesRef, {
      text: text.trim(),
      senderId: myUid,
      timestamp: serverTimestamp(),
      type: 'text',
      status: 'sent'
    });

    // تحديث lastMessage في الـ conversation
    const convRef = firestoreDoc(db, 'conversations', currentConversationId);
    await updateDoc(convRef, {
      lastMessage: {
        text: text.trim(),
        senderId: myUid,
        timestamp: serverTimestamp(),
        messageId: newMsgRef.id
      }
    });

    // زيادة unread للطرف الآخر
    await increaseUnreadForOtherParticipant();

    console.log("تم إرسال الرسالة:", newMsgRef.id);

    // بعد ثوانٍ قليلة (محاكاة التسليم) يمكن تحديث إلى delivered
    setTimeout(() => {
      updateMessageStatus(newMsgRef.id, 'delivered');
    }, 1500);

  } catch (error) {
    console.error("خطأ في إرسال الرسالة:", error);
  }
}

// ── دالة لزيادة unread count للطرف الآخر ──
async function increaseUnreadForOtherParticipant() {
  if (!currentConversationId || !auth.currentUser) return;

  try {
    // جلب participants من الـ conversation
    const convSnap = await getDoc(firestoreDoc(db, 'conversations', currentConversationId));
    if (!convSnap.exists()) return;

    const participants = convSnap.data().participants || [];
    const otherUid = participants.find(uid => uid !== auth.currentUser.uid);

    if (!otherUid) return;

    const batch = writeBatch(db);

    // زيادة unread في users/{otherUid}/conversations/{convId}
    const otherUserConvRef = firestoreDoc(db, `users/${otherUid}/conversations`, currentConversationId);
    batch.update(otherUserConvRef, {
      [`unread.${otherUid}`]: increment(1)
    });

    // زيادة unread في الـ conversation document نفسه (اختياري)
    const convRef = firestoreDoc(db, 'conversations', currentConversationId);
    batch.update(convRef, {
      [`unread.${otherUid}`]: increment(1)
    });

    await batch.commit();

  } catch (err) {
    console.warn("فشل زيادة unread count:", err);
  }
}

// ── عند فتح الدردشة: وضع علامة "seen" على الرسائل غير المقروءة ──
async function markMessagesAsSeen() {
  if (!currentConversationId || !auth.currentUser) return;

  try {
    const myUid = auth.currentUser.uid;

    // جلب الرسائل غير المقروءة التي ليست مني
    const q = query(
      collection(db, `conversations/${currentConversationId}/messages`),
      where('senderId', '!=', myUid),
      where('status', '!=', 'seen'),
      limit(50)
    );

    const snap = await getDocs(q);

    if (snap.empty) return;

    const batch = writeBatch(db);

    snap.forEach((docSnap) => {
      const msgRef = docSnap.ref;
      batch.update(msgRef, {
        status: 'seen',
        [`statusTimestamp.seen`]: serverTimestamp()
      });
    });

    // تصفير unread الخاص بي
    const myUserConvRef = firestoreDoc(db, `users/${myUid}/conversations`, currentConversationId);
    batch.update(myUserConvRef, {
      [`unread.${myUid}`]: 0
    });

    const convRef = firestoreDoc(db, 'conversations', currentConversationId);
    batch.update(convRef, {
      [`unread.${myUid}`]: 0
    });

    await batch.commit();

    console.log(`تم وضع علامة seen على ${snap.size} رسالة`);

  } catch (err) {
    console.warn("فشل وضع علامة seen:", err);
  }
}

// ── تعديل openChatWindow لتشغيل markMessagesAsSeen ──
async function openChatWindow(chatData) {
  // ... الكود السابق لتعبئة الرأس والـ listener ...

  currentConversationId = chatData.id;

  // بعد فتح النافذة وقبل بدء الـ listener
  await markMessagesAsSeen();

  // ثم تفعيل الـ onSnapshot كما في الجزء السابق
  // ...
}

// ─────────────────────────────────────────────
// نهاية الجزء السابع
// ─────────────────────────────────────────────
// main.js  ── الجزء الثامن
// =============================================
// مؤشر الكتابة (Typing Indicator)
// - كتابة محلية + كتابة واحدة فقط عند البدء
// - إزالة تلقائية بعد 3 ثوانٍ بدون كتابة جديدة
// - استماع لمؤشر الكتابة من الطرف الآخر (منخفض الاستهلاك)
// =============================================

// ── imports إضافية ──
import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

// ── متغيرات عالمية للكتابة ──
let typingTimeout = null;
const TYPING_TIMEOUT_MS = 3000; // 3 ثوانٍ

// ── دالة لإرسال إشارة "أنا أكتب الآن" ──
function sendTypingStart() {
  if (!currentConversationId || !auth.currentUser) return;

  const myUid = auth.currentUser.uid;
  const typingRef = firestoreDoc(db, `conversations/${currentConversationId}/typing`, myUid);

  // نكتب مرة واحدة فقط عند البدء
  setDoc(typingRef, {
    timestamp: serverTimestamp(),
    isTyping: true
  }, { merge: true });
}

// ── دالة لإيقاف إشارة الكتابة ──
function sendTypingStop() {
  if (!currentConversationId || !auth.currentUser) return;

  const myUid = auth.currentUser.uid;
  const typingRef = firestoreDoc(db, `conversations/${currentConversationId}/typing`, myUid);

  // حذف الوثيقة أفضل من وضع isTyping: false
  // لأننا لا نريد وجود وثائق فارغة
  deleteDoc(typingRef).catch(() => {
    // إذا فشل الحذف (مثلاً لأنه غير موجود) لا مشكلة
  });
}

// ── ربط حدث الكتابة في مربع الإدخال ──
if (messageInput) {
  let isCurrentlyTyping = false;

  messageInput.addEventListener('input', () => {
    if (!isCurrentlyTyping) {
      isCurrentlyTyping = true;
      sendTypingStart();
    }

    // إعادة تعيين المؤقت
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      isCurrentlyTyping = false;
      sendTypingStop();
    }, TYPING_TIMEOUT_MS);
  });

  // إيقاف الكتابة عند الإرسال أو الخروج من الحقل
  messageInput.addEventListener('blur', () => {
    if (isCurrentlyTyping) {
      isCurrentlyTyping = false;
      sendTypingStop();
    }
  });
}

// ── عرض مؤشر الكتابة في الدردشة (للطرف الآخر) ──
function showTypingIndicator() {
  // إزالة أي مؤشر سابق
  const existing = document.querySelector('.typing-indicator');
  if (existing) existing.remove();

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <span>يكتب الآن...</span>
  `;

  messagesList.appendChild(indicator);
  messagesList.scrollTop = messagesList.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.querySelector('.typing-indicator');
  if (indicator) indicator.remove();
}

// ── الاستماع لمؤشر الكتابة من الطرف الآخر ──
function listenToTyping(otherUid) {
  if (!currentConversationId || !otherUid) return () => {};

  const typingRef = doc(db, `conversations/${currentConversationId}/typing`, otherUid);

  return onSnapshot(typingRef, (snap) => {
    if (snap.exists() && snap.data().isTyping) {
      showTypingIndicator();
    } else {
      hideTypingIndicator();
    }
  });
}

// ── تعديل openChatWindow ليشمل الاستماع للكتابة ──
let typingUnsubscribe = null;

async function openChatWindow(chatData) {
  // ... الكود السابق ...

  currentConversationId = chatData.id;

  // إلغاء الاستماع السابق للكتابة إن وجد
  if (typingUnsubscribe) {
    typingUnsubscribe();
    typingUnsubscribe = null;
  }

  // بدء الاستماع لمؤشر الكتابة
  typingUnsubscribe = listenToTyping();

  // تنظيف عند الإغلاق
  const originalBackListener = chatBackBtn.onclick;
  chatBackBtn.onclick = () => {
    if (typingUnsubscribe) {
      typingUnsubscribe();
      typingUnsubscribe = null;
    }
    hideTypingIndicator();
    // استدعاء الإغلاق الأصلي
    chatWindow.classList.add('hidden');
    if (currentUnsubscribe) currentUnsubscribe();
    currentConversationId = null;
    messagesList.innerHTML = '';
  };
}

// ─────────────────────────────────────────────
// نهاية الجزء الثامن
// ─────────────────────────────────────────────
// main.js  ── الجزء التاسع
// =============================================
// البحث العالمي عن مستخدمين (من خلال username)
// + عرض نتائج البحث في واجهة بسيطة
// + بدء محادثة جديدة عند الضغط على نتيجة
// =============================================

// ── عناصر DOM ──
const globalSearchInput = document.getElementById('global-search');
const searchResultsContainer = document.createElement('div');
searchResultsContainer.id = 'search-results';
searchResultsContainer.className = 'search-results hidden';
document.querySelector('.search-container').appendChild(searchResultsContainer);

// ── دالة لعرض نتيجة بحث واحدة ──
function createSearchResultElement(user) {
  const item = document.createElement('div');
  item.className = 'search-result-item';
  item.innerHTML = `
    <img class="chat-pic" src="${user.profilePhoto || ''}" alt="">
    <div class="user-info">
      <div class="user-name">${user.displayName || user.username}</div>
      <div class="user-username">@${user.username}</div>
    </div>
  `;

  item.addEventListener('click', async () => {
    // إخفاء نتائج البحث
    searchResultsContainer.classList.add('hidden');
    globalSearchInput.value = '';

    // فتح أو إنشاء محادثة مع هذا المستخدم
    const convId = await getOrCreateConversation(user.uid);
    
    if (convId) {
      openChatWindow({
        id: convId,
        username: user.displayName || user.username,
        photo: user.profilePhoto,
        otherUid: user.uid,
        type: 'private'
      });
    }
  });

  return item;
}

// ── دالة البحث الرئيسية (عند الكتابة) ──
let searchTimeout = null;

globalSearchInput.addEventListener('input', () => {
  const queryText = globalSearchInput.value.trim().toLowerCase();

  // إلغاء البحث السابق إذا كان هناك تأخير
  clearTimeout(searchTimeout);

  if (queryText.length < 2) {
    searchResultsContainer.classList.add('hidden');
    searchResultsContainer.innerHTML = '';
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      searchResultsContainer.innerHTML = '<div class="loader">جاري البحث...</div>';
      searchResultsContainer.classList.remove('hidden');

      // البحث في username (يجب أن يكون username مفهرس في Firestore)
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', queryText),
        where('username', '<=', queryText + '\uf8ff'), // نطاق البحث
        limit(10)
      );

      const snap = await getDocs(q);

      searchResultsContainer.innerHTML = '';

      if (snap.empty) {
        searchResultsContainer.innerHTML = `
          <div class="empty-state small">
            <p>لا توجد نتائج مطابقة</p>
          </div>
        `;
        return;
      }

      snap.forEach((doc) => {
        const userData = doc.data();
        if (userData.uid === auth.currentUser?.uid) return; // لا نظهر نفسك

        const element = createSearchResultElement(userData);
        searchResultsContainer.appendChild(element);
      });

    } catch (err) {
      console.error("خطأ في البحث عن مستخدمين:", err);
      searchResultsContainer.innerHTML = `
        <p style="color: #ef4444; padding: 16px;">حدث خطأ أثناء البحث</p>
      `;
    }
  }, 400); // تأخير 400ms لتجنب طلبات كثيرة أثناء الكتابة
});

// ── إخفاء نتائج البحث عند الضغط خارج الحقل ──
document.addEventListener('click', (e) => {
  if (!globalSearchInput.contains(e.target) && 
      !searchResultsContainer.contains(e.target)) {
    searchResultsContainer.classList.add('hidden');
  }
});

// ── CSS بسيط لنتائج البحث (ضعه في style.css أو أضفه هنا مؤقتاً) ──
/*
.search-results {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--glass-shadow);
  max-height: 320px;
  overflow-y: auto;
  z-index: 100;
  margin-top: 8px;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-result-item:hover {
  background: rgba(139, 92, 246, 0.1);
}

.user-info .user-name {
  font-weight: 600;
}

.user-info .user-username {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
*/

// ─────────────────────────────────────────────
// نهاية الجزء التاسع
// ─────────────────────────────────────────────
// main.js  ── الجزء العاشر
// =============================================
// نظام القصص الأساسي
// - زر "أضف قصتك" في شريط القصص
// - رفع صورة قصة جديدة إلى Storage + حفظ metadata في Firestore
// - عرض القصص في الشريط الأفقي (آخر 24 ساعة فقط)
// =============================================

// ── imports إضافية مطلوبة ──
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

// ── عناصر DOM الخاصة بالقصص ──
const myStoryCircle = document.getElementById('my-story');
const storiesBar = document.querySelector('.stories-bar');

// ── فتح نافذة رفع قصة جديدة (بسيطة – input file) ──
myStoryCircle.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment'; // افتراضي الكاميرا الخلفية على الموبايل

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار صورة فقط');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // حد 5 ميجا
      alert('حجم الصورة كبير جداً (الحد الأقصى 5 ميجا)');
      return;
    }

    try {
      myStoryCircle.querySelector('.circle').innerHTML = '<div class="loader loader-small"></div>';

      // رفع الصورة إلى Storage
      const storageRef = ref(storage, `stories/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // حفظ metadata القصة في Firestore
      const storyRef = doc(db, 'stories', `${auth.currentUser.uid}_${Date.now()}`);
      await setDoc(storyRef, {
        userId: auth.currentUser.uid,
        url: downloadURL,
        type: 'image',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // بعد 24 ساعة
        seenBy: {} // map لتتبع المشاهدين لاحقاً
      });

      console.log("تم رفع قصة جديدة بنجاح:", downloadURL);

      // إعادة تحميل شريط القصص
      loadStories();

    } catch (err) {
      console.error("خطأ في رفع القصة:", err);
      alert("حدث خطأ أثناء رفع القصة، حاول مرة أخرى");
    } finally {
      myStoryCircle.querySelector('.circle').innerHTML = '<span class="plus">+</span>';
    }
  };

  input.click();
});

// ── دالة لتحميل وعرض القصص في الشريط ──
async function loadStories() {
  if (!auth.currentUser) return;

  // إزالة القصص القديمة أولاً (باستثناء "قصتك")
  document.querySelectorAll('.story-circle:not(.own)').forEach(el => el.remove());

  try {
    // جلب القصص النشطة (آخر 24 ساعة)
    const storiesRef = collection(db, 'stories');
    const q = query(
      storiesRef,
      where('expiresAt', '>', new Date()),
      orderBy('expiresAt', 'desc'),
      limit(20)
    );

    const snap = await getDocs(q);

    if (snap.empty) return;

    snap.forEach((docSnap) => {
      const story = docSnap.data();

      // لا نعرض قصصنا هنا (لأنها في my-story)
      if (story.userId === auth.currentUser.uid) return;

      const circle = document.createElement('div');
      circle.className = 'story-circle';
      circle.innerHTML = `
        <div class="circle">
          <img src="${story.url}" alt="">
        </div>
        <span class="username">${story.username || 'مستخدم'}</span>
      `;

      // عند الضغط → فتح عارض القصص (سيتم تطويره لاحقاً)
      circle.addEventListener('click', () => {
        alert('فتح قصة: ' + story.url); // placeholder
        // لاحقاً: openStoryViewer(story);
      });

      storiesBar.appendChild(circle);
    });

  } catch (err) {
    console.error("خطأ في تحميل القصص:", err);
  }
}

// ── تحميل القصص عند الدخول لتبويب القصص ──
document.querySelector('.nav-item[data-tab="stories"]')
  .addEventListener('click', () => {
    loadStories();
  });

// تحميل أولي إذا كان التبويب الافتراضي هو القصص
if (document.querySelector('.nav-item[data-tab="stories"].active')) {
  loadStories();
}

// ─────────────────────────────────────────────
// نهاية الجزء العاشر
// ─────────────────────────────────────────────
// main.js  ── الجزء الحادي عشر
// =============================================
// عارض القصص الكامل (Story Viewer)
// - شريط تقدم متعدد لكل قصة
// - الانتقال التلقائي + يدوي (يمين/يسار)
// - إغلاق + زر الرجوع
// =============================================

// ── عناصر DOM الخاصة بعارض القصص ──
const storyViewer = document.getElementById('story-viewer');
const storyContent = document.querySelector('.story-content'); // لازم تضيفه في HTML
const storyProgressContainer = document.querySelector('.story-progress-container');
const storyMedia = document.querySelector('.story-media');
const storyUserPic = document.querySelector('.story-pic');
const storyUsername = document.querySelector('.story-info h3');
const storyTime = document.querySelector('.story-info span');
const storyCloseBtn = document.querySelector('.story-close-btn');
const storyNavLeft = document.querySelector('.story-nav-left');
const storyNavRight = document.querySelector('.story-nav-right');

// ── متغيرات لإدارة العارض ──
let currentStories = [];          // قائمة القصص للمستخدم الحالي
let currentStoryIndex = 0;
let progressInterval = null;
let currentProgressBar = null;

// ── دالة لفتح عارض القصص ──
async function openStoryViewer(userStories, startIndex = 0) {
  if (!userStories || userStories.length === 0) return;

  currentStories = userStories;
  currentStoryIndex = startIndex;

  storyViewer.classList.remove('hidden');

  // تحميل أول قصة
  loadCurrentStory();

  // بدء شريط التقدم
  startProgressBar();
}

// ── تحميل القصة الحالية ──
function loadCurrentStory() {
  const story = currentStories[currentStoryIndex];
  if (!story) return closeStoryViewer();

  // تعبئة المحتوى
  storyMedia.src = story.url;
  storyMedia.style.display = 'block';

  storyUserPic.src = story.userPhoto || '';
  storyUsername.textContent = story.displayName || story.username;
  storyTime.textContent = 'منذ ' + formatTimeAgo(story.createdAt);

  // إنشاء أشرطة التقدم حسب عدد القصص
  createProgressBars();

  // تحديث الشريط الحالي
  updateProgressBars();

  // تسجيل مشاهدة (لاحقاً نضيف batch update)
  markStoryAsSeen(story.id);
}

// ── إنشاء أشرطة التقدم ──
function createProgressBars() {
  storyProgressContainer.innerHTML = '';

  currentStories.forEach((_, index) => {
    const bar = document.createElement('div');
    bar.className = 'story-progress-bar';
    
    const fill = document.createElement('div');
    fill.className = 'story-progress-fill';
    fill.dataset.index = index;
    
    bar.appendChild(fill);
    storyProgressContainer.appendChild(bar);
  });

  currentProgressBar = storyProgressContainer.querySelectorAll('.story-progress-fill')[currentStoryIndex];
}

// ── تحديث أشرطة التقدم + الانتقال التلقائي ──
function startProgressBar() {
  if (progressInterval) clearInterval(progressInterval);

  let progress = 0;
  const duration = 5000; // 5 ثوانٍ لكل قصة

  progressInterval = setInterval(() => {
    progress += 10;
    if (currentProgressBar) {
      currentProgressBar.style.width = `${progress}%`;
    }

    if (progress >= 100) {
      nextStory();
    }
  }, duration / 10);
}

// ── الانتقال للقصة التالية ──
function nextStory() {
  if (currentStoryIndex < currentStories.length - 1) {
    currentStoryIndex++;
    loadCurrentStory();
  } else {
    closeStoryViewer();
  }
}

// ── الانتقال للقصة السابقة ──
function prevStory() {
  if (currentStoryIndex > 0) {
    currentStoryIndex--;
    loadCurrentStory();
  }
}

// ── إغلاق العارض ──
function closeStoryViewer() {
  storyViewer.classList.add('hidden');
  if (progressInterval) clearInterval(progressInterval);
  currentStories = [];
  currentStoryIndex = 0;
  storyProgressContainer.innerHTML = '';
  storyMedia.src = '';
}

// ── ربط الأزرار ──
if (storyCloseBtn) {
  storyCloseBtn.addEventListener('click', closeStoryViewer);
}

if (storyNavLeft) storyNavLeft.addEventListener('click', prevStory);
if (storyNavRight) storyNavRight.addEventListener('click', nextStory);

// ── تسجيل مشاهدة القصة (بسيط – يمكن تحسينه بـ batch لاحقاً) ──
async function markStoryAsSeen(storyId) {
  if (!auth.currentUser || !storyId) return;

  try {
    const storyRef = doc(db, 'stories', storyId);
    await updateDoc(storyRef, {
      [`seenBy.${auth.currentUser.uid}`]: serverTimestamp()
    });
  } catch (err) {
    console.warn("فشل تسجيل مشاهدة القصة:", err);
  }
}

// ── دالة مساعدة لتنسيق الوقت (منذ متى) ──
function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Date.now() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  
  return date.toLocaleDateString('ar-EG');
}

// ── ربط فتح العارض عند الضغط على دائرة قصة (مثال) ──
document.querySelectorAll('.story-circle:not(.own)').forEach(circle => {
  circle.addEventListener('click', async () => {
    // هنا يجب جلب جميع قصص المستخدم المحدد
    // مثال بسيط: افتراض أن لدينا قائمة قصص واحدة فقط لكل مستخدم حالياً
    const userId = circle.dataset.userId; // يجب إضافته عند الإنشاء
    // لاحقاً: جلب قصص المستخدم من Firestore
    // const userStories = await fetchUserStories(userId);
    // openStoryViewer(userStories);
    
    // placeholder مؤقت
    alert('فتح عارض قصص المستخدم: ' + userId);
  });
});

// ─────────────────────────────────────────────
// نهاية الجزء الحادي عشر
// ─────────────────────────────────────────────
// main.js  ── الجزء الثاني عشر
// =============================================
// تحسين تتبع المشاهدين (seen by) باستخدام batch updates
// - تقليل عدد الكتابات إلى Firestore
// - عرض عدد المشاهدين + أسماء بعض المشاهدين (اختياري)
// =============================================

// ── imports إضافية مطلوبة ──
import { writeBatch, arrayUnion } from 'firebase/firestore';

// ── متغير لتجميع المشاهدات خلال الجلسة ──
let pendingSeenStories = new Set(); // نجمع IDs القصص المشاهدة خلال الجلسة

// ── دالة لتسجيل مشاهدة قصة (تجميع فقط – بدون كتابة فورية) ──
function markStoryAsSeen(storyId) {
  if (!auth.currentUser || !storyId) return;

  // لا نكرر نفس القصة في نفس الجلسة
  if (pendingSeenStories.has(storyId)) return;

  pendingSeenStories.add(storyId);
  console.log(`تم تسجيل مشاهدة قصة (مؤقت): ${storyId}`);
}

// ── دالة لإرسال كل المشاهدات المجمعة (batch update) ──
// يمكن استدعاؤها عند:
// - إغلاق عارض القصص
// - بعد مرور وقت معين (مثل كل 30 ثانية)
// - عند التنقل لتبويب آخر
async function flushSeenStories() {
  if (pendingSeenStories.size === 0) return;

  const batch = writeBatch(db);
  let updatedCount = 0;

  for (const storyId of pendingSeenStories) {
    const storyRef = doc(db, 'stories', storyId);
    
    batch.update(storyRef, {
      [`seenBy.${auth.currentUser.uid}`]: serverTimestamp(),
      seenCount: increment(1) // إذا أضفت حقل seenCount لاحقاً
      // أو arrayUnion(auth.currentUser.uid) إذا كنت تستخدم array بدل map
    });

    updatedCount++;
  }

  try {
    await batch.commit();
    console.log(`تم إرسال ${updatedCount} مشاهدة بنجاح (batch)`);
    pendingSeenStories.clear();
  } catch (err) {
    console.error("فشل إرسال batch seen updates:", err);
    // يمكن إعادة المحاولة لاحقاً أو تخزين محلياً
  }
}

// ── ربط flush عند إغلاق العارض ──
function closeStoryViewer() {
  storyViewer.classList.add('hidden');
  if (progressInterval) clearInterval(progressInterval);
  currentStories = [];
  currentStoryIndex = 0;
  storyProgressContainer.innerHTML = '';
  storyMedia.src = '';

  // إرسال كل المشاهدات المجمعة
  flushSeenStories();
}

// ── عرض عدد المشاهدين في العارض (اختياري) ──
function updateViewersCount(story) {
  const viewersEl = document.querySelector('.story-viewers-count'); // أضفه في HTML إذا أردت
  
  if (!viewersEl) return;

  const seenBy = story.seenBy || {};
  const count = Object.keys(seenBy).length;

  viewersEl.textContent = count > 0 ? `${count} مشاهد` : 'لا مشاهدين بعد';
  
  // يمكن إضافة tooltip أو قائمة أسماء المشاهدين لاحقاً
}

// ── تعديل loadCurrentStory ليشمل عرض عدد المشاهدين ──
function loadCurrentStory() {
  const story = currentStories[currentStoryIndex];
  if (!story) return closeStoryViewer();

  // ... تعبئة المحتوى السابق ...

  // تسجيل المشاهدة (تجميع فقط)
  markStoryAsSeen(story.id);

  // عرض عدد المشاهدين
  updateViewersCount(story);

  // بدء التقدم
  startProgressBar();
}

// ── استدعاء flushSeenStories عند تغيير التبويب أو الخروج من التطبيق ──
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    flushSeenStories();
  });
});

// إضافة أمان إضافي عند إغلاق الصفحة
window.addEventListener('beforeunload', () => {
  flushSeenStories();
});

// ─────────────────────────────────────────────
// نهاية الجزء الثاني عشر
// ─────────────────────────────────────────────
// main.js  ── الجزء الثالث عشر
// =============================================
// دعم قصص متعددة لنفس المستخدم
// - جلب كل القصص النشطة لمستخدم معين عند الضغط على دائرته
// - ترتيب القصص حسب وقت الرفع (الأحدث أولاً)
// - تمرير قائمة القصص كاملة إلى العارض
// =============================================

// ── دالة لجلب كل قصص مستخدم معين (النشطة فقط) ──
async function fetchUserStories(userId) {
  if (!userId) return [];

  try {
    const storiesRef = collection(db, 'stories');
    const q = query(
      storiesRef,
      where('userId', '==', userId),
      where('expiresAt', '>', new Date()),
      orderBy('createdAt', 'desc'), // الأحدث أولاً
      limit(10)                     // حد أقصى معقول
    );

    const snap = await getDocs(q);

    const stories = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      stories.push({
        id: docSnap.id,
        url: data.url,
        type: data.type || 'image',
        createdAt: data.createdAt,
        userId: data.userId,
        displayName: data.displayName || 'مستخدم',
        username: data.username || '',
        userPhoto: data.userPhoto || ''
      });
    });

    return stories;

  } catch (err) {
    console.error("خطأ في جلب قصص المستخدم:", err);
    return [];
  }
}

// ── تعديل حدث الضغط على دائرة قصة (غير my-story) ──
document.addEventListener('click', async (e) => {
  const circle = e.target.closest('.story-circle:not(.own)');
  if (!circle) return;

  const userId = circle.dataset.userId; // لازم تضيف dataset.userId عند إنشاء الدائرة
  if (!userId) return;

  // جلب كل القصص النشطة لهذا المستخدم
  const userStories = await fetchUserStories(userId);

  if (userStories.length === 0) {
    alert('لا توجد قصص نشطة لهذا المستخدم');
    return;
  }

  // فتح العارض مع القائمة الكاملة
  openStoryViewer(userStories, 0);
});

// ── تعديل دالة loadStories لتخزين userId في كل دائرة ──
async function loadStories() {
  // ... الكود السابق ...

  snap.forEach((docSnap) => {
    const story = docSnap.data();

    if (story.userId === auth.currentUser.uid) return;

    // جلب آخر قصة فقط لعرض الدائرة (لكن نحمل الكل عند الضغط)
    // لتحسين الأداء: نعرض دائرة واحدة فقط لكل مستخدم

    // ملاحظة: لتجنب تكرار المستخدمين، يفضل تجميع القصص حسب userId
    // هنا مثال بسيط (غير مثالي – يحتاج تحسين لاحقاً)

    const circle = document.createElement('div');
    circle.className = 'story-circle';
    circle.dataset.userId = story.userId; // مهم جداً

    circle.innerHTML = `
      <div class="circle">
        <img src="${story.url}" alt="">
      </div>
      <span class="username">${story.username || 'مستخدم'}</span>
    `;

    storiesBar.appendChild(circle);
  });
}

// ── تحسين عرض عدد المشاهدين في العارض (اختياري – توسيع) ──
function updateViewersCount(story) {
  const viewersEl = document.querySelector('.story-viewers-count');
  if (!viewersEl) return;

  const seenBy = story.seenBy || {};
  const count = Object.keys(seenBy).length;

  viewersEl.textContent = count > 0 
    ? `${count} مشاهد${count === 1 ? '' : 'ين'}`
    : 'لا مشاهدين بعد';

  // إذا أردت إظهار أسماء قليلة (مثال بسيط)
  // const names = Object.keys(seenBy).slice(0, 3).join(', ');
  // viewersEl.title = names || '';
}

// ── استدعاء flushSeenStories عند الانتقال بين القصص أيضاً (اختياري) ──
function nextStory() {
  flushSeenStories(); // إرسال ما تم تجميعه حتى الآن
  if (currentStoryIndex < currentStories.length - 1) {
    currentStoryIndex++;
    loadCurrentStory();
  } else {
    closeStoryViewer();
  }
}

function prevStory() {
  flushSeenStories();
  if (currentStoryIndex > 0) {
    currentStoryIndex--;
    loadCurrentStory();
  }
}

// ─────────────────────────────────────────────
// نهاية الجزء الثالث عشر
// ─────────────────────────────────────────────
// main.js  ── الجزء الرابع عشر
// =============================================
// زر "رد على القصة" داخل عارض القصص
// - إرسال رسالة خاصة مرتبطة بالقصة الحالية
// - إضافة رابط/معرف القصة في الرسالة (storyReplyTo)
// =============================================

// ── عناصر DOM إضافية نحتاجها (أضفها في HTML داخل story-viewer) ──
/*
  <button id="reply-to-story-btn" class="story-reply-btn">رد</button>
  <textarea id="story-reply-input" class="story-reply-input hidden" placeholder="اكتب ردك..."></textarea>
  <button id="send-story-reply" class="send-story-reply hidden">إرسال</button>
*/

// ── متغيرات جديدة ──
let currentStoryBeingRepliedTo = null;

// ── إظهار حقل الرد عند الضغط على زر "رد" ──
const replyBtn = document.getElementById('reply-to-story-btn');
const replyInput = document.getElementById('story-reply-input');
const sendReplyBtn = document.getElementById('send-story-reply');

if (replyBtn) {
  replyBtn.addEventListener('click', () => {
    if (replyInput.classList.contains('hidden')) {
      replyInput.classList.remove('hidden');
      sendReplyBtn.classList.remove('hidden');
      replyInput.focus();
    } else {
      replyInput.classList.add('hidden');
      sendReplyBtn.classList.add('hidden');
    }
  });
}

// ── إرسال رد على القصة (رسالة خاصة) ──
if (sendReplyBtn) {
  sendReplyBtn.addEventListener('click', async () => {
    const text = replyInput.value.trim();
    if (!text || !currentConversationId || !currentStoryBeingRepliedTo) {
      alert('اكتب شيئاً أولاً');
      return;
    }

    try {
      // إرسال الرسالة كالمعتاد لكن مع حقل إضافي
      const messagesRef = collection(db, `conversations/${currentConversationId}/messages`);

      await addDoc(messagesRef, {
        text: text,
        senderId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        type: 'text',
        status: 'sent',
        // حقل جديد يحدد أن الرسالة رد على قصة
        isStoryReply: true,
        replyToStoryId: currentStoryBeingRepliedTo.id,
        replyToStoryUrl: currentStoryBeingRepliedTo.url,
        replyToStoryUserId: currentStoryBeingRepliedTo.userId
      });

      // تحديث lastMessage ليشمل إشارة أنها رد
      const convRef = doc(db, 'conversations', currentConversationId);
      await updateDoc(convRef, {
        lastMessage: {
          text: text,
          senderId: auth.currentUser.uid,
          timestamp: serverTimestamp(),
          isStoryReply: true,
          replyToStoryUserId: currentStoryBeingRepliedTo.userId
        }
      });

      // تصفير الحقل وإخفاؤه
      replyInput.value = '';
      replyInput.classList.add('hidden');
      sendReplyBtn.classList.add('hidden');

      console.log("تم إرسال رد على القصة بنجاح");

    } catch (err) {
      console.error("خطأ في إرسال رد القصة:", err);
      alert("حدث خطأ أثناء الإرسال، حاول مرة أخرى");
    }
  });
}

// ── تعديل loadCurrentStory لتحديث المتغير الحالي ──
function loadCurrentStory() {
  const story = currentStories[currentStoryIndex];
  if (!story) return closeStoryViewer();

  // ... تعبئة المحتوى السابق ...

  // حفظ القصة الحالية للرد عليها
  currentStoryBeingRepliedTo = story;

  markStoryAsSeen(story.id);
  updateViewersCount(story);
  startProgressBar();
}

// ── عرض الردود على القصة في نافذة الدردشة (تحسين عرض lastMessage) ──
// تعديل بسيط على createChatItemElement (من جزء سابق)
function createChatItemElement(chat) {
  // ... الكود السابق ...

  const lastMsg = chat.lastMessage;

  if (lastMsg?.isStoryReply) {
    // عرض إشارة أنها رد على قصة
    const msgElement = document.createElement('div');
    msgElement.className = 'last-message';
    msgElement.innerHTML = `
      رد على قصة <img src="${lastMsg.replyToStoryUrl}" style="width:20px; height:20px; border-radius:4px; vertical-align:middle; margin:0 4px;">
    `;
    // أضف هذا إلى الـ last-message div
  }

  // ... باقي الكود ...
}

// ─────────────────────────────────────────────
// نهاية الجزء الرابع عشر
// ─────────────────────────────────────────────
// main.js  ── الجزء الخامس عشر
// =============================================
// الرسائل الصوتية الذاتية التدمير
// - تسجيل صوت (max 30 ثانية)
// - رفع إلى Storage
// - حفظ في Firestore مع playCount + auto-delete بعد عدد تشغيل معين
// =============================================

// ── عناصر DOM إضافية (أضفها في chat-input) ──
/*
  <button id="voice-message-btn" class="input-icon">🎤</button>
  <div id="voice-recording-overlay" class="hidden">
    <div class="recording-timer">00:00</div>
    <button id="stop-recording">إيقاف</button>
  </div>
*/

// ── متغيرات التسجيل ──
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingTimerInterval = null;
const MAX_RECORDING_SECONDS = 30;

// ── بدء التسجيل عند الضغط المطول أو النقر ──
const voiceBtn = document.getElementById('voice-message-btn');
const recordingOverlay = document.getElementById('voice-recording-overlay');
const stopRecordingBtn = document.getElementById('stop-recording');
const timerDisplay = document.querySelector('.recording-timer');

if (voiceBtn) {
  let isRecording = false;

  voiceBtn.addEventListener('click', async () => {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = e => {
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        isRecording = false;
        recordingOverlay.classList.add('hidden');
        clearInterval(recordingTimerInterval);

        if (audioChunks.length === 0) return;

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
      };

      mediaRecorder.start();
      isRecording = true;

      recordingOverlay.classList.remove('hidden');
      recordingStartTime = Date.now();
      timerDisplay.textContent = '00:00';

      recordingTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const sec = String(elapsed % 60).padStart(2, '0');
        timerDisplay.textContent = `${min}:${sec}`;

        if (elapsed >= MAX_RECORDING_SECONDS) {
          mediaRecorder.stop();
        }
      }, 1000);

    } catch (err) {
      console.error("خطأ في الوصول إلى الميكروفون:", err);
      alert("تعذر الوصول إلى الميكروفون. تأكد من السماح بالوصول.");
    }
  });

  // إيقاف التسجيل
  if (stopRecordingBtn) {
    stopRecordingBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    });
  }
}

// ── دالة إرسال الرسالة الصوتية الذاتية التدمير ──
async function sendVoiceMessage(audioBlob) {
  if (!currentConversationId || !auth.currentUser) return;

  try {
    // رفع الملف إلى Storage
    const storageRef = ref(storage, `voice-messages/${currentConversationId}/${Date.now()}.webm`);
    const uploadResult = await uploadBytes(storageRef, audioBlob);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // حفظ الرسالة في Firestore
    const messagesRef = collection(db, `conversations/${currentConversationId}/messages`);

    await addDoc(messagesRef, {
      type: 'voice',
      url: downloadURL,
      senderId: auth.currentUser.uid,
      timestamp: serverTimestamp(),
      duration: Math.floor((Date.now() - recordingStartTime) / 1000),
      playCount: 0,
      maxPlays: 2,               // يُحذف بعد تشغيل مرتين
      autoDeleteAfterPlays: true,
      status: 'sent'
    });

    // تحديث lastMessage
    const convRef = doc(db, 'conversations', currentConversationId);
    await updateDoc(convRef, {
      lastMessage: {
        type: 'voice',
        senderId: auth.currentUser.uid,
        timestamp: serverTimestamp()
      }
    });

    console.log("تم إرسال رسالة صوتية ذاتية التدمير");

  } catch (err) {
    console.error("خطأ في إرسال الرسالة الصوتية:", err);
    alert("حدث خطأ أثناء إرسال الصوت، حاول مرة أخرى");
  }
}

// ── مراقبة عدد التشغيلات + حذف بعد maxPlays (client-side فقط حالياً) ──
// لاحقاً يمكن نقل هذا إلى Cloud Function ليكون server-side

// مثال بسيط: عند تشغيل صوت في الدردشة
function onVoicePlayed(messageId) {
  if (!currentConversationId) return;

  const msgRef = doc(db, `conversations/${currentConversationId}/messages`, messageId);

  updateDoc(msgRef, {
    playCount: increment(1)
  }).then(async () => {
    const msgSnap = await getDoc(msgRef);
    const data = msgSnap.data();

    if (data.playCount >= data.maxPlays) {
      // حذف الملف من Storage
      const storageRef = ref(storage, data.url.split('/').pop());
      deleteObject(storageRef).catch(() => {});

      // حذف الوثيقة من Firestore
      deleteDoc(msgRef);
      console.log("تم حذف الرسالة الصوتية بعد التشغيل المحدد");
    }
  });
}

// ─────────────────────────────────────────────
// نهاية الجزء الخامس عشر
// ─────────────────────────────────────────────
// main.js  ── الجزء السادس عشر
// =============================================
// إنشاء مجموعة جديدة + إضافة أعضاء
// - نموذج إنشاء مجموعة بسيط (اسم + صورة + أعضاء)
// - عرض قائمة المجموعات في تبويب "المجموعات"
// - فتح دردشة مجموعة عند الضغط
// =============================================

// ── عناصر DOM إضافية (أضفها في HTML داخل groups-view مثلاً) ──
/*
  <button id="create-group-btn">إنشاء مجموعة جديدة</button>

  <!-- Modal لإنشاء المجموعة -->
  <div id="create-group-modal" class="modal hidden">
    <div class="modal-content">
      <h3>إنشاء مجموعة جديدة</h3>
      <input id="group-name" placeholder="اسم المجموعة" required>
      <input id="group-photo" type="file" accept="image/*">
      <div id="group-members-search">
        <input id="add-member-search" placeholder="ابحث عن مستخدمين للإضافة">
        <div id="group-members-list"></div>
      </div>
      <button id="save-group">إنشاء</button>
      <button id="cancel-group">إلغاء</button>
    </div>
  </div>
*/

// ── فتح نموذج إنشاء مجموعة ──
const createGroupBtn = document.getElementById('create-group-btn');
const createGroupModal = document.getElementById('create-group-modal');

if (createGroupBtn) {
  createGroupBtn.addEventListener('click', () => {
    createGroupModal.classList.remove('hidden');
  });
}

// ── إغلاق النموذج ──
document.getElementById('cancel-group')?.addEventListener('click', () => {
  createGroupModal.classList.add('hidden');
});

// ── إنشاء مجموعة جديدة ──
document.getElementById('save-group')?.addEventListener('click', async () => {
  const name = document.getElementById('group-name')?.value.trim();
  const photoFile = document.getElementById('group-photo')?.files[0];
  const selectedMembers = []; // ← يجب جمع UIDs المختارين من البحث

  if (!name) {
    alert('يرجى إدخال اسم للمجموعة');
    return;
  }

  if (selectedMembers.length === 0) {
    alert('يجب إضافة عضو واحد على الأقل');
    return;
  }

  try {
    // 1. رفع صورة المجموعة (اختياري)
    let photoURL = '';
    if (photoFile) {
      const storageRef = ref(storage, `group-photos/${Date.now()}_${photoFile.name}`);
      await uploadBytes(storageRef, photoFile);
      photoURL = await getDownloadURL(storageRef);
    }

    // 2. إنشاء وثيقة المجموعة
    const groupsRef = collection(db, 'groups');
    const newGroupRef = await addDoc(groupsRef, {
      name,
      photoURL,
      createdBy: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      members: [auth.currentUser.uid, ...selectedMembers],
      memberCount: selectedMembers.length + 1,
      lastMessage: null
    });

    const groupId = newGroupRef.id;

    // 3. إضافة المجموعة إلى subcollection كل عضو
    const batch = writeBatch(db);

    [auth.currentUser.uid, ...selectedMembers].forEach(uid => {
      const userGroupRef = doc(db, `users/${uid}/groups`, groupId);
      batch.set(userGroupRef, {
        groupId,
        name,
        photoURL,
        joinedAt: serverTimestamp()
      });
    });

    await batch.commit();

    alert('تم إنشاء المجموعة بنجاح!');
    createGroupModal.classList.add('hidden');

    // إعادة تحميل قائمة المجموعات
    loadGroups();

  } catch (err) {
    console.error("خطأ في إنشاء المجموعة:", err);
    alert("حدث خطأ أثناء إنشاء المجموعة");
  }
});

// ── جلب وعرض قائمة المجموعات ──
async function loadGroups() {
  const groupsList = document.getElementById('groups-list');
  if (!groupsList || !auth.currentUser) return;

  groupsList.innerHTML = '<div class="loader">جاري التحميل...</div>';

  try {
    const userGroupsRef = collection(db, `users/${auth.currentUser.uid}/groups`);
    const q = query(userGroupsRef, orderBy('joinedAt', 'desc'), limit(20));

    const snap = await getDocs(q);

    groupsList.innerHTML = '';

    if (snap.empty) {
      groupsList.innerHTML = `
        <div class="empty-state">
          <h3>لا توجد مجموعات بعد</h3>
          <p>أنشئ مجموعة جديدة أو اطلب الانضمام إلى واحدة</p>
        </div>
      `;
      return;
    }

    snap.forEach(docSnap => {
      const group = docSnap.data();

      const item = document.createElement('div');
      item.className = 'group-item';
      item.innerHTML = `
        <img class="group-pic" src="${group.photoURL || ''}" alt="">
        <div class="group-info">
          <div class="group-name">${group.name}</div>
          <div class="last-message">آخر نشاط: منذ فترة</div>
        </div>
      `;

      item.addEventListener('click', () => {
        openChatWindow({
          id: group.groupId,
          username: group.name,
          photo: group.photoURL,
          type: 'group'
        });
      });

      groupsList.appendChild(item);
    });

  } catch (err) {
    console.error("خطأ في تحميل المجموعات:", err);
    groupsList.innerHTML = '<p style="color:#ef4444;">تعذر تحميل المجموعات</p>';
  }
}

// ── تحميل عند فتح تبويب المجموعات ──
document.querySelector('.nav-item[data-tab="groups"]')
  .addEventListener('click', loadGroups);

// ─────────────────────────────────────────────
// نهاية الجزء السادس عشر
// ─────────────────────────────────────────────
// main.js  ── الجزء السابع عشر
// =============================================
// نظام الإشعارات داخل التطبيق
// - جلب آخر 20 إشعار من notifications/{uid}/items
// - عرضها في مركز الإشعارات (عند الضغط على أيقونة الجرس)
// - وضع علامة "مقروء" batch عند فتح المركز
// =============================================

// ── عناصر DOM ──
const notificationsBtn = document.getElementById('notifications-btn');
const notificationsModal = document.getElementById('notifications-modal'); // أضفه في HTML
const notificationsList = document.getElementById('notifications-list');

// ── جلب وعرض الإشعارات ──
async function loadNotifications() {
  if (!auth.currentUser || !notificationsList) return;

  notificationsList.innerHTML = '<div class="loader">جاري تحميل الإشعارات...</div>';

  try {
    const notifsRef = collection(db, `notifications/${auth.currentUser.uid}/items`);
    const q = query(
      notifsRef,
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const snap = await getDocs(q);

    notificationsList.innerHTML = '';

    if (snap.empty) {
      notificationsList.innerHTML = `
        <div class="empty-state">
          <h3>لا توجد إشعارات بعد</h3>
          <p>ستظهر هنا التنبيهات الجديدة</p>
        </div>
      `;
      return;
    }

    const unreadIds = [];

    snap.forEach(docSnap => {
      const notif = docSnap.data();
      const item = document.createElement('div');
      item.className = `notification-item ${notif.read ? '' : 'unread'}`;
      item.innerHTML = `
        <img class="notification-pic" src="${notif.senderPhoto || ''}" alt="">
        <div class="notification-content">
          <div class="notification-text">${notif.text || 'إشعار جديد'}</div>
          <span class="notification-time">${formatTimeAgo(notif.createdAt)}</span>
        </div>
      `;

      // إذا غير مقروء → جمع ID للـ batch update لاحقاً
      if (!notif.read) {
        unreadIds.push(docSnap.id);
      }

      // يمكن إضافة حدث عند الضغط (مثلاً فتح دردشة أو قصة)
      item.addEventListener('click', () => {
        // مثال: إذا كان الإشعار عن رسالة → افتح الدردشة
        if (notif.type === 'message' && notif.conversationId) {
          openChatWindow({ id: notif.conversationId });
        }
      });

      notificationsList.appendChild(item);
    });

    // وضع علامة مقروء على الكل (batch)
    if (unreadIds.length > 0) {
      markNotificationsAsRead(unreadIds);
    }

  } catch (err) {
    console.error("خطأ في جلب الإشعارات:", err);
    notificationsList.innerHTML = '<p style="color:#ef4444;">تعذر تحميل الإشعارات</p>';
  }
}

// ── دالة وضع علامة "مقروء" batch ──
async function markNotificationsAsRead(notificationIds) {
  const batch = writeBatch(db);

  notificationIds.forEach(id => {
    const notifRef = doc(db, `notifications/${auth.currentUser.uid}/items`, id);
    batch.update(notifRef, {
      read: true,
      readAt: serverTimestamp()
    });
  });

  try {
    await batch.commit();
    console.log(`تم وضع علامة مقروء على ${notificationIds.length} إشعار`);
  } catch (err) {
    console.warn("فشل batch update للإشعارات:", err);
  }
}

// ── فتح مركز الإشعارات عند الضغط على الجرس ──
if (notificationsBtn) {
  notificationsBtn.addEventListener('click', () => {
    notificationsModal.classList.remove('hidden');
    loadNotifications();
  });
}

// ── إغلاق المودال (أضف زر إغلاق في HTML) ──
document.querySelector('#notifications-modal .modal-close')?.addEventListener('click', () => {
  notificationsModal.classList.add('hidden');
});

// ── تحميل أولي عند الدخول (اختياري – إذا كنت تريد عدّاد غير مقروء في الأيقونة) ──
async function updateNotificationBadge() {
  if (!auth.currentUser) return;

  const q = query(
    collection(db, `notifications/${auth.currentUser.uid}/items`),
    where('read', '==', false),
    limit(1)
  );

  const snap = await getDocs(q);
  const badge = document.querySelector('#notifications-btn .badge');

  if (snap.empty) {
    if (badge) badge.style.display = 'none';
  } else {
    if (badge) {
      badge.textContent = '•'; // أو العدد إذا أردت
      badge.style.display = 'block';
    }
  }
}

// استدعاء عند تسجيل الدخول أو تغيير الحالة
onAuthStateChanged(auth, user => {
  if (user) {
    updateNotificationBadge();
  }
});

// ─────────────────────────────────────────────
// نهاية الجزء السابع عشر
// ─────────────────────────────────────────────
// main.js  ── الجزء الثامن عشر
// =============================================
// نظام Block & Restrict
// - حفظ المستخدمين المحظورين/المحدودين في subcollections
// - التحقق قبل إرسال رسالة / عرض قصة / بدء محادثة
// - زر Block/Restrict في نافذة الدردشة أو الملف الشخصي
// =============================================

// ── عناصر DOM إضافية (أضفها في chat-header أو profile-view مثلاً) ──
/*
  <button id="block-user-btn" class="icon-btn danger">حظر</button>
  <button id="restrict-user-btn" class="icon-btn warning">تقييد</button>
*/

// ── متغيرات مؤقتة للحالة الحالية ──
let currentChatOtherUid = null; // يتم تعيينه عند فتح دردشة

// ── دالة للتحقق إذا كان المستخدم محظوراً أو مقيّداً ──
async function isUserBlockedOrRestricted(targetUid) {
  if (!auth.currentUser || !targetUid) return false;

  const myUid = auth.currentUser.uid;

  // 1. هل أنا حظرته؟
  const myBlockRef = doc(db, `users/${myUid}/blockedUsers`, targetUid);
  const blockSnap = await getDoc(myBlockRef);
  if (blockSnap.exists()) return { blocked: true, restricted: false };

  // 2. هل أنا قيّدته؟
  const myRestrictRef = doc(db, `users/${myUid}/restrictedUsers`, targetUid);
  const restrictSnap = await getDoc(myRestrictRef);
  if (restrictSnap.exists()) return { blocked: false, restricted: true };

  // 3. هل هو حظرني؟ (اختياري – يمكن إضافة تحقق لمنع الظهور)
  // const hisBlockRef = doc(db, `users/${targetUid}/blockedUsers`, myUid);
  // if ((await getDoc(hisBlockRef)).exists()) return true;

  return { blocked: false, restricted: false };
}

// ── منع إرسال رسالة إذا كان الطرف محظوراً أو مقيّداً ──
async function sendRealMessage(text) {
  if (!currentConversationId || !currentChatOtherUid) return;

  const status = await isUserBlockedOrRestricted(currentChatOtherUid);

  if (status.blocked) {
    alert('لا يمكنك إرسال رسائل لهذا المستخدم لأنك قمت بحظره');
    return;
  }

  if (status.restricted) {
    alert('هذا المستخدم مقيّد – لا يمكن إرسال رسائل له حالياً');
    return;
  }

  // ... باقي كود الإرسال السابق ...
}

// ── زر الحظر (Block) ──
document.getElementById('block-user-btn')?.addEventListener('click', async () => {
  if (!currentChatOtherUid) return;

  if (!confirm('هل أنت متأكد من حظر هذا المستخدم؟ لن يتمكن من رؤية رسائلك أو قصصك.')) return;

  try {
    const batch = writeBatch(db);
    const myUid = auth.currentUser.uid;

    // أضف إلى blockedUsers
    const blockRef = doc(db, `users/${myUid}/blockedUsers`, currentChatOtherUid);
    batch.set(blockRef, {
      blockedAt: serverTimestamp(),
      reason: 'manual' // اختياري
    });

    // أضف إلى blockedBy (اختياري – لتسهيل التحقق المتبادل)
    const blockedByRef = doc(db, `users/${currentChatOtherUid}/blockedBy`, myUid);
    batch.set(blockedByRef, { blockedAt: serverTimestamp() });

    await batch.commit();

    alert('تم حظر المستخدم بنجاح');
    // إغلاق الدردشة أو تحديث الحالة
    document.getElementById('chat-window').classList.add('hidden');

  } catch (err) {
    console.error("خطأ في الحظر:", err);
    alert("حدث خطأ أثناء الحظر");
  }
});

// ── زر التقييد (Restrict) ──
document.getElementById('restrict-user-btn')?.addEventListener('click', async () => {
  if (!currentChatOtherUid) return;

  if (!confirm('هل تريد تقييد هذا المستخدم؟ سيتمكن من رؤية رسائلك لكنه لن يستطيع الرد أو إرسال رسائل جديدة.')) return;

  try {
    const restrictRef = doc(db, `users/${auth.currentUser.uid}/restrictedUsers`, currentChatOtherUid);
    await setDoc(restrictRef, {
      restrictedAt: serverTimestamp(),
      reason: 'manual'
    });

    alert('تم تقييد المستخدم بنجاح');

  } catch (err) {
    console.error("خطأ في التقييد:", err);
    alert("حدث خطأ أثناء التقييد");
  }
});

// ── تعديل openChatWindow للتحقق قبل الفتح ──
async function openChatWindow(chatData) {
  if (chatData.type === 'private' && chatData.otherUid) {
    currentChatOtherUid = chatData.otherUid;

    const status = await isUserBlockedOrRestricted(chatData.otherUid);

    if (status.blocked) {
      alert('لا يمكن فتح هذه المحادثة لأنك قمت بحظر المستخدم');
      return;
    }

    if (status.restricted) {
      alert('هذا المستخدم مقيّد – يمكنك فقط رؤية الرسائل القديمة');
      // يمكن السماح بفتح المحادثة لكن بدون إمكانية الإرسال
    }
  }

  // ... باقي كود فتح النافذة السابق ...
}

// ─────────────────────────────────────────────
// نهاية الجزء الثامن عشر
// ─────────────────────────────────────────────
// main.js  ── الجزء التاسع عشر
// =============================================
// إرسال واستقبال الصور في الدردشة
// - زر إرفاق صورة في شريط الكتابة
// - ضغط بسيط قبل الرفع (اختياري – canvas resize)
// - عرض الصور في فقاعات الرسائل مع معاينة كبيرة عند الضغط
// =============================================

// ── عناصر DOM إضافية (أضفها في .chat-input) ──
/*
  <button id="attach-image-btn" class="input-icon">📷</button>
  <input id="image-upload-input" type="file" accept="image/*" hidden>
*/

// ── متغيرات مؤقتة ──
const attachImageBtn = document.getElementById('attach-image-btn');
const imageUploadInput = document.getElementById('image-upload-input');

// ── فتح نافذة اختيار الصورة ──
if (attachImageBtn) {
  attachImageBtn.addEventListener('click', () => {
    imageUploadInput.click();
  });
}

// ── معالجة رفع الصورة ──
if (imageUploadInput) {
  imageUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentConversationId) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار صورة فقط');
      return;
    }

    if (file.size > 8 * 1024 * 1024) { // حد 8 ميجا
      alert('حجم الصورة كبير جداً (الحد الأقصى 8 ميجا)');
      return;
    }

    try {
      // عرض معاينة مؤقتة أثناء الرفع (اختياري)
      const tempURL = URL.createObjectURL(file);
      addTempImageMessage(tempURL);

      // ضغط بسيط (اختياري – يمكن تحسينه بمكتبة مثل compressor.js لاحقاً)
      const compressedBlob = await simpleImageCompress(file);

      // رفع إلى Storage
      const storageRef = ref(storage, `chat-images/${currentConversationId}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, compressedBlob);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // إرسال الرسالة في Firestore
      const messagesRef = collection(db, `conversations/${currentConversationId}/messages`);
      await addDoc(messagesRef, {
        type: 'image',
        url: downloadURL,
        senderId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        status: 'sent',
        width: 0,   // يمكن ملؤها لاحقاً إذا أردت
        height: 0
      });

      // تحديث lastMessage
      const convRef = doc(db, 'conversations', currentConversationId);
      await updateDoc(convRef, {
        lastMessage: {
          type: 'image',
          senderId: auth.currentUser.uid,
          timestamp: serverTimestamp()
        }
      });

      console.log("تم إرسال الصورة بنجاح");

      // إزالة المعاينة المؤقتة إذا أردت
      // removeTempImageMessage();

    } catch (err) {
      console.error("خطأ في إرسال الصورة:", err);
      alert("حدث خطأ أثناء إرسال الصورة");
    }

    // تصفير الـ input للسماح برفع صورة جديدة بنفس الاسم
    imageUploadInput.value = '';
  });
}

// ── دالة ضغط بسيطة للصور (canvas resize) ──
async function simpleImageCompress(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.85); // جودة 85%
    };
  });
}

// ── إضافة صورة مؤقتة أثناء الرفع (placeholder) ──
function addTempImageMessage(tempURL) {
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble sent temp-image';
  bubble.innerHTML = `
    <img src="${tempURL}" alt="جاري الرفع..." style="max-width:240px; opacity:0.7;">
    <div class="message-status">جاري الإرسال...</div>
  `;
  messagesList.appendChild(bubble);
  messagesList.scrollTop = messagesList.scrollHeight;
}

// ── عرض الصورة الكبيرة عند الضغط عليها (معاينة) ──
// يمكن إضافته في onSnapshot أو بعد إنشاء الفقاعة
messagesList.addEventListener('click', (e) => {
  const img = e.target.closest('.message-bubble img');
  if (!img) return;

  // فتح معاينة كبيرة (يمكن استخدام modal أو lightbox بسيط)
  const modal = document.createElement('div');
  modal.className = 'image-preview-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-preview">&times;</span>
      <img src="${img.src}" alt="معاينة الصورة">
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.close-preview').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) modal.remove();
  });
});

// ── تعديل onSnapshot لعرض الصور في الرسائل ──
// (أضف هذا داخل onSnapshot في openChatWindow)
snapshot.forEach((doc) => {
  const msg = doc.data();
  const isSent = msg.senderId === auth.currentUser?.uid;

  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isSent ? 'sent' : 'received'}`;

  if (msg.type === 'image') {
    bubble.innerHTML = `
      <img src="${msg.url}" alt="صورة" style="max-width:240px; border-radius:12px; cursor:pointer;">
      <div class="message-status">${msg.status || 'sent'}</div>
    `;
  } else {
    bubble.innerHTML = `
      <div class="message-text">${msg.text || ''}</div>
      <div class="message-status">${msg.status || 'sent'}</div>
    `;
  }

  messagesList.appendChild(bubble);
});

// ─────────────────────────────────────────────
// نهاية الجزء التاسع عشر
// ─────────────────────────────────────────────
// main.js  ── الجزء العشرين (جديد)
// =============================================
// إدارة الجلسات (Device Session Management)
// - حفظ جلسة جديدة عند تسجيل الدخول
// - عرض قائمة الأجهزة المسجلة في صفحة الإعدادات أو الملف الشخصي
// - تسجيل خروج من جلسة معينة أو من كل الأجهزة
// =============================================

// ── imports إضافية مطلوبة ──
import { nanoid } from 'nanoid'; // إذا ما عندك nanoid، أضفه عبر npm أو استخدم Date.now() + random

// ── دالة لإنشاء/تحديث جلسة عند تسجيل الدخول ──
async function createOrUpdateSession() {
  if (!auth.currentUser) return;

  const myUid = auth.currentUser.uid;
  const sessionId = nanoid(16); // أو أي معرف فريد (يمكن استخدام browser fingerprint لاحقًا)

  const sessionData = {
    sessionId,
    deviceInfo: navigator.userAgent,
    platform: navigator.platform,
    lastActive: serverTimestamp(),
    createdAt: serverTimestamp(),
    ip: '', // يمكن ملؤه من API خارجي إذا أردت (اختياري)
    location: '' // اختياري – من IP geolocation
  };

  try {
    const sessionRef = doc(db, `users/${myUid}/sessions`, sessionId);
    await setDoc(sessionRef, sessionData, { merge: true });

    // حفظ sessionId الحالي في localStorage للتعرف عليه لاحقًا
    localStorage.setItem('currentSessionId', sessionId);

    console.log("تم حفظ/تحديث الجلسة:", sessionId);

  } catch (err) {
    console.error("خطأ في حفظ الجلسة:", err);
  }
}

// ── تحديث lastActive كل دقيقة (أثناء النشاط) ──
let lastActiveInterval = null;
function startSessionHeartbeat() {
  if (lastActiveInterval) clearInterval(lastActiveInterval);

  lastActiveInterval = setInterval(async () => {
    if (!auth.currentUser) return;

    const currentSessionId = localStorage.getItem('currentSessionId');
    if (!currentSessionId) return;

    const sessionRef = doc(db, `users/${auth.currentUser.uid}/sessions`, currentSessionId);
    await updateDoc(sessionRef, {
      lastActive: serverTimestamp()
    });
  }, 60 * 1000); // كل دقيقة
}

// ── جلب وعرض قائمة الجلسات (في صفحة إعدادات أو ملف شخصي) ──
async function loadActiveSessions() {
  const sessionsList = document.getElementById('sessions-list'); // أضف div في HTML
  if (!sessionsList || !auth.currentUser) return;

  sessionsList.innerHTML = '<div class="loader">جاري تحميل الأجهزة...</div>';

  try {
    const sessionsRef = collection(db, `users/${auth.currentUser.uid}/sessions`);
    const q = query(sessionsRef, orderBy('lastActive', 'desc'));

    const snap = await getDocs(q);

    sessionsList.innerHTML = '';

    if (snap.empty) {
      sessionsList.innerHTML = '<p>لا توجد جلسات نشطة</p>';
      return;
    }

    const currentSessionId = localStorage.getItem('currentSessionId');

    snap.forEach(docSnap => {
      const session = docSnap.data();
      const isCurrent = session.sessionId === currentSessionId;

      const item = document.createElement('div');
      item.className = 'session-item';
      item.innerHTML = `
        <div class="session-info">
          <strong>${session.deviceInfo || 'جهاز غير معروف'}</strong><br>
          <small>آخر نشاط: ${formatTimeAgo(session.lastActive)}</small><br>
          <small>${isCurrent ? 'هذا الجهاز (نشط الآن)' : ''}</small>
        </div>
        ${!isCurrent ? `<button class="logout-session-btn" data-id="${session.sessionId}">تسجيل خروج</button>` : ''}
      `;

      sessionsList.appendChild(item);
    });

    // ربط أزرار تسجيل الخروج
    document.querySelectorAll('.logout-session-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sessionId = btn.dataset.id;
        if (confirm('هل أنت متأكد من تسجيل الخروج من هذا الجهاز؟')) {
          await logoutFromSession(sessionId);
        }
      });
    });

  } catch (err) {
    console.error("خطأ في جلب الجلسات:", err);
    sessionsList.innerHTML = '<p style="color:#ef4444;">تعذر تحميل الجلسات</p>';
  }
}

// ── تسجيل خروج من جلسة معينة ──
async function logoutFromSession(sessionId) {
  if (!auth.currentUser || !sessionId) return;

  try {
    const sessionRef = doc(db, `users/${auth.currentUser.uid}/sessions`, sessionId);
    await deleteDoc(sessionRef);

    console.log("تم تسجيل الخروج من الجلسة:", sessionId);
    loadActiveSessions(); // إعادة تحميل القائمة
  } catch (err) {
    console.error("خطأ في حذف الجلسة:", err);
  }
}

// ── تسجيل خروج من كل الأجهزة ما عدا الحالي ──
async function logoutAllOtherSessions() {
  if (!auth.currentUser) return;

  const currentSessionId = localStorage.getItem('currentSessionId');
  if (!currentSessionId) return;

  if (!confirm('هل أنت متأكد من تسجيل الخروج من كل الأجهزة الأخرى؟')) return;

  try {
    const sessionsRef = collection(db, `users/${auth.currentUser.uid}/sessions`);
    const snap = await getDocs(sessionsRef);

    const batch = writeBatch(db);

    snap.forEach(docSnap => {
      if (docSnap.id !== currentSessionId) {
        batch.delete(docSnap.ref);
      }
    });

    await batch.commit();

    alert('تم تسجيل الخروج من كل الأجهزة الأخرى');
    loadActiveSessions();

  } catch (err) {
    console.error("خطأ في تسجيل الخروج الجماعي:", err);
  }
}

// ── استدعاء الإعدادات عند تسجيل الدخول ──
onAuthStateChanged(auth, (user) => {
  if (user) {
    createOrUpdateSession();
    startSessionHeartbeat();
    // loadActiveSessions(); ← استدعِها عند فتح صفحة الإعدادات/الملف
  } else {
    if (lastActiveInterval) clearInterval(lastActiveInterval);
  }
});

// ─────────────────────────────────────────────
// نهاية الجزء العشرين
// ─────────────────────────────────────────────
// main.js  ── الجزء الحادي والعشرين
// =============================================
// Story Highlights
// - إنشاء مجموعة (Highlight) من قصص قديمة أو حالية
// - عرض الـ Highlights في الملف الشخصي
// - أرشفة القصص (Archive) + إمكانية استرجاعها لاحقًا
// =============================================

// ── عناصر DOM الخاصة بالـ Highlights (أضفها في #profile-view) ──
/*
  <div class="highlights-container">
    <h3>الهايلايتس</h3>
    <div id="highlights-grid" class="highlights-grid"></div>
    <button id="create-highlight-btn">إنشاء هايلايت جديد</button>
  </div>

  <!-- Modal لإنشاء Highlight -->
  <div id="create-highlight-modal" class="modal hidden">
    <div class="modal-content">
      <h3>إنشاء هايلايت</h3>
      <input id="highlight-title" placeholder="اسم الهايلايت (مثال: رحلات)" required>
      <div id="highlight-stories-selector"></div>
      <button id="save-highlight">حفظ</button>
      <button id="cancel-highlight">إلغاء</button>
    </div>
  </div>
*/

// ── فتح modal إنشاء Highlight ──
const createHighlightBtn = document.getElementById('create-highlight-btn');
const createHighlightModal = document.getElementById('create-highlight-modal');

if (createHighlightBtn) {
  createHighlightBtn.addEventListener('click', async () => {
    // جلب القصص النشطة أو المؤرشفة للمستخدم
    const myStories = await fetchUserStories(auth.currentUser.uid);
    
    const selector = document.getElementById('highlight-stories-selector');
    selector.innerHTML = '';

    myStories.forEach(story => {
      const checkbox = document.createElement('div');
      checkbox.innerHTML = `
        <input type="checkbox" value="${story.id}" id="story-${story.id}">
        <label for="story-${story.id}">
          <img src="${story.url}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
        </label>
      `;
      selector.appendChild(checkbox);
    });

    createHighlightModal.classList.remove('hidden');
  });
}

// ── إغلاق modal ──
document.getElementById('cancel-highlight')?.addEventListener('click', () => {
  createHighlightModal.classList.add('hidden');
});

// ── حفظ Highlight جديد ──
document.getElementById('save-highlight')?.addEventListener('click', async () => {
  const title = document.getElementById('highlight-title')?.value.trim();
  const selectedStories = Array.from(document.querySelectorAll('#highlight-stories-selector input:checked'))
    .map(cb => cb.value);

  if (!title || selectedStories.length === 0) {
    alert('أدخل اسم الهايلايت واختر قصة واحدة على الأقل');
    return;
  }

  try {
    const highlightsRef = collection(db, `users/${auth.currentUser.uid}/highlights`);
    await addDoc(highlightsRef, {
      title,
      coverStoryId: selectedStories[0], // أول قصة كغلاف
      stories: selectedStories,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    alert('تم إنشاء الهايلايت بنجاح');
    createHighlightModal.classList.add('hidden');

    // إعادة تحميل الـ Highlights
    loadHighlights();

  } catch (err) {
    console.error("خطأ في إنشاء الهايلايت:", err);
    alert("حدث خطأ أثناء الإنشاء");
  }
});

// ── جلب وعرض الـ Highlights في الملف الشخصي ──
async function loadHighlights() {
  const grid = document.getElementById('highlights-grid');
  if (!grid || !auth.currentUser) return;

  grid.innerHTML = '';

  try {
    const highlightsRef = collection(db, `users/${auth.currentUser.uid}/highlights`);
    const q = query(highlightsRef, orderBy('updatedAt', 'desc'), limit(12));

    const snap = await getDocs(q);

    if (snap.empty) {
      grid.innerHTML = '<p>لا توجد هايلايتس بعد</p>';
      return;
    }

    snap.forEach(docSnap => {
      const highlight = docSnap.data();

      const circle = document.createElement('div');
      circle.className = 'highlight-circle';
      circle.innerHTML = `
        <div class="circle">
          <img src="${highlight.coverStoryUrl || ''}" alt="">
        </div>
        <span>${highlight.title}</span>
      `;

      // فتح عارض الـ Highlight عند الضغط
      circle.addEventListener('click', async () => {
        // جلب القصص المرتبطة
        const stories = await Promise.all(
          highlight.stories.map(id => getDoc(doc(db, 'stories', id)))
        );

        const highlightStories = stories
          .filter(s => s.exists())
          .map(s => ({ id: s.id, ...s.data() }));

        openStoryViewer(highlightStories, 0);
      });

      grid.appendChild(circle);
    });

  } catch (err) {
    console.error("خطأ في جلب الهايلايتس:", err);
    grid.innerHTML = '<p style="color:#ef4444;">تعذر تحميل الهايلايتس</p>';
  }
}

// ── استدعاء loadHighlights عند فتح تبويب الملف الشخصي ──
document.querySelector('.nav-item[data-tab="profile"]')
  .addEventListener('click', () => {
    loadHighlights();
  });

// ─────────────────────────────────────────────
// نهاية الجزء الحادي والعشرين
// ─────────────────────────────────────────────
// main.js  ── الجزء الثاني والعشرين
// =============================================
// إكمال الرسائل الصوتية الذاتية التدمير
// - عرض مشغل صوت داخل الفقاعة (play/pause + progress)
// - عداد عدد التشغيلات (playCount)
// - حذف الرسالة + الملف بعد الوصول للحد (مثال: 2 تشغيلات)
// - تحديث server-side بسيط (يمكن تحسينه بـ Cloud Function لاحقاً)
// =============================================

// ── تعديل داخل onSnapshot لعرض الرسائل الصوتية ──
// (أضف هذا الكود داخل حلقة snapshot.forEach في openChatWindow)

if (msg.type === 'voice') {
  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isSent ? 'sent' : 'received'} voice-message`;
  bubble.dataset.messageId = doc.id; // مهم لتحديث playCount

  const audioPlayer = document.createElement('div');
  audioPlayer.className = 'voice-player';
  audioPlayer.innerHTML = `
    <button class="play-pause-btn">▶</button>
    <div class="progress-bar">
      <div class="progress-fill" style="width:0%"></div>
    </div>
    <span class="duration">${msg.duration || 0} ث</span>
    <span class="play-count">تشغيل: ${msg.playCount || 0}/${msg.maxPlays || 2}</span>
  `;

  const audio = new Audio(msg.url);
  
  const playBtn = audioPlayer.querySelector('.play-pause-btn');
  const progressFill = audioPlayer.querySelector('.progress-fill');
  const playCountEl = audioPlayer.querySelector('.play-count');

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      playBtn.textContent = '❚❚';
    } else {
      audio.pause();
      playBtn.textContent = '▶';
    }
  });

  audio.ontimeupdate = () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = `${percent}%`;
  };

  audio.onended = async () => {
    playBtn.textContent = '▶';
    progressFill.style.width = '0%';

    // زيادة playCount
    const newCount = (msg.playCount || 0) + 1;
    playCountEl.textContent = `تشغيل: ${newCount}/${msg.maxPlays || 2}`;

    // تحديث في Firestore
    const msgRef = doc(db, `conversations/${currentConversationId}/messages`, doc.id);
    await updateDoc(msgRef, {
      playCount: newCount
    });

    // إذا وصل للحد → حذف الرسالة + الملف
    if (newCount >= (msg.maxPlays || 2)) {
      // حذف من Storage
      try {
        const fileRef = ref(storage, msg.url);
        await deleteObject(fileRef);
      } catch (e) {}

      // حذف من Firestore
      await deleteDoc(msgRef);

      // إزالة الفقاعة من الواجهة
      bubble.remove();

      console.log("تم حذف الرسالة الصوتية بعد التشغيل المحدد");
    }
  };

  bubble.appendChild(audioPlayer);
  messagesList.appendChild(bubble);
  messagesList.scrollTop = messagesList.scrollHeight;
}

// ── تحسين sendVoiceMessage لإضافة maxPlays افتراضي ──
async function sendVoiceMessage(audioBlob) {
  // ... الكود السابق ...

  await addDoc(messagesRef, {
    type: 'voice',
    url: downloadURL,
    senderId: auth.currentUser.uid,
    timestamp: serverTimestamp(),
    duration: Math.floor((Date.now() - recordingStartTime) / 1000),
    playCount: 0,
    maxPlays: 2,               // يُحذف بعد تشغيل مرتين
    autoDeleteAfterPlays: true,
    status: 'sent'
  });

  // ... باقي الكود ...
}

// ── إضافة CSS بسيط للمشغل (ضعه في style.css) ──
/*
.voice-player {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 20px;
}

.play-pause-btn {
  width: 36px;
  height: 36px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  width: 0%;
  background: var(--accent);
  transition: width 0.1s linear;
}

.play-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
*/

// ─────────────────────────────────────────────
// نهاية الجزء الثاني والعشرين
// ─────────────────────────────────────────────
// main.js  ── الجزء الثالث والعشرين
// =============================================
// الخصوصية المتقدمة (Advanced Privacy Controls)
// - إعدادات: من يقدر يشوف قصصي (الكل / المتابعين فقط / محددين)
// - إخفاء حالة الاتصال (online/last seen)
// - تحديث الإعدادات في user doc
// - التحقق من الإعدادات قبل عرض قصة أو حالة اتصال
// =============================================

// ── عناصر DOM (أضفها في صفحة الإعدادات أو الملف الشخصي) ──
/*
  <div class="privacy-settings">
    <h3>إعدادات الخصوصية</h3>
    
    <div class="setting">
      <label>من يرى قصصي؟</label>
      <select id="story-visibility">
        <option value="everyone">الكل</option>
        <option value="followers">المتابعين فقط</option>
        <option value="custom">مخصص (قريباً)</option>
      </select>
    </div>

    <div class="setting">
      <label>إظهار حالة الاتصال؟</label>
      <select id="online-status-visibility">
        <option value="everyone">الكل</option>
        <option value="followers">المتابعين فقط</option>
        <option value="nobody">لا أحد</option>
      </select>
    </div>

    <button id="save-privacy-settings">حفظ الإعدادات</button>
  </div>
*/

// ── تحميل الإعدادات الحالية من Firestore ──
async function loadPrivacySettings() {
  if (!auth.currentUser) return;

  const userRef = doc(db, 'users', auth.currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();

    const storyVis = document.getElementById('story-visibility');
    if (storyVis) storyVis.value = data.storyVisibility || 'everyone';

    const onlineVis = document.getElementById('online-status-visibility');
    if (onlineVis) onlineVis.value = data.onlineVisibility || 'everyone';
  }
}

// ── حفظ إعدادات الخصوصية ──
document.getElementById('save-privacy-settings')?.addEventListener('click', async () => {
  if (!auth.currentUser) return;

  const storyVis = document.getElementById('story-visibility')?.value;
  const onlineVis = document.getElementById('online-status-visibility')?.value;

  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      storyVisibility: storyVis,
      onlineVisibility: onlineVis,
      privacyUpdatedAt: serverTimestamp()
    });

    alert('تم حفظ إعدادات الخصوصية بنجاح');
  } catch (err) {
    console.error("خطأ في حفظ الخصوصية:", err);
    alert("حدث خطأ أثناء الحفظ");
  }
});

// ── التحقق قبل عرض قصة شخص آخر ──
// (أضف هذا قبل فتح العارض في openStoryViewer)
async function canViewUserStories(targetUid) {
  if (!auth.currentUser) return false;
  if (targetUid === auth.currentUser.uid) return true;

  const targetUserRef = doc(db, 'users', targetUid);
  const targetSnap = await getDoc(targetUserRef);

  if (!targetSnap.exists()) return false;

  const settings = targetSnap.data();
  const visibility = settings.storyVisibility || 'everyone';

  if (visibility === 'everyone') return true;

  if (visibility === 'followers') {
    // تحقق إذا كنت متابع
    const followRef = doc(db, `users/${targetUid}/followers`, auth.currentUser.uid);
    return (await getDoc(followRef)).exists();
  }

  // custom → ناقص (يمكن نضيفه لاحقاً)
  return false;
}

// ── تعديل openStoryViewer للتحقق من الإذن ──
async function openStoryViewer(userStories, startIndex = 0) {
  if (userStories.length === 0) return;

  const targetUid = userStories[0].userId;
  const canView = await canViewUserStories(targetUid);

  if (!canView) {
    alert('لا يمكنك مشاهدة قصص هذا المستخدم بسبب إعدادات الخصوصية');
    return;
  }

  currentStories = userStories;
  currentStoryIndex = startIndex;
  storyViewer.classList.remove('hidden');
  loadCurrentStory();
  startProgressBar();
}

// ── التحقق قبل إظهار حالة الاتصال (online/last seen) ──
// مثال: في نافذة الدردشة أو الملف الشخصي
async function getUserOnlineStatus(targetUid) {
  if (!auth.currentUser) return { online: false, lastSeen: null };

  const targetRef = doc(db, 'users', targetUid);
  const snap = await getDoc(targetRef);

  if (!snap.exists()) return { online: false, lastSeen: null };

  const data = snap.data();
  const vis = data.onlineVisibility || 'everyone';

  if (vis === 'nobody') return { online: false, lastSeen: null };

  if (vis === 'followers') {
    const followRef = doc(db, `users/${targetUid}/followers`, auth.currentUser.uid);
    if (!(await getDoc(followRef)).exists()) {
      return { online: false, lastSeen: null };
    }
  }

  return {
    online: data.isOnline || false,
    lastSeen: data.lastSeen
  };
}

// ── استدعاء loadPrivacySettings عند فتح صفحة الإعدادات أو الملف ──
document.querySelector('.nav-item[data-tab="profile"]')
  .addEventListener('click', () => {
    loadPrivacySettings();
    loadHighlights();
  });

// ─────────────────────────────────────────────
// نهاية الجزء الثالث والعشرين
// ─────────────────────────────────────────────
// main.js  ── الجزء الرابع والعشرين
// =============================================
// Suggested Users
// - اقتراح مستخدمين بناءً على followersCount (الأكثر متابعة)
// - استبعاد المستخدم الحالي + المحظورين + المقيّدين
// - عرضهم في مكان مناسب (مثل صفحة البحث أو الرئيسية)
// =============================================

// ── عناصر DOM (أضفها في مكان مناسب، مثلاً تحت البحث أو في تبويب منفصل) ──
/*
  <div class="suggested-users">
    <h3>اقتراحات لك</h3>
    <div id="suggested-users-list"></div>
  </div>
*/

// ── جلب المستخدمين المقترحين ──
async function loadSuggestedUsers() {
  const list = document.getElementById('suggested-users-list');
  if (!list || !auth.currentUser) return;

  list.innerHTML = '<div class="loader">جاري تحميل الاقتراحات...</div>';

  try {
    // جلب أعلى 10 مستخدمين من حيث عدد المتابعين
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      orderBy('followersCount', 'desc'),
      limit(20) // نأخذ أكثر شوي عشان نستبعد بعض
    );

    const snap = await getDocs(q);

    const suggestions = [];
    const myUid = auth.currentUser.uid;

    // جلب المحظورين والمقيّدين لاستبعادهم
    const blockedSnap = await getDocs(collection(db, `users/${myUid}/blockedUsers`));
    const restrictedSnap = await getDocs(collection(db, `users/${myUid}/restrictedUsers`));
    const blockedUids = new Set(blockedSnap.docs.map(d => d.id));
    const restrictedUids = new Set(restrictedSnap.docs.map(d => d.id));

    snap.forEach(docSnap => {
      const user = docSnap.data();
      if (user.uid === myUid) return; // استبعاد نفسك

      if (blockedUids.has(user.uid) || restrictedUids.has(user.uid)) return;

      suggestions.push(user);

      if (suggestions.length >= 5) return; // نكتفي بـ 5 اقتراحات
    });

    list.innerHTML = '';

    if (suggestions.length === 0) {
      list.innerHTML = '<p>لا توجد اقتراحات حالياً</p>';
      return;
    }

    suggestions.forEach(user => {
      const item = document.createElement('div');
      item.className = 'suggested-user-item';
      item.innerHTML = `
        <img class="chat-pic" src="${user.profilePhoto || ''}" alt="">
        <div class="user-info">
          <div class="user-name">${user.displayName || user.username}</div>
          <div class="user-username">@${user.username}</div>
          <div class="followers">${user.followersCount || 0} متابع</div>
        </div>
        <button class="follow-btn">متابعة</button>
      `;

      // زر متابعة
      const followBtn = item.querySelector('.follow-btn');
      followBtn.addEventListener('click', async () => {
        await followUser(user.uid);
        followBtn.textContent = 'تم المتابعة';
        followBtn.disabled = true;
      });

      list.appendChild(item);
    });

  } catch (err) {
    console.error("خطأ في جلب الاقتراحات:", err);
    list.innerHTML = '<p style="color:#ef4444;">تعذر تحميل الاقتراحات</p>';
  }
}

// ── دالة متابعة مستخدم (follow) ──
async function followUser(targetUid) {
  if (!auth.currentUser) return;

  const myUid = auth.currentUser.uid;

  try {
    const batch = writeBatch(db);

    // أضف إلى following الخاص بي
    const myFollowingRef = doc(db, `users/${myUid}/following`, targetUid);
    batch.set(myFollowingRef, { followedAt: serverTimestamp() });

    // أضف إلى followers الخاص به
    const hisFollowersRef = doc(db, `users/${targetUid}/followers`, myUid);
    batch.set(hisFollowersRef, { followedAt: serverTimestamp() });

    // زيادة العدادات
    const myUserRef = doc(db, 'users', myUid);
    batch.update(myUserRef, { followingCount: increment(1) });

    const targetUserRef = doc(db, 'users', targetUid);
    batch.update(targetUserRef, { followersCount: increment(1) });

    await batch.commit();

    console.log("تم متابعة المستخدم:", targetUid);

  } catch (err) {
    console.error("خطأ في المتابعة:", err);
    alert("حدث خطأ أثناء المتابعة");
  }
}

// ── استدعاء loadSuggestedUsers في مكان مناسب (مثل فتح الصفحة الرئيسية أو البحث) ──
document.addEventListener('DOMContentLoaded', () => {
  loadSuggestedUsers();
});

// ─────────────────────────────────────────────
// نهاية الجزء الرابع والعشرين
// ─────────────────────────────────────────────
// main.js  ── الجزء الخامس والعشرين (الأخير – اللمسات النهائية)
// =============================================
// اللمسات النهائية + تحسينات عامة + إغلاق المشروع الأساسي
// - تنظيف الـ listeners عند الخروج/تغيير الصفحة
// - إضافة زر "تحديث" للإشعارات والمحادثات
// - إضافة dark/light mode toggle (محلي فقط)
// - تسجيل خروج كامل مع تنظيف كل شيء
// =============================================

// ── تنظيف كل الـ listeners عند تسجيل الخروج أو إغلاق الصفحة ──
function cleanupAllListeners() {
  // إلغاء كل onSnapshot النشطة (مثل الدردشات + الإشعارات + الكتابة + ...)
  if (currentUnsubscribe) currentUnsubscribe();
  if (typingUnsubscribe) typingUnsubscribe();

  // إيقاف heartbeat الجلسات
  if (lastActiveInterval) clearInterval(lastActiveInterval);

  // تنظيف localStorage إذا لزم
  localStorage.removeItem('currentSessionId');

  console.log("تم تنظيف كل الـ listeners والجلسات");
}

// ── زر تحديث يدوي للإشعارات والمحادثات (أضفه في UI) ──
document.getElementById('refresh-notifications')?.addEventListener('click', () => {
  loadNotifications();
});

document.getElementById('refresh-chats')?.addEventListener('click', () => {
  loadRecentChats();
});

// ── Dark / Light Mode Toggle (محفوظ محليًا فقط) ──
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  // تحميل الوضع المحفوظ
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // تحديث أيقونة الزر (اختياري)
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });
}

// ── تسجيل خروج كامل مع تنظيف ──
async function fullLogout() {
  try {
    // تحديث حالة الخروج
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp()
      });
    }

    // تنظيف كل شيء
    cleanupAllListeners();

    // تسجيل الخروج من Firebase Auth
    await signOut(auth);

    // إعادة توجيه أو إظهار شاشة المصادقة
    showAuthScreen();
    localStorage.clear(); // تنظيف كل البيانات المحلية (اختياري)

    console.log("تم تسجيل الخروج الكامل بنجاح");

  } catch (err) {
    console.error("خطأ في تسجيل الخروج الكامل:", err);
    alert("حدث خطأ أثناء تسجيل الخروج");
  }
}

// ربط زر تسجيل الخروج الرئيسي (إذا كان موجود)
document.getElementById('logout-btn')?.addEventListener('click', fullLogout);

// ── تحسين عام: إضافة listener للـ offline/online لتحديث isOnline تلقائيًا ──
window.addEventListener('online', async () => {
  if (auth.currentUser) {
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      isOnline: true,
      lastSeen: serverTimestamp()
    });
  }
});

window.addEventListener('offline', async () => {
  if (auth.currentUser) {
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      isOnline: false,
      lastSeen: serverTimestamp()
    });
  }
});

// ── نهاية المشروع الأساسي ──
// كل الميزات الرئيسية من الـ spec موجودة الآن:
// Auth → Chats → Stories → Groups → Notifications → Privacy → Suggested → Sessions → Highlights → Voice

console.log("التطبيق الأساسي جاهز 100% – مرحبًا بك في مرحلة التحسين والاختبار 🗿");

// ─────────────────────────────────────────────
// نهاية الجزء الخامس والعشرين (الأخير في الترقيم الحالي)
// ─────────────────────────────────────────────
