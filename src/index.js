import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, firestore } from '../firebase';
import Container from './Container';
import Navbar from './Navbar';
import Login from './Login';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);


  useEffect(() => {

 


    const premiumStatus = localStorage.getItem('isPremium') === 'true';
    setIsPremium(premiumStatus);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        checkPremiumStatus(user);
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkPremiumStatus = async (user) => {
    try {
      const subscriptionRef = doc(firestore, "users", user.uid, "appPhoto", "subscription");
      const subscriptionDoc = await getDoc(subscriptionRef);
      if (subscriptionDoc.exists() && subscriptionDoc.data().type === 'Premium') {
        setIsPremium(true);
        localStorage.setItem('isPremium', 'true');
      } else {
        setIsPremium(false);
        localStorage.setItem('isPremium', 'false');
      }
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error fetching subscription data:", error);
      // En cas d'erreur (par exemple, pas de connexion Internet), utilisez le statut Premium du localStorage
      setIsAuthenticated(true);
    }
    setLoading(false);
  };


  const handleLogin = (authStatus) => {
    setIsAuthenticated(authStatus);
    if (!authStatus) {
      setIsPremium(false);
      localStorage.setItem('isPremium', 'false');
    }
  };
  

  if (loading) {
    return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}} >Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (!isPremium) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        textAlign: 'center',
        WebkitAppRegion: 'drag', // Active le comportement de glisser-déposer
      }}>
        <p>Nous préparons votre accès à l'app. Vous y aurez accès très bientôt !</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Router>
        <Navbar />
        <Routes>
          <Route index path="/" element={<Container />} />
        </Routes>
      </Router>
    </div>
  );
};

const root = createRoot(document.getElementById('app'));
root.render(<App />);
