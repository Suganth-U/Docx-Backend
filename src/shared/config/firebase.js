import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCHdTTnzVWcS9X7uHk4OREUvCvB5VwKBX8",
  authDomain: "docx-dz.firebaseapp.com",
  projectId: "docx-dz",
  storageBucket: "docx-dz.firebasestorage.app",
  messagingSenderId: "946465507327",
  appId: "1:946465507327:web:b796a3055590b5387c09ca",
  measurementId: "G-NBVFC314WE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const analytics =
  typeof window !== "undefined" && import.meta.env.PROD ? getAnalytics(app) : null;

export { auth, provider, app, analytics };
