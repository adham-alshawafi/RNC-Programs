import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  Check, 
  Eye, 
  EyeOff, 
  Shield, 
  ArrowRight, 
  HelpCircle, 
  RotateCcw, 
  Sparkles, 
  Inbox, 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Key,
  Chrome
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { googleSignIn } from '../lib/firebaseAuth';

export interface UserAccount {
  id: string;
  fullName?: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  securityQuestion?: string;
  securityAnswer?: string;
  isGoogleAccount?: boolean;
}

export const STANDARD_QUESTIONS = [
  "What is your favorite school subject?",
  "What was the name of your first school?",
  "What was the name of your first pet?",
  "What was the model of your first car?",
  "In what city were you born?",
  "What is your favorite book?",
  "Custom Security Question..."
];

export interface AuthSession {
  userId: string;
  rememberMe: boolean;
  expiresAt: number;
}

interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: string;
  actionToken?: string;
  type: 'reset' | 'confirmation';
}

interface AuthProps {
  onLoginSuccess: (user: UserAccount, rememberMe: boolean) => void;
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
}

export default function Auth({ onLoginSuccess, users, setUsers }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password' | 'reset_password'>('login');
  
  // Registration States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [isHashing, setIsHashing] = useState(false);
  const [regSecurityQuestion, setRegSecurityQuestion] = useState(STANDARD_QUESTIONS[0]);
  const [regCustomQuestion, setRegCustomQuestion] = useState('');
  const [regSecurityAnswer, setRegSecurityAnswer] = useState('');

  // Password Recovery / Security Question States
  const [matchedUser, setMatchedUser] = useState<UserAccount | null>(null);
  const [securityAnswerInput, setSecurityAnswerInput] = useState('');
  const [securityAnswerError, setSecurityAnswerError] = useState('');

  // Login States
  const [loginEmail, setLoginEmail] = useState('guest@classroom.com');
  const [loginPassword, setLoginPassword] = useState('Guest@123');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [googleSignInError, setGoogleSignInError] = useState('');

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [smtpNotice, setSmtpNotice] = useState('');

  // Reset Password States
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Read URL token if present on mount (simulating raw recovery link clicks in SPA)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setMode('reset_password');
      setResetTokenInput(token);
      // Clean query params so it doesn't linger
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Memorable guidelines suggest template generator
  const [suggestedPasswords, setSuggestedPasswords] = useState([
    { type: 'passphrase', text: 'Tiger-Dance-Piano-Sun', desc: '3–4 unrelated phrases separated by dashes' },
    { type: 'sentence', text: 'BlueCoffee$42', desc: 'A memorable everyday short sentence' },
    { type: 'personal', text: 'Apples!May2016', desc: 'A favorite memory paired with symbols & date' }
  ]);

  const generateMemorableExamples = () => {
    const words = ['Forest', 'Bridge', 'Ocean', 'Castle', 'River', 'Piano', 'Sunset', 'Meadow', 'Falcon', 'Galaxy', 'Maple', 'Desert'];
    const specials = ['$', '!', '#', '%', '&', '@'];
    
    // Passphrase generator
    const w1 = words[Math.floor(Math.random() * words.length)];
    const w2 = words[Math.floor(Math.random() * words.length)];
    const w3 = words[Math.floor(Math.random() * words.length)];
    const dashPass = `${w1}-${w2}-${w3}`;

    // Sentence generator
    const colors = ['Green', 'Warm', 'Cold', 'Loud', 'Silent', 'Golden', 'Dark', 'Sweet'];
    const cups = ['Tea', 'Coffee', 'Choco', 'Juice', 'Cookie', 'Muffin'];
    const sentencePass = `${colors[Math.floor(Math.random() * colors.length)]}${cups[Math.floor(Math.random() * cups.length)]}${specials[Math.floor(Math.random() * specials.length)]}${Math.floor(Math.random() * 90) + 10}`;

    // Keyword generator
    const fruit = ['Sky', 'Star', 'Earth', 'Leaf', 'Rose', 'Mint'];
    const year = Math.floor(Math.random() * 30) + 1995;
    const keywPass = `${fruit[Math.floor(Math.random() * fruit.length)]}${specials[Math.floor(Math.random() * specials.length)]}${year}`;

    setSuggestedPasswords([
      { type: 'passphrase', text: dashPass, desc: '3–4 unrelated phrases separated by dashes' },
      { type: 'sentence', text: sentencePass, desc: 'A memorable everyday short sentence' },
      { type: 'personal', text: keywPass, desc: 'A favorite memory paired with symbols & date' }
    ]);
  };

  // Password Strength scoring
  const passwordStrength = useMemo(() => {
    const pwd = mode === 'register' ? regPassword : newPassword;
    if (!pwd) return { score: 0, text: 'Empty', color: 'bg-slate-200', textClass: 'text-slate-400' };
    
    let points = 0;
    if (pwd.length >= 8) points++;
    if (pwd.length >= 12) points++; // Extra safe!
    if (/[A-Z]/.test(pwd)) points++;
    if (/[a-z]/.test(pwd)) points++;
    if (/[0-9]/.test(pwd)) points++;
    if (/[^A-Za-z0-9]/.test(pwd)) points++;

    if (points <= 2) {
      return { score: 1, text: 'Weak 🔴', color: 'bg-rose-500 w-1/3', textClass: 'text-rose-500' };
    } else if (points <= 4) {
      return { score: 2, text: 'Good Memorable 🟡', color: 'bg-amber-500 w-2/3', textClass: 'text-amber-600' };
    } else {
      return { score: 3, text: 'Super Strong Guard 🟢', color: 'bg-emerald-500 w-full', textClass: 'text-emerald-600' };
    }
  }, [regPassword, newPassword, mode]);

  // Handle Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regEmail.trim() || !regPassword || !regConfirmPassword) {
      setRegError('Please complete all required fields.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Confirm password does not match original password.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }
    const finalQuestion = regSecurityQuestion === "Custom Security Question..." ? regCustomQuestion.trim() : regSecurityQuestion;
    if (!finalQuestion) {
      setRegError('Please specify a security question.');
      return;
    }
    if (!regSecurityAnswer.trim()) {
      setRegError('Please provide an answer to your security question.');
      return;
    }
    const emailLower = regEmail.toLowerCase().trim();
    if (users.some(u => u.email.toLowerCase().trim() === emailLower)) {
      setRegError('An account with this email already exists.');
      return;
    }

    // Cryptographic delays teach security awareness to students & teachers!
    setIsHashing(true);
    setTimeout(() => {
      try {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(regPassword, salt);
        
        const newAcc: UserAccount = {
          id: 'user-' + Math.random().toString(36).substr(2, 9),
          fullName: regName.trim() || undefined,
          email: emailLower,
          passwordHash: hash,
          createdAt: new Date().toISOString(),
          securityQuestion: finalQuestion,
          securityAnswer: regSecurityAnswer.trim().toLowerCase()
        };

        const updatedUsers = [...users, newAcc];
        setUsers(updatedUsers);
        localStorage.setItem('attendance_registered_users', JSON.stringify(updatedUsers));

        setIsHashing(false);
        // Clear forms
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRegSecurityQuestion(STANDARD_QUESTIONS[0]);
        setRegCustomQuestion('');
        setRegSecurityAnswer('');
        
        // Auto sign-in or redirect with success
        onLoginSuccess(newAcc, rememberMe);
      } catch (err) {
        setRegError('Hashing failed. Please try a different password.');
        setIsHashing(false);
      }
    }, 900); // Tiny realistic secure hashing computation block
  };

  // Handle Login Authentication
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please enter both email and password.');
      return;
    }

    const emailLower = loginEmail.toLowerCase().trim();
    const existingUser = users.find(u => u.email.toLowerCase().trim() === emailLower);
    if (!existingUser) {
      setLoginError('Incorrect email or password.');
      return;
    }

    // Secure checking using bcrypt validation logic
    const isMatch = bcrypt.compareSync(loginPassword, existingUser.passwordHash);
    if (!isMatch) {
      setLoginError('Incorrect email or password.');
      return;
    }

    onLoginSuccess(existingUser, rememberMe);
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleSigningIn(true);
      setGoogleSignInError('');
      setLoginError('');
      
      const result = await googleSignIn();
      if (result) {
        const { user } = result;
        const emailLower = user.email ? user.email.toLowerCase().trim() : '';
        if (!emailLower) {
          throw new Error('Google account is missing an email address.');
        }
        
        // Find existing user or register automatically for dynamic Google multi-user sandbox
        let existingUser = users.find(u => u.email.toLowerCase().trim() === emailLower);
        if (!existingUser) {
          const salt = bcrypt.genSaltSync(10);
          const dummyHash = bcrypt.hashSync(Math.random().toString(36), salt);
          existingUser = {
            id: 'user-' + Math.random().toString(36).substr(2, 9),
            fullName: user.displayName || 'Academic Officer',
            email: emailLower,
            passwordHash: dummyHash,
            createdAt: new Date().toISOString(),
            securityQuestion: 'What is your favorite school subject?',
            securityAnswer: 'mathematics',
            isGoogleAccount: true,
          };
          const updatedUsers = [...users, existingUser];
          setUsers(updatedUsers);
          localStorage.setItem('attendance_registered_users', JSON.stringify(updatedUsers));
        }
        
        onLoginSuccess(existingUser, rememberMe);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setGoogleSignInError('The secure Google sign-in window was closed.');
      } else if (err.code === 'auth/account-exists-with-different-credential' || err.code === 'auth/email-already-in-use') {
        setGoogleSignInError('An account with this email address already holds different sign-in credentials (e.g. Email & Password). Please sign in using your standard password or contact your administrator to link them.');
      } else {
        setGoogleSignInError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  // Find account email check
  const handleCheckEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setSecurityAnswerError('');
    setSecurityAnswerInput('');
    setMatchedUser(null);

    if (!forgotEmail.trim()) {
      setForgotError('Please specify your registered email.');
      return;
    }

    const emailLower = forgotEmail.toLowerCase().trim();
    const existingUser = users.find(u => u.email.toLowerCase().trim() === emailLower);

    if (!existingUser) {
      setForgotError('Enter a currently registered tester email address.');
      return;
    }

    setMatchedUser(existingUser);
  };

  // Verify security question answer and reset
  const handleSecurityAnswerVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityAnswerError('');
    if (!matchedUser) return;
    
    const ansLower = securityAnswerInput.trim().toLowerCase();
    const storedAnsLower = (matchedUser.securityAnswer || '').trim().toLowerCase();
    
    if (!ansLower) {
      setSecurityAnswerError('Please type your security answer.');
      return;
    }
    
    if (ansLower !== storedAnsLower) {
      setSecurityAnswerError('Incorrect answer. Please check spelling or capitalization.');
      return;
    }
    
    // Correct! Create a security question bypass reset token
    const token = 'rst-sec-' + Math.random().toString(36).slice(2, 11) + '-' + Math.random().toString(36).slice(2, 11);
    const savedTokens = JSON.parse(localStorage.getItem('attendance_reset_tokens') || '{}');
    savedTokens[token] = {
      email: matchedUser.email.toLowerCase().trim(),
      expiresAt: Date.now() + 600000 // 10 Minutes
    };
    localStorage.setItem('attendance_reset_tokens', JSON.stringify(savedTokens));
    
    // Switch to apply new password directly with prefilled token!
    setResetTokenInput(token);
    setSecurityAnswerInput('');
    setSecurityAnswerError('');
    setMatchedUser(null);
    setForgotSuccess(false);
    setMode('reset_password');
  };

  // Handle Forgot Password link generator
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess(false);
    setSmtpNotice('');

    if (!forgotEmail.trim()) {
      setForgotError('Please specify your registered email.');
      return;
    }

    const emailLower = forgotEmail.toLowerCase().trim();
    const existingUser = users.find(u => u.email.toLowerCase().trim() === emailLower);

    if (!existingUser) {
      setForgotError('Enter a currently registered tester email address.');
      return;
    }

    // Generate random secure unique token
    const token = 'rst-' + Math.random().toString(36).slice(2, 11) + '-' + Math.random().toString(36).slice(2, 11);
    
    // Store token state in localStorage
    const savedTokens = JSON.parse(localStorage.getItem('attendance_reset_tokens') || '{}');
    savedTokens[token] = {
      email: emailLower,
      expiresAt: Date.now() + 3600000 // Valid for 1 Hour
    };
    localStorage.setItem('attendance_reset_tokens', JSON.stringify(savedTokens));

    setIsSendingMail(true);
    setGeneratedToken(token);

    try {
      const response = await fetch('/api/send-reset-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailLower,
          token: token,
          fullName: existingUser.fullName || 'Academic Officer'
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setForgotSuccess(true);
        setSmtpNotice(`Successfully delivered! We sent a secure verification code to: ${emailLower}. Please check your inbox.`);
      } else if (data.simulated) {
        // Safe sandbox fallback for easy local preview/testing before SMTP credentials addition
        setForgotSuccess(true);
        setSmtpNotice(`Code generated successfully. To receive actual physical emails, configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD in Settings Secrets.`);
      } else {
        setForgotSuccess(true);
        setForgotError(`Server email service response error: ${data.error || 'SMTP failed'}. Token shown below for testing convenience.`);
      }
    } catch (err: any) {
      console.error("Failed to call secure email reset API:", err);
      setForgotSuccess(true);
      setSmtpNotice(`Offline Backup Mode: Generated verification token successfully.`);
    } finally {
      setIsSendingMail(false);
    }
  };

  // Handle Password Reset Submission
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);

    if (!resetTokenInput.trim()) {
      setResetError('Recovery validation token code cannot be empty.');
      return;
    }
    if (!newPassword || !confirmNewPassword) {
      setResetError('Please type and confirm your memorable password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }

    // Verify raw recovery token
    const savedTokens = JSON.parse(localStorage.getItem('attendance_reset_tokens') || '{}');
    const tokenData = savedTokens[resetTokenInput.trim()];

    if (!tokenData) {
      setResetError('Invalid or exhausted recovery token.');
      return;
    }

    if (Date.now() > tokenData.expiresAt) {
      setResetError('Recovery token has expired (limit 1 hour). Please request a new link.');
      return;
    }

    // Update password hash
    const emailLower = tokenData.email.toLowerCase();
    const updatedUsers = users.map(u => {
      if (u.email.toLowerCase() === emailLower) {
        const salt = bcrypt.genSaltSync(10);
        return {
          ...u,
          passwordHash: bcrypt.hashSync(newPassword, salt)
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    localStorage.setItem('attendance_registered_users', JSON.stringify(updatedUsers));

    // Clear and expire token
    delete savedTokens[resetTokenInput.trim()];
    localStorage.setItem('attendance_reset_tokens', JSON.stringify(savedTokens));

    setResetSuccess(true);
    setNewPassword('');
    setConfirmNewPassword('');
    setResetTokenInput('');

    setTimeout(() => {
      setMode('login');
      setResetSuccess(false);
    }, 2500);
  };

  // Auto load simulated defaults if users is empty
  useEffect(() => {
    if (users.length === 0) {
      // Pre-add a prototype sandbox account
      const salt = bcrypt.genSaltSync(10);
      const guestHash = bcrypt.hashSync('Guest@123', salt);
      const initialUsers: UserAccount[] = [
        {
          id: 'user-guest',
          fullName: 'Professor Smith',
          email: 'guest@classroom.com',
          passwordHash: guestHash,
          createdAt: new Date().toISOString(),
          securityQuestion: "What is your favorite school subject?",
          securityAnswer: "mathematics"
        }
      ];
      setUsers(initialUsers);
      localStorage.setItem('attendance_registered_users', JSON.stringify(initialUsers));
    }
  }, [users, setUsers]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-indigo-100 rounded-full blur-3xl opacity-40 mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 w-96 h-96 bg-amber-100/60 rounded-full blur-3xl opacity-40 mix-blend-multiply pointer-events-none" />

      {/* Main card panel */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <center className="space-y-2 mb-6">
          <div className="inline-flex p-3 bg-indigo-650 text-white rounded-2xl shadow-xl shadow-indigo-150 transform hover:rotate-6 transition-transform">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 font-display tracking-tight">
            Academic Attendance System
          </h2>
          <p className="text-xs text-slate-400 font-bold tracking-wide uppercase">
            SECURE STUDENT DATA ENGINE
          </p>
        </center>

        <div className="bg-white py-8 px-6 shadow-xl border border-slate-100/80 rounded-3xl sm:px-10">
          <AnimatePresence mode="wait">
            {/* LOGIN MODE */}
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Welcome Back</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Verify your credentials to review records</p>
                </div>

                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="login-email"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        placeholder="e.g. guest@classroom.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 transition font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="login-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setMode('forgot_password')}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 transition font-mono font-bold text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-200 focus:ring-indigo-500"
                      />
                      <span>Remember me</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-xl shadow-indigo-150 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <span>Secure Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Secure Google Identity Provider */}
                <div id="google-sso-container" className="space-y-4">
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-150"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-black uppercase tracking-wider select-none">Or SSO Authentication</span>
                    <div className="flex-grow border-t border-slate-150"></div>
                  </div>

                  {googleSignInError && (
                    <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-red-600 text-[11px] font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{googleSignInError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isGoogleSigningIn}
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 bg-white border border-slate-205 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isGoogleSigningIn ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span>Authenticating with Google...</span>
                      </>
                    ) : (
                      <>
                        <Chrome className="w-4 h-4 text-indigo-650" />
                        <span>Sign In with Google Account</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-4 text-center">
                  <p className="text-xs font-bold text-slate-500">
                    New academic admin?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-indigo-600 hover:text-indigo-700 underline font-black"
                    >
                      Register account
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* REGISTER MODE */}
            {mode === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-800 font-display">Create Admin Space</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Add an encrypted credential system</p>
                </div>

                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label htmlFor="reg-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Full Name <span className="text-slate-300 font-medium">(Optional)</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="reg-name"
                        type="text"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="e.g. Dr. Robert Vance"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 transition font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="reg-email" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Email address <span className="text-indigo-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="admin@school.org"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 transition font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Memorable password suggestions panel */}
                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Memorable Tips Suggestion
                      </span>
                      <button
                        type="button"
                        onClick={generateMemorableExamples}
                        className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                        title="Click to generate random examples based on guidelines."
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Suggest New
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                      Instead of complex letters, create an easily remembered combo. Click sugar-suggestions below to autofill:
                    </p>
                    <div className="space-y-1.5 pt-0.5">
                      {suggestedPasswords.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setRegPassword(s.text);
                            setRegConfirmPassword(s.text);
                          }}
                          className="w-full text-left bg-white hover:bg-slate-50 border border-slate-100 p-2 rounded-xl flex items-center justify-between transition cursor-pointer active:scale-[0.99]"
                        >
                          <div>
                            <span className="block text-[9px] font-mono text-indigo-600 font-bold bg-indigo-50/70 border border-indigo-100 px-1 py-0.2 rounded w-fit capitalize mb-0.5">
                              {s.type}
                            </span>
                            <span className="block text-xxs font-semibold text-slate-400">{s.desc}</span>
                          </div>
                          <span className="font-mono text-xxs font-black text-slate-800 tracking-wide bg-slate-50 px-2 py-1 rounded border">
                            {s.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="reg-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Desired Password <span className="text-indigo-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="Phrase + Numbers + Symbol"
                        className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 transition font-mono font-bold text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Score Bar */}
                    {regPassword && (
                      <div className="space-y-1 pt-1">
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-350 rounded-full ${passwordStrength.color}`} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-extrabold">
                          <span className="text-slate-400">Security strength:</span>
                          <span className={passwordStrength.textClass}>{passwordStrength.text}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="reg-confirm-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Confirm Password <span className="text-indigo-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="reg-confirm-password"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={e => setRegConfirmPassword(e.target.value)}
                        placeholder="match password to prevent typos"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 transition font-mono font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Security Question and Answer selection */}
                  <div className="bg-indigo-50/50 hover:bg-indigo-50/75 p-3.5 rounded-2xl border border-indigo-100/50 space-y-3 transition">
                    <span className="block text-[10px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4.5 h-4.5 text-indigo-650 shrink-0" />
                      Security Recovery Question
                    </span>
                    <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                      An alternative password recovery method if you lose access to emails. Keep the answer memorable but hard to guess!
                    </p>

                    <div className="space-y-1">
                      <label htmlFor="reg-security-question" className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">
                        Select Security Question
                      </label>
                      <select
                        id="reg-security-question"
                        value={regSecurityQuestion}
                        onChange={e => setRegSecurityQuestion(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-205 border-slate-200 outline-none rounded-xl text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150/50 transition cursor-pointer"
                      >
                        {STANDARD_QUESTIONS.map((q, idx) => (
                          <option key={idx} value={q}>{q}</option>
                        ))}
                      </select>
                    </div>

                    {regSecurityQuestion === "Custom Security Question..." && (
                      <div className="space-y-1 mt-1.5">
                        <label htmlFor="reg-custom-question" className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">
                          Write custom Question
                        </label>
                        <input
                          id="reg-custom-question"
                          type="text"
                          required
                          value={regCustomQuestion}
                          onChange={e => setRegCustomQuestion(e.target.value)}
                          placeholder="e.g. What is your secret childhood nickname?"
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 outline-none rounded-xl text-xs font-bold text-slate-705 text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150/50 transition"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label htmlFor="reg-security-answer" className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">
                        Security Answer
                      </label>
                      <input
                        id="reg-security-answer"
                        type="text"
                        required
                        value={regSecurityAnswer}
                        onChange={e => setRegSecurityAnswer(e.target.value)}
                        placeholder="Type secret recovery answer..."
                        className="w-full px-3.5 py-2 bg-white border border-slate-205 border-slate-200 outline-none rounded-xl text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150/50 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isHashing}
                    className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-xl shadow-indigo-150 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    {isHashing ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-200 border-t-white animate-spin" />
                        <span>Bcrypt Safe Crypt Hash...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Save Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="border-t border-slate-100 pt-3 text-center">
                  <p className="text-xs font-bold text-slate-500">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-indigo-600 hover:text-indigo-700 underline font-black"
                    >
                      Login here
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* FORGOT PASSWORD MODE */}
            {mode === 'forgot_password' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Reset Password</h3>
                  <p className="text-[11px] text-slate-400 font-medium font-display">Recover your space instantly via security question or secure email</p>
                </div>

                {forgotError && (
                  <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                {!matchedUser ? (
                  <form onSubmit={handleCheckEmail} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="forgot-email" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="forgot-email"
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          placeholder="e.g. guest@classroom.com"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 transition font-bold text-slate-705 text-slate-700"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-xl shadow-indigo-150 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <span>Find Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : forgotSuccess ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 space-y-3 mt-2 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-bold">Verification Request Dispatched!</span>
                    </div>

                    {smtpNotice && (
                      <p className="text-[11px] leading-relaxed text-emerald-950 font-bold bg-white/70 p-2.5 rounded-xl border border-emerald-100 shadow-3xs">
                        {smtpNotice}
                      </p>
                    )}

                    <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                      If SMTP has not been configured in Secrets yet, your local simulation security token is provided below for immediate testing:
                    </p>
                    
                    <div className="p-3 bg-white border border-emerald-100 rounded-xl space-y-1">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Simulated Security Code:</span>
                      <code className="block bg-slate-50 border rounded-lg px-2.5 py-1.5 font-mono text-xs select-all text-indigo-650 font-bold text-center">
                        {generatedToken}
                      </code>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotSuccess(false);
                        setResetTokenInput(generatedToken);
                        setMatchedUser(null);
                        setForgotEmail('');
                        setMode('reset_password');
                      }}
                      className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs py-2 px-3 rounded-xl transition duration-150 text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 active:scale-[0.98]"
                    >
                      <span>Proceed to Reset Code Form</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Account Identification Tag */}
                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl flex items-center justify-between">
                      <div className="text-left max-w-[60%]">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Account Found</span>
                        <span className="text-xs font-bold text-indigo-950 truncate block mt-1">
                          {matchedUser.fullName || 'Academic Officer'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold truncate block font-sans">
                          {matchedUser.email}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMatchedUser(null);
                          setForgotError('');
                          setSecurityAnswerInput('');
                          setSecurityAnswerError('');
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-205 px-3 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        Change Email
                      </button>
                    </div>

                    {/* PATH A: Security Question Form */}
                    <div className="bg-gradient-to-br from-indigo-50/50 to-indigo-100/20 p-4 rounded-2xl border border-indigo-100/50 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-4.5 h-4.5 text-indigo-650 shrink-0" />
                        <h4 className="text-xs font-black text-indigo-950">Option 1: Security Question</h4>
                      </div>
                      
                      {matchedUser.securityQuestion ? (
                        <form onSubmit={handleSecurityAnswerVerify} className="space-y-3">
                          <div className="bg-white p-3 rounded-xl border border-indigo-50/70 text-[11px] font-bold text-slate-700 shadow-3xs">
                            <span className="block text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">Your Question:</span>
                            {matchedUser.securityQuestion}
                          </div>

                          {securityAnswerError && (
                            <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                              {securityAnswerError}
                            </p>
                          )}

                          <div className="space-y-1">
                            <label htmlFor="recovery-security-answer" className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">
                              Your Secret Answer
                            </label>
                            <input
                              id="recovery-security-answer"
                              type="text"
                              required
                              value={securityAnswerInput}
                              onChange={e => setSecurityAnswerInput(e.target.value)}
                              placeholder="Answer (ignores casing/spaces)"
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150/50 outline-none rounded-xl text-xs font-bold text-slate-700 transition font-sans"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-sm active:scale-[0.99] flex items-center justify-center gap-1"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Verify & Reset Password Instantly</span>
                          </button>
                        </form>
                      ) : (
                        <div className="p-3 bg-slate-100/50 rounded-xl border text-[10px] text-slate-500 font-medium">
                          No security question is configured for this account. Please use standard email recovery below.
                        </div>
                      )}
                    </div>

                    {/* PATH B: Standard Email verification */}
                    <div className="bg-slate-50/50 hover:bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5 transition">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-800">Option 2: Email Reset Link</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Receive a secure password reset token to your registered email inbox.
                      </p>
                      
                      <button
                        type="button"
                        onClick={handleForgotSubmit}
                        disabled={isSendingMail}
                        className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition flex items-center justify-center gap-1"
                      >
                        {isSendingMail ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-indigo-650 rounded-full animate-spin"></div>
                            <span>Sending Email reset...</span>
                          </>
                        ) : (
                          <>
                            <Inbox className="w-3.5 h-3.5 text-slate-500" />
                            <span>Send Verification Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-3 text-center flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotError('');
                      setForgotSuccess(false);
                      setMatchedUser(null);
                      setSecurityAnswerInput('');
                      setSecurityAnswerError('');
                      setMode('login');
                    }}
                    className="text-slate-400 hover:text-slate-650 font-bold"
                  >
                    ← Back to Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset_password');
                    }}
                    className="text-indigo-600 hover:text-indigo-700 font-black"
                  >
                    Enter Token Directly
                  </button>
                </div>
              </motion.div>
            )}

            {/* RESET PASSWORD MODE */}
            {mode === 'reset_password' && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Apply New Password</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Input your unique recovery token key</p>
                </div>

                {resetError && (
                  <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                {resetSuccess ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl text-emerald-805 text-emerald-805 text-center space-y-1">
                    <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-xs font-black text-emerald-800">Secure Password Reset Completed!</p>
                    <p className="text-[10px] text-slate-500 font-bold">
                      Hashed with cryptographic bcrypt algorithms. Redirecting back to Login...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleResetSubmit} className="space-y-3.5">
                    <div className="space-y-1">
                      <label htmlFor="reset-token" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Unique Recovery Token <span className="text-indigo-500">*</span>
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="reset-token"
                          type="text"
                          required
                          value={resetTokenInput}
                          onChange={e => setResetTokenInput(e.target.value)}
                          placeholder="Paste token e.g. rst-...."
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 transition font-mono font-bold text-slate-750"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="reset-new-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        New Memorable Password <span className="text-indigo-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="reset-new-password"
                          type={showResetPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Phrase + Numbers + Symbol"
                          className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 transition font-mono font-bold text-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {newPassword && (
                        <div className="space-y-1 pt-1">
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-350 rounded-full ${passwordStrength.color}`} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-extrabold">
                            <span className="text-slate-400">Security strength:</span>
                            <span className={passwordStrength.textClass}>{passwordStrength.text}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="reset-confirm-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Confirm New Password <span className="text-indigo-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="reset-confirm-password"
                          type={showResetPassword ? 'text' : 'password'}
                          required
                          value={confirmNewPassword}
                          onChange={e => setConfirmNewPassword(e.target.value)}
                          placeholder="match password to prevent typos"
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 transition font-mono font-bold text-slate-700"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-xl shadow-indigo-150 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <span>Update Password Hash</span>
                    </button>
                  </form>
                )}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetError('');
                      setMode('login');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline"
                  >
                    ← Back to Login
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>


    </div>
  );
}
