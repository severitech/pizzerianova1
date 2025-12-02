import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxvw5aQWp14noVUB77lqO1e_HG_c1_VRM",
  authDomain: "pizzerianova.firebaseapp.com",
  projectId: "pizzerianova",
  storageBucket: "pizzerianova.firebasestorage.app",
  messagingSenderId: "620868891966",
  appId: "1:620868891966:web:a543fda95919d485fc286f",
  measurementId: "G-LSJSN4LJZ1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
