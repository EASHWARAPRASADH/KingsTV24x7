import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { authService } from '../services/authService';
import { auth as firebaseAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from '../utils/firebase';

const Login = () => {
  const { login } = useContext(AuthContext);
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState('');
  const [toastColor, setToastColor] = useState('#10B981');
  const [rememberMe, setRememberMe] = useState(false);
  const location = useLocation();

  // Login method toggles
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpCountdown, setPhoneOtpCountdown] = useState(30);
  const [sandboxOtp, setSandboxOtp] = useState('');

  useEffect(() => {
    if (location.state?.isRegister) {
      navigate('/register', { replace: true });
    }
  }, [location.state, navigate]);

  // Handle countdown for phone OTP
  useEffect(() => {
    let interval = null;
    if (phoneOtpSent && phoneOtpCountdown > 0) {
      interval = setInterval(() => {
        setPhoneOtpCountdown(prev => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [phoneOtpSent, phoneOtpCountdown]);

  // Forgot password flow states
  const [forgotFlow, setForgotFlow] = useState(false);
  const [otpStep, setOtpStep] = useState(1); // 1: Send OTP, 2: Verify OTP, 3: Reset Password
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  
  // Social login simulation state
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialProvider, setSocialProvider] = useState('');
  const [socialName, setSocialName] = useState('');
  const [socialEmail, setSocialEmail] = useState('');
  const [socialImage, setSocialImage] = useState('');

  const triggerToast = (text, color = '#10B981') => {
    setToastText(text);
    setToastColor(color);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  const setupRecaptcha = () => {
    if (!firebaseAuth) {
      console.warn("Firebase Auth is not initialized. Please configure VITE_FIREBASE_ env variables.");
      return null;
    }
    if (window.recaptchaVerifier) return window.recaptchaVerifier;
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
      return window.recaptchaVerifier;
    } catch (err) {
      console.error("Recaptcha verifier error:", err);
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {}
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const sendBackendSmsOtp = async (cleanPhone) => {
    try {
      const res = await authService.sendSmsOtp(cleanPhone);
      setPhoneOtpSent(true);
      setPhoneOtpCountdown(30);
      if (res.sandbox && res.otpCode) {
        setSandboxOtp(res.otpCode);
        setPhoneOtp(res.otpCode);
        triggerToast(lang === 'en' ? `OTP Sent (Sandbox Code: ${res.otpCode})` : `OTP அனுப்பப்பட்டது (Sandbox Code: ${res.otpCode})`);
      } else {
        triggerToast(lang === 'en' ? 'SMS OTP sent successfully!' : 'SMS OTP வெற்றிகரமாக அனுப்பப்பட்டது!');
      }
    } catch (backendErr) {
      console.error("Backend SMS send failed:", backendErr);
      triggerToast(`SMS failed: ${backendErr.message}`, '#EF4444');
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!phoneNumber.trim()) {
      triggerToast(lang === 'en' ? 'Please enter a valid phone number' : 'தயவுசெய்து செல்லுபடியாகும் தொலைபேசி எண்ணை உள்ளிடவும்', '#EF4444');
      return;
    }

    const cleanPhone = phoneNumber.trim().replace(/[^0-9]/g, '');

    // Try Firebase first if available, otherwise fallback to Backend SMS API directly
    if (firebaseAuth) {
      try {
        const appVerifier = setupRecaptcha();
        if (appVerifier) {
          let formattedPhone = phoneNumber.trim();
          if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+91' + cleanPhone;
          }

          signInWithPhoneNumber(firebaseAuth, formattedPhone, appVerifier)
            .then((confirmationResult) => {
              window.confirmationResult = confirmationResult;
              setPhoneOtpSent(true);
              setPhoneOtpCountdown(30);
              triggerToast(lang === 'en' ? 'Real-time SMS OTP sent successfully!' : 'நேரடி SMS OTP வெற்றிகரமாக அனுப்பப்பட்டது!');
            })
            .catch(async (error) => {
              console.warn("Firebase SMS send failed, attempting backend SMS fallback:", error);
              await sendBackendSmsOtp(cleanPhone);
            });
          return;
        }
      } catch (err) {
        console.warn("Firebase SMS initialization failed, using backend SMS fallback:", err);
      }
    }

    // Fallback to backend SMS API
    await sendBackendSmsOtp(cleanPhone);
  };

  // Automatically trigger Send OTP once a valid 10-digit (or 12-digit with 91) phone number is entered
  useEffect(() => {
    if (loginMethod !== 'phone' || !phoneNumber || phoneOtpSent) return;

    const cleanNum = phoneNumber.trim().replace(/[^0-9]/g, '');
    const isIndiaLength = cleanNum.length === 10;
    const isIndiaWithCountry = cleanNum.startsWith('91') && cleanNum.length === 12;

    if (isIndiaLength || isIndiaWithCountry) {
      const timer = setTimeout(() => {
        handleSendPhoneOtp();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [phoneNumber, phoneOtpSent, loginMethod]);

  const handlePhoneAuth = async (e) => {
    e.preventDefault();

    if (!phoneOtpSent) {
      handleSendPhoneOtp();
      return;
    }

    if (!phoneOtp || !phoneOtp.trim()) {
      triggerToast(lang === 'en' ? 'Please enter the OTP code' : 'தயவுசெய்து OTP குறியீட்டை உள்ளிடவும்', '#EF4444');
      return;
    }

    // Handle Firebase Confirmation
    if (window.confirmationResult) {
      try {
        const confirmationResult = window.confirmationResult;
        const result = await confirmationResult.confirm(phoneOtp);
        const user = result.user;
        const cleanPhone = user.phoneNumber.replace(/[^0-9]/g, '');
        const mockEmail = `phone_${cleanPhone}@king24x7.com`;
        const mockName = `Phone User ${cleanPhone.slice(-4)}`;
        
        try {
          const idToken = await user.getIdToken();
          localStorage.setItem('firebase_id_token', idToken);
        } catch (tokenErr) {
          console.error("Failed to retrieve Firebase ID Token:", tokenErr);
        }
        
        const res = await authService.googleLogin(mockEmail, mockName, '');
        login(res.user, res.accessToken, res.refreshToken, rememberMe);
        triggerToast(lang === 'en' ? 'Successfully logged in with verified Phone!' : 'சரியான தொலைபேசி எண் மூலம் வெற்றிகரமாக உள்நுழைந்தீர்கள்!');
        
        const adminRoles = ['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN', 'SECTION_EDITOR', 'SUB_EDITOR', 'MOBILE_JOURNALIST', 'INSTITUTION_LOGIN'];
        if (res.user && adminRoles.includes(res.user.role)) {
          const getAdminPortalUrl = () => {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              return 'http://localhost:3000/admin/dashboard';
            }
            return `${window.location.origin}/admin/dashboard`;
          };
          setTimeout(() => {
            window.location.href = getAdminPortalUrl();
          }, 1200);
        } else {
          const from = location.state?.from || '/';
          const redirectState = location.state?.jobRole ? { openJobRole: location.state.jobRole } : null;
          setTimeout(() => navigate(from, { state: redirectState }), 1200);
        }
        return;
      } catch (error) {
        console.error("Firebase OTP confirmation failed, attempting backend verification:", error);
      }
    }

    // Fallback to Backend OTP verification
    try {
      const cleanPhone = phoneNumber.trim().replace(/[^0-9]/g, '');
      const res = await authService.verifySmsOtp(cleanPhone, phoneOtp.trim());
      login(res.user, res.accessToken, res.refreshToken, rememberMe);
      triggerToast(lang === 'en' ? 'Successfully logged in with verified Phone!' : 'சரியான தொலைபேசி எண் மூலம் வெற்றிகரமாக உள்நுழைந்தீர்கள்!');
      
      const adminRoles = ['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN', 'SECTION_EDITOR', 'SUB_EDITOR', 'MOBILE_JOURNALIST', 'INSTITUTION_LOGIN'];
      if (res.user && adminRoles.includes(res.user.role)) {
        const getAdminPortalUrl = () => {
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000/admin/dashboard';
          }
          return `${window.location.origin}/admin/dashboard`;
        };
        setTimeout(() => {
          window.location.href = getAdminPortalUrl();
        }, 1200);
      } else {
        const from = location.state?.from || '/';
        const redirectState = location.state?.jobRole ? { openJobRole: location.state.jobRole } : null;
        setTimeout(() => navigate(from, { state: redirectState }), 1200);
      }
    } catch (err) {
      console.error("Backend OTP verification failed:", err);
      triggerToast(lang === 'en' ? (err.message || 'Invalid verification code!') : 'தவறான சரிபார்ப்புக் குறியீடு!', '#EF4444');
    }
  };

  const handleManualAuth = async (e) => {
    e.preventDefault();
    try {
      const res = await authService.login(email, pwd);
      login(res.user, res.accessToken, res.refreshToken, rememberMe);
      triggerToast(lang === 'en' ? 'Successfully logged in!' : 'வெற்றிகரமாக உள்நுழைந்துவிட்டீர்கள்!');
      
      const adminRoles = ['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN', 'SECTION_EDITOR', 'SUB_EDITOR', 'MOBILE_JOURNALIST', 'INSTITUTION_LOGIN'];
      if (res.user && adminRoles.includes(res.user.role)) {
        const getAdminPortalUrl = () => {
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001/admin/dashboard';
          }
          return `${window.location.origin}/admin/dashboard`;
        };
        setTimeout(() => {
          window.location.href = getAdminPortalUrl();
        }, 1200);
      } else {
        const from = location.state?.from || '/';
        const redirectState = location.state?.jobRole ? { openJobRole: location.state.jobRole } : null;
        setTimeout(() => navigate(from, { state: redirectState }), 1200);
      }
    } catch (err) {
      triggerToast(err.message, '#EF4444');
    }
  };

  const handleSocialClick = async (provider) => {
    setSocialProvider(provider);
    
    if (provider === 'google') {
      if (firebaseAuth) {
        try {
          const authProvider = new GoogleAuthProvider();
          const result = await signInWithPopup(firebaseAuth, authProvider);
          const user = result.user;
          
          const res = await authService.googleLogin(user.email, user.displayName, user.photoURL);
          login(res.user, res.accessToken, res.refreshToken, rememberMe);
          triggerToast(lang === 'en' ? 'Successfully logged in with Google!' : 'கூகிள் மூலம் வெற்றிகரமாக உள்நுழைந்தீர்கள்!');
          
          const adminRoles = ['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN', 'SECTION_EDITOR', 'SUB_EDITOR', 'MOBILE_JOURNALIST', 'INSTITUTION_LOGIN'];
          if (res.user && adminRoles.includes(res.user.role)) {
            const getAdminPortalUrl = () => {
              if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'http://localhost:3001/admin/dashboard';
              }
              return `${window.location.origin}/admin/dashboard`;
            };
            setTimeout(() => {
              window.location.href = getAdminPortalUrl();
            }, 1200);
          } else {
            const from = location.state?.from || '/';
            const redirectState = location.state?.jobRole ? { openJobRole: location.state.jobRole } : null;
            setTimeout(() => navigate(from, { state: redirectState }), 1200);
          }
        } catch (error) {
          console.error("Firebase Google Sign-In Error:", error);
          if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) {
            triggerToast(lang === 'en' ? `Domain (${window.location.hostname}) unauthorized in Firebase Console > Authentication > Settings.` : `இந்த டொமைன் (${window.location.hostname}) Firebase Console-இல் அனுமதிக்கப்படவில்லை.`, '#EF4444');
          } else {
            triggerToast(`Google Login Failed: ${error.message}`, '#EF4444');
          }
        }
        return;
      } else {
        setSocialName('Google Tester');
        setSocialEmail('google.tester@gmail.com');
        setSocialImage('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150');
        setShowSocialModal(true);
      }
    }
  };

  const submitSocialAuth = async (e) => {
    e.preventDefault();
    setShowSocialModal(false);

    try {
      let res;
      if (socialProvider === 'google') {
        res = await authService.googleLogin(socialEmail, socialName, socialImage);
      } else {
        return;
      }

      login(res.user, res.accessToken, res.refreshToken, rememberMe);
      triggerToast(lang === 'en' ? `Connected with ${socialProvider.toUpperCase()}!` : `${socialProvider.toUpperCase()} உடன் இணைக்கப்பட்டது!`);
      
      const adminRoles = ['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN', 'SECTION_EDITOR', 'SUB_EDITOR', 'MOBILE_JOURNALIST', 'INSTITUTION_LOGIN'];
      if (res.user && adminRoles.includes(res.user.role)) {
        const getAdminPortalUrl = () => {
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001/admin/dashboard';
          }
          return `${window.location.origin}/admin/dashboard`;
        };
        setTimeout(() => {
          window.location.href = getAdminPortalUrl();
        }, 1200);
      } else {
        const from = location.state?.from || '/';
        const redirectState = location.state?.jobRole ? { openJobRole: location.state.jobRole } : null;
        setTimeout(() => navigate(from, { state: redirectState }), 1200);
      }
    } catch (err) {
      triggerToast(err.message, '#EF4444');
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    try {
      if (otpStep === 1) {
        await authService.forgotPassword(otpEmail);
        setForgotSuccess('OTP code printed to backend terminal logs!');
        setOtpStep(2);
      } else if (otpStep === 2) {
        await authService.verifyOtp(otpEmail, otpCode);
        setForgotSuccess('OTP verified successfully! Please enter your new password.');
        setOtpStep(3);
      } else if (otpStep === 3) {
        await authService.resetPassword(otpEmail, otpCode, newPassword);
        triggerToast('Password reset successfully. Please log in.', '#10B981');
        setForgotFlow(false);
        setOtpStep(1);
        setOtpEmail('');
        setOtpCode('');
        setNewPassword('');
      }
    } catch (err) {
      setForgotError(err.message);
    }
  };

  return (
    <div className="login-wrapper" style={{ background: '#000000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>
      <div className="login-container" style={{ width: '100%', maxWidth: '960px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', zIndex: 2, display: 'grid', gridTemplateColumns: '1.2fr 1.8fr' }}>
        <div className="login-left" style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '40px 30px', borderRight: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="login-left-header">
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px', marginBottom: '8px' }}>KINGS 24x7</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'white', lineHeight: 1.3, marginBottom: '12px' }}>
              {forgotFlow ? 'Password Reset' : 'Authentication Hub'}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6 }}>
              Truth. Responsibility. Access portal components tailored to your role.
            </p>
          </div>

          {!forgotFlow && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                Access your personalized news experience.
              </p>
            </div>
          )}

          <div style={{ marginTop: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src="assets/images/logo-banner-dark.png" 
              alt="Logo" 
              style={{ maxWidth: '180px', height: 'auto', opacity: 0.9, objectFit: 'contain' }}
            />
          </div>
        </div>

        <div className="login-right" style={{ padding: '50px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          {forgotFlow ? (
            <div>
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
                  Forgot Password?
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.5 }}>
                  {otpStep === 1 && 'Enter your email to receive a 6-digit OTP verification code.'}
                  {otpStep === 2 && 'Enter the 6-digit OTP code printed in your backend server logs.'}
                  {otpStep === 3 && 'Choose a secure new password.'}
                </p>
              </div>

              {forgotError && (
                <div style={{ color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
                  {forgotError}
                </div>
              )}
              {forgotSuccess && (
                <div style={{ color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
                  {forgotSuccess}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {otpStep === 1 && (
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px' }}>
                      Email Address
                    </label>
                    <input 
                      type="email" 
                      required
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="name@email.com"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                )}

                {otpStep === 2 && (
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px' }}>
                      Enter 6-Digit OTP Code
                    </label>
                    <input 
                      type="text" 
                      required
                      maxLength="6"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        outline: 'none',
                        fontSize: '14px',
                        letterSpacing: '8px',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}
                    />
                  </div>
                )}

                {otpStep === 3 && (
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px' }}>
                      Choose New Password (Min 8 characters)
                    </label>
                    <input 
                      type="password" 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                )}

                <button 
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'var(--primary)',
                    color: 'white',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    boxShadow: '0 4px 15px rgba(179,115,42,0.3)',
                    transition: 'all 0.3s'
                  }}
                >
                  {otpStep === 1 && 'Send Verification Code'}
                  {otpStep === 2 && 'Verify OTP'}
                  {otpStep === 3 && 'Reset Password'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <span 
                    onClick={() => {
                      setForgotFlow(false);
                      setOtpStep(1);
                    }} 
                    style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                  >
                    ← Back to Login
                  </span>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
                  Welcome Back!
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.5 }}>
                  {loginMethod === 'email'
                    ? 'Enter your email and password to access your role workspace.'
                    : 'Enter your phone number to receive a simulated OTP code.'}
                </p>
              </div>

              {/* Login Method Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: loginMethod === 'email' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: loginMethod === 'email' ? 'white' : 'rgba(255,255,255,0.4)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                >
                  Email Login
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: loginMethod === 'phone' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: loginMethod === 'phone' ? 'white' : 'rgba(255,255,255,0.4)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                >
                  Phone OTP
                </button>
              </div>

              {loginMethod === 'email' ? (
                <form onSubmit={handleManualAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '8px' }}>
                      Email Address *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <i className="fas fa-envelope" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }}></i>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                        placeholder="name@email.com" 
                        style={{
                          width: '100%',
                          padding: '14px 16px 14px 44px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: 'white',
                          outline: 'none',
                          fontSize: '14px',
                          transition: 'all 0.3s'
                        }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '8px' }}>
                      Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <i className="fas fa-lock" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }}></i>
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                        required 
                        placeholder="••••••••" 
                        style={{
                          width: '100%',
                          padding: '14px 44px 14px 44px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: 'white',
                          outline: 'none',
                          fontSize: '14px',
                          transition: 'all 0.3s'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        style={{
                          position: 'absolute',
                          right: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.4)',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ accentColor: 'var(--primary)' }} 
                      />
                      <span>Remember Me</span>
                    </label>
                    <span 
                      onClick={() => {
                        setForgotFlow(true);
                        setOtpStep(1);
                        setOtpEmail(email);
                      }} 
                      style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Forgot Password?
                    </span>
                  </div>

                  <button 
                    type="submit" 
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'var(--primary)',
                      color: 'white',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      marginTop: '16px',
                      boxShadow: '0 4px 15px rgba(179, 115, 42, 0.3)',
                      transition: 'all 0.3s'
                    }}
                  >
                    <span>Sign In</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePhoneAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '8px' }}>
                      Phone Number *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <i className="fas fa-phone" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }}></i>
                      <input 
                        type="tel" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required 
                        disabled={phoneOtpSent}
                        placeholder="e.g. +91 98765 43210"
                        style={{
                          width: '100%',
                          padding: '14px 16px 14px 44px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: 'white',
                          outline: 'none',
                          fontSize: '14px',
                          transition: 'all 0.3s'
                        }}
                      />
                    </div>
                  </div>

                  {phoneOtpSent && (
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '8px' }}>
                        6-Digit OTP Code *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <i className="fas fa-key" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }}></i>
                        <input 
                          type="text" 
                          maxLength="6"
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value)}
                          required 
                          placeholder="e.g. 123456" 
                          style={{
                            width: '100%',
                            padding: '14px 16px 14px 44px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            outline: 'none',
                            fontSize: '14px',
                            transition: 'all 0.3s'
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {sandboxOtp && <span>Simulated OTP is: {sandboxOtp}</span>}
                        {phoneOtpCountdown > 0 ? (
                          <span>Resend in {phoneOtpCountdown}s</span>
                        ) : (
                          <span 
                            onClick={handleSendPhoneOtp} 
                            style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Resend OTP
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {!phoneOtpSent ? (
                    <button 
                      type="button" 
                      onClick={handleSendPhoneOtp}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: 'var(--primary)',
                        color: 'white',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '15px',
                        marginTop: '16px',
                        boxShadow: '0 4px 15px rgba(179, 115, 42, 0.3)',
                        transition: 'all 0.3s'
                      }}
                    >
                      <span>Send OTP</span>
                    </button>
                  ) : (
                    <button 
                      type="submit" 
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: 'var(--primary)',
                        color: 'white',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '15px',
                        marginTop: '16px',
                        boxShadow: '0 4px 15px rgba(179, 115, 42, 0.3)',
                        transition: 'all 0.3s'
                      }}
                    >
                      <span>Verify & Sign In</span>
                    </button>
                  )}
                </form>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }}></div>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase' }}>or</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }}></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleSocialClick('google')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <i className="fab fa-google" style={{ color: '#EA4335' }}></i> Continue with Google
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, textDecoration: 'none' }}
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* SIMULATED OAUTH CONSENT MODAL */}
      {showSocialModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#121212',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '450px',
            padding: '30px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{
                fontSize: '28px',
                display: 'inline-flex',
                padding: '12px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                marginBottom: '12px'
              }}>
                {socialProvider === 'google' && <i className="fab fa-google" style={{ color: '#EA4335' }}></i>}
                {socialProvider === 'apple' && <i className="fab fa-apple" style={{ color: '#ffffff' }}></i>}
                {socialProvider === 'facebook' && <i className="fab fa-facebook" style={{ color: '#1877F2' }}></i>}
              </span>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                Simulated {socialProvider.toUpperCase()} OAuth Consent
              </h4>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                Testing production-ready sign-in flow. Modify credentials below if desired.
              </p>
            </div>

            <form onSubmit={submitSocialAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>
                  Mock Full Name
                </label>
                <input 
                  type="text"
                  required
                  value={socialName}
                  onChange={(e) => setSocialName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>
                  Mock Email Address
                </label>
                <input 
                  type="email"
                  required
                  value={socialEmail}
                  onChange={(e) => setSocialEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSocialModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--primary)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}
                >
                  Confirm & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div 
        className={`toast ${showToast ? 'show' : ''}`} 
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%) ' + (showToast ? 'translateY(0)' : 'translateY(100px)'),
          opacity: showToast ? 1 : 0,
          background: toastColor,
          color: 'white',
          padding: '16px 32px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: 700,
          zIndex: 99999,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <i className={toastColor === '#EF4444' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'} style={{ fontSize: '20px' }}></i>
        <span>{toastText}</span>
      </div>

      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default Login;
