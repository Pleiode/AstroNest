// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage, ref } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxz96tgRcL_E30hI3H-VjiN1j5QBbj4Qo",
  authDomain: "meridio-3c3c0.firebaseapp.com",
  projectId: "meridio-3c3c0",
  storageBucket: "meridio-3c3c0.appspot.com",
  messagingSenderId: "129863026966",
  appId: "1:129863026966:web:d328abc1db0f760fd72837",
  measurementId: "G-BZL904YPHX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const storage = getStorage(app);

export  {
    storage, app as default
}
