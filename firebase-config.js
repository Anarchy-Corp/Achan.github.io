// ══════════════════════════════════════════════
//  firebase-config.js — إعدادات Firebase
//  ضع هنا بيانات Firebase الخاصة بك
// ══════════════════════════════════════════════
//
//  خطوات الإعداد:
//  1. اذهب إلى https://console.firebase.google.com
//  2. أنشئ مشروع جديد
//  3. فعّل Realtime Database واختر المنطقة
//  4. فعّل Storage
//  5. اذهب إلى Project Settings → Web App → انسخ config
//  6. ضع القيم في الكائن أدناه
//  7. في Realtime Database Rules:
//     { "rules": { ".read": true, ".write": true } }
//  8. في Storage Rules:
//     rules_version = '2';
//     service firebase.storage {
//       match /b/{bucket}/o {
//         match /{allPaths=**} {
//           allow read, write: if true;
//         }
//       }
//     }
//
// ══════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "ضع-api-key-هنا",
  authDomain:        "ضع-project-id-هنا.firebaseapp.com",
  databaseURL:       "https://ضع-project-id-هنا-default-rtdb.firebaseio.com",
  projectId:         "ضع-project-id-هنا",
  storageBucket:     "ضع-project-id-هنا.appspot.com",
  messagingSenderId: "ضع-sender-id-هنا",
  appId:             "ضع-app-id-هنا"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// مراجع قاعدة البيانات والتخزين
const db      = firebase.database();
const storage = firebase.storage();
