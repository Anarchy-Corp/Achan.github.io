// firebase-config.js
const firebaseConfig = {
  apiKey:            "AIzaSyAVJ6peYZvoQp8RhJ0aFzrsyGCXY0g2Ydw",
  authDomain:        "achan-e85b6.firebaseapp.com",
  databaseURL:       "https://achan-e85b6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "achan-e85b6",
  storageBucket:     "achan-e85b6.firebasestorage.app",
  messagingSenderId: "206116919224",
  appId:             "1:206116919224:web:cf02ed10683edc366e614d"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// مرجع قاعدة البيانات
const db = firebase.database();
const storage = null; // Storage غير مفعل - الصور تتحفظ كـ Base64
