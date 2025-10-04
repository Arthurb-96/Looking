"use client"
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth} from 'firebase/auth'
import {Database , getDatabase} from 'firebase/database'

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAMG9GRM2apVxPalO50g6SU1Us4gJca7RE",
  authDomain: "android2-9339d.firebaseapp.com",
  databaseURL: "https://android2-9339d-default-rtdb.firebaseio.com",
  projectId: "android2-9339d",
  storageBucket: "android2-9339d.firebasestorage.app",
  messagingSenderId: "181063654416",
  appId: "1:181063654416:web:1022ae413a7834f708be95",
  measurementId: "G-Q39NSLWR7J"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app)
const auth = getAuth(app)
export {auth}
export default database
