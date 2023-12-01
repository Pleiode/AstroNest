// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // Importez getAuth
import { getFirestore } from "firebase/firestore";  // Importez getFirestore


// Your web app's Firebase configuration


const firebaseConfig = {
  apiKey: "AIzaSyARmd6-70E4YD8iPCWrYctvrMidnu-6ypM",
  authDomain: "starmaze-d4663.firebaseapp.com",
  projectId: "starmaze-d4663",
  storageBucket: "starmaze-d4663.appspot.com",
  messagingSenderId: "123385718679",
  appId: "1:123385718679:web:81ad96cd8a1c3c110086d2",
  measurementId: "G-4VTDGE3KMY"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const storage = getStorage(app);
const auth = getAuth(app); // Créez une instance d'authentification
const firestore = getFirestore(app); // Créez une instance de Firestore


export { storage, auth, app, firestore };
