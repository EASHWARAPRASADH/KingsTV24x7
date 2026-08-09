import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { authService } from '../services/authService';

const Register = () => {
  const { login } = useContext(AuthContext);
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [locationStr, setLocationStr] = useState('');
  const [interests, setInterests] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState('');
  const [toastColor, setToastColor] = useState('#10B981');

  // Social login states
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

  const handleManualRegister = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      triggerToast(lang === 'en' ? 'Full Name is required' : 'முழு பெயர் தேவை', '#EF4444');
      return;
    }
    if (pwd.length < 8) {
      triggerToast(
        lang === 'en' 
          ? 'Password must be at least 8 characters long' 
          : 'கடவுச்சொல் குறைந்தபட்சம் 8 எழுத்துக்கள் கொண்டிருக்க வேண்டும்', 
        '#EF4444'
      );
      return;
    }

    try {
      const res = await authService.register(fullName, email, pwd, locationStr, interests);
      login(res.user, res.accessToken, res.refreshToken, rememberMe);
      triggerToast(
        lang === 'en' 
          ? `Account created! Welcome, ${res.user.fullName}!` 
          : `கணக்கு உருவாக்கப்பட்டது! நல்வரவு, ${res.user.fullName}!`
      );
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      triggerToast(err.message, '#EF4444');
    }
  };

  const handleSocialClick = async (provider) => {
    setSocialProvider(provider);
    
    if (provider === 'google') {
      import('../utils/firebase').then(async ({ auth: firebaseAuth, GoogleAuthProvider, signInWithPopup }) => {
        if (firebaseAuth) {
          try {
            const authProvider = new GoogleAuthProvider();
            const result = await signInWithPopup(firebaseAuth, authProvider);
            const user = result.user;
            
            const res = await authService.googleLogin(user.email, user.displayName, user.photoURL);
            login(res.user, res.accessToken, res.refreshToken, rememberMe);
            triggerToast(
              lang === 'en' 
                ? 'Successfully signed up with Google!' 
                : 'கூகிள் மூலம் வெற்றிகரமாக பதிவு செய்தீர்கள்!'
            );
            setTimeout(() => navigate('/'), 1200);
          } catch (error) {
            console.error("Firebase Google Sign-Up Error:", error);
            if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) {
              triggerToast(lang === 'en' ? `Domain (${window.location.hostname}) unauthorized in Firebase Console > Authentication > Settings.` : `இந்த டொமைன் (${window.location.hostname}) Firebase Console-இல் அனுமதிக்கப்படவில்லை.`, '#EF4444');
            } else {
              triggerToast(`Google Signup Failed: ${error.message}`, '#EF4444');
            }
          }
        } else {
          setSocialName('Google Tester');
          setSocialEmail('google.tester@gmail.com');
          setSocialImage('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150');
          setShowSocialModal(true);
        }
      });
    } else {
      setShowSocialModal(true);
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
      triggerToast(
        lang === 'en' 
          ? `Connected with ${socialProvider.toUpperCase()}!` 
          : `${socialProvider.toUpperCase()} உடன் இணைக்கப்பட்டது!`
      );
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      triggerToast(err.message, '#EF4444');
    }
  };

  return (
    <div className="login-wrapper" style={{ background: '#000000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>
      <div className="login-container" style={{ width: '100%', maxWidth: '960px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', zIndex: 2, display: 'grid', gridTemplateColumns: '1.2fr 1.8fr' }}>
        
        <div className="login-left" style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '40px 30px', borderRight: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="login-left-header">
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px', marginBottom: '8px' }}>KINGS 24x7</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'white', lineHeight: 1.3, marginBottom: '12px' }}>
              {lang === 'en' ? 'Create Account' : 'கணக்கை உருவாக்கு'}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6 }}>
              {lang === 'en' ? 'Truth. Responsibility. In Tamil. Sign up to get custom news feeds and profile configurations.' : 'உண்மை. பொறுப்பு. தமிழில். தனிப்பயனாக்கப்பட்ட செய்திகள் மற்றும் சுயவிவரங்களை அணுக கணக்கை உருவாக்கவும்.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '40px' }}>
            <img 
              src="/assets/icons/logo-icon-dark.png" 
              alt="Logo" 
              style={{ maxWidth: '90px', height: 'auto', opacity: 0.8 }}
            />
          </div>
        </div>

        <div className="login-right" style={{ padding: '50px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
              {lang === 'en' ? 'Get Started' : 'தொடங்குங்கள்'}
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.5 }}>
              {lang === 'en' ? 'Create your profile to explore custom layout settings.' : 'தனிப்பயன் தள அமைப்புகளை ஆராய உங்கள் கணக்கை உருவாக்கவும்.'}
            </p>
          </div>

          <form onSubmit={handleManualRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ position: 'relative' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '8px' }}>
                {lang === 'en' ? 'Full Name *' : 'முழு பெயர் *'}
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-user" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }}></i>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                  placeholder={lang === 'en' ? 'Your Name' : 'உங்கள் பெயர்'} 
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
                {lang === 'en' ? 'Email Address *' : 'மின்னஞ்சல் முகவரி *'}
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
                {lang === 'en' ? 'Password *' : 'கடவுச்சொல் *'}
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

            <div className="form-group" style={{ position: 'relative' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '8px' }}>
                {lang === 'en' ? 'Preferred Location' : 'விருப்பமான இடம்'}
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-map-marker-alt" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }}></i>
                <input 
                  type="text" 
                  value={locationStr}
                  onChange={(e) => setLocationStr(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. Chennai' : 'உம்: சென்னை'} 
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
                {lang === 'en' ? 'News Interests' : 'செய்தி விருப்பங்கள்'}
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-newspaper" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }}></i>
                <input 
                  type="text" 
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. Politics, Sports' : 'உம்: அரசியல், விளையாட்டு'} 
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

            <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }} 
                />
                <span>{lang === 'en' ? 'Remember Me' : 'என்னை நினைவில் கொள்'}</span>
              </label>
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
              <span>{lang === 'en' ? 'Sign Up' : 'பதிவு செய்'}</span>
            </button>

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

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
              {lang === 'en' ? 'Already have an account? ' : 'ஏற்கனவே கணக்கு உள்ளதா? '}
              <Link 
                to="/login"
                style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, textDecoration: 'none' }}
              >
                {lang === 'en' ? 'Sign In' : 'உள்நுழைய'}
              </Link>
            </div>
          </form>
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
    </div>
  );
};

export default Register;
