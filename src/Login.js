import React, { useEffect, useState } from 'react';
import { auth } from '../firebase'; // Assurez-vous que le chemin est correct
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; // Importez les fonctions nécessaires de Firestore
import { firestore } from '../firebase'; // Assurez-vous que le chemin est correct


const { ipcRenderer } = window.electron;

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);


    // Vérifie si l'utilisateur est déjà connecté
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                // L'utilisateur est déjà connecté
                onLogin(true);
            
            } else {
                // L'utilisateur n'est pas connecté
                onLogin(false);
            }
        });

        return () => unsubscribe(); // Nettoie l'abonnement lors du démontage
    }, [onLogin]);


    // Gère la connexion
    const handleLogin = (e) => {
        e.preventDefault();
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // La connexion a réussi
                onLogin(true);
                
            })
            .catch((error) => {
                // La connexion a échoué
                console.error(error);
                alert('Erreur de connexion. Veuillez vérifier vos informations.');
                onLogin(false);
            });
    };


    // Gère l'inscription
    const handleSignUp = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert("Les mots de passe ne correspondent pas.");
            return;
        }
        createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                // L'inscription a réussi
                const user = userCredential.user;
                // Définissez les données utilisateur dans Firestore
                const userRef = doc(firestore, "users", user.uid); // Chemin du document dans Firestore
                await setDoc(userRef, {
                    // Vos données utilisateur, par exemple :
                    email: user.email,
                    createdAt: new Date(),
                    // autres données souhaitées
                });

                const subscriptionRef = doc(firestore, "users", user.uid, "appPhoto", "subscription");
                await setDoc(subscriptionRef, {
                    type: "Free", // Type d'abonnement, par exemple
                    startDate: new Date(),
                    // autres détails de l'abonnement
                });


                alert('Inscription réussie !');
                onLogin(true);
        
            })
            .catch((error) => {
                // L'inscription a échoué
                console.error(error);
                alert('Erreur d’inscription. Veuillez réessayer.');
                onLogin(false);
            });
    };




    // Bascule entre connexion et inscription
    const toggleSignUp = () => setIsSignUp(!isSignUp);


    

    return (
        <div className='login-window'>
            <div className='login-background'></div>
            <div style={{ display: 'flex', alignItems: 'center', height: '100vh', width: '100%' }}>
                <div className='login-form'>

                    <svg width="46" height="47" viewBox="0 0 46 47" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clip-path="url(#clip0_381_2700)">
                            <path d="M23.0041 0.5C10.2974 0.5 0 11.1548 0 24.3025C0 33.984 2.8766 41.1213 10.9049 44.8437C16.0949 47.3622 23.0041 40.4469 19.9842 33.1815C19.0353 30.5178 17.0056 28.4261 14.4312 27.4358L9.06798 25.3868C8.1026 25.0197 8.1026 23.6025 9.06798 23.2353L14.4312 21.1863C17.0056 20.2045 19.0271 18.1043 19.9842 15.4406L21.9645 9.89124C22.146 9.39607 22.5751 9.13994 23.0041 9.13994C23.4332 9.13994 23.8622 9.38753 24.0438 9.89124L26.024 15.4406C26.9729 18.1043 29.0027 20.196 31.577 21.1863L36.9403 23.2353C37.9057 23.6025 37.9057 25.0197 36.9403 25.3868L31.577 27.4358C29.0027 28.4176 26.9812 30.5178 26.024 33.1815C23.0041 40.4469 29.635 47.3622 34.8332 44.8437C42.8533 41.1299 46.0082 33.9926 46.0082 24.3025C46 11.1548 35.7026 0.5 23.0041 0.5Z" fill="white" />
                        </g>
                        <defs>
                            <clipPath id="clip0_381_2700">
                                <rect width="46" height="46" fill="white" transform="translate(0 0.5)" />
                            </clipPath>
                        </defs>
                    </svg>
                    <h1 style={{ fontSize: '32px' }}>{isSignUp ? 'Créer un compte' : 'Se connecter'}</h1>
                    <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
                        {/* Champs de formulaire */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <p>Email</p>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" />
                            </div>
                            <div>
                                <p>Mot de passe</p>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="at least 6 caracters" />
                            </div>
                            {isSignUp && (
                                <div>
                                    <p>Confirmez le mot de passe</p>
                                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="" />
                                </div>
                            )}
                        </div>
                        <button className='primary' type="submit">{isSignUp ? 'Inscription' : 'Connexion'}</button>
                    </form>
                    {isSignUp ? (
                        <p>Déjà inscrit ? <a onClick={toggleSignUp}>Se connecter</a></p>
                    ) : (
                        <p>Vous êtes un nouvel utilisateur ? <a onClick={toggleSignUp}>Créez un compte</a></p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;

