import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Circle, Eye, EyeOff, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const emptySignup = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
};

function PasswordCriteriaIndicator({ value, touched, showAll = false }) {
  const hasStartedTyping = value.length >= 4 || showAll || (touched && value.length > 0);

  const lengthOk = value.length >= 8 && value.length <= 32;
  const upperLowerOk = /[a-z]/.test(value) && /[A-Z]/.test(value);
  const numberOk = /\d/.test(value);

  // Checks for invalid/non-standard characters (only standard ascii printable characters are standard for passwords)
  // Allowed: ascii 33 to 126 (letters, digits, standard punctuation)
  const hasInvalidChar = /[^\x21-\x7E]/.test(value);

  if (!hasStartedTyping && !hasInvalidChar) {
    return null;
  }

  return (
    <div className="password-requirements">
      {hasInvalidChar && (
        <div className="password-req-item warning">
          <AlertCircle size={14} />
          <span>فقط از حروف انگلیسی، اعداد و علائم مجاز استفاده کنید.</span>
        </div>
      )}
      <div className={`password-req-item ${lengthOk ? 'valid' : (touched || value.length >= 4) ? 'invalid' : ''}`}>
        {lengthOk ? <CheckCircle2 size={14} /> : <Circle size={14} />}
        <span>حداقل ۸ کاراکتر</span>
      </div>
      <div className={`password-req-item ${upperLowerOk ? 'valid' : (touched || value.length >= 4) ? 'invalid' : ''}`}>
        {upperLowerOk ? <CheckCircle2 size={14} /> : <Circle size={14} />}
        <span>حداقل یک حرف بزرگ (A-Z) و یک حرف کوچک (a-z) انگلیسی</span>
      </div>
      <div className={`password-req-item ${numberOk ? 'valid' : (touched || value.length >= 4) ? 'invalid' : ''}`}>
        {numberOk ? <CheckCircle2 size={14} /> : <Circle size={14} />}
        <span>حداقل یک عدد (0-9)</span>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mfa, setMfa] = useState('');
  const [signupStep, setSignupStep] = useState(1);
  const [signupToken, setSignupToken] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [signup, setSignup] = useState(emptySignup);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetTempToken, setResetTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [signupTouched, setSignupTouched] = useState(false);
  const [resetTouched, setResetTouched] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    loginWithPassword,
    requestOtp,
    verifyOtp,
    signupInitiate,
    signupVerify,
    completeSignup,
    resetPasswordInitiate,
    resetPasswordVerify,
    resetPasswordComplete,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || '/';

  const heading = useMemo(() => {
    if (mode === 'reset') {
      if (resetStep === 2) return 'تأیید بازیابی رمز';
      if (resetStep === 3) return 'انتخاب رمز جدید';
      return 'بازیابی رمز عبور';
    }
    if (mode === 'signup') {
      if (signupStep === 2) return 'تأیید ایمیل';
      if (signupStep === 3) return 'تکمیل مشخصات';
      return 'ساخت حساب جدید';
    }
    if (mode === 'otp' && mfa) return 'واردکردن کد یک‌بارمصرف';
    if (mode === 'otp') return 'ورود با کد یک‌بارمصرف';
    return 'ورود با رمز عبور';
  }, [mode, signupStep, resetStep, mfa]);

  const showError = (error) => {
    setMessage({ type: 'error', text: error.message || 'عملیات با خطا روبه‌رو شد.' });
  };

  const finishLogin = () => {
    navigate(destination, { replace: true });
  };

  const getOtpMessage = (step) => (
    step === '2FA-PHONE'
      ? 'کد تأیید دومرحله‌ای به شماره تلفن شما ارسال شد.'
      : 'کد تأیید دومرحله‌ای به ایمیل شما ارسال شد.'
  );

  const submitPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await loginWithPassword(identifier.trim(), password);
      if (result.requiresOtp) {
        setMode('otp');
        setMfa(result.mfa);
        setMessage({ type: 'info', text: getOtpMessage(result.step) });
      } else {
        finishLogin();
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const requestLoginCode = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await requestOtp(identifier.trim());
      setMfa(result.mfa);
      setMessage({
        type: 'info',
        text: 'کد ورود ارسال شد.',
      });
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginCode = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await verifyOtp(identifier.trim(), mfa, otp);

      if (result.requiresOtp) {
        setMfa(result.mfa);
        setOtp('');
        setMessage({ type: 'info', text: getOtpMessage(result.step) });
        return;
      }

      finishLogin();
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const startSignup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await signupInitiate(signup.email.trim());
      setSignupToken(result.signup_token || result.mfa_token || result.mfa);
      setSignupStep(2);
      setMessage({
        type: 'info',
        text: 'کد تأیید ایمیل ارسال شد.',
      });
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const verifySignupCode = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await signupVerify(signupToken, otp);
      setTempToken(result.temp_token);
      setSignupStep(3);
      setOtp('');
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (pwd) => {
    const lengthOk = pwd.length >= 8 && pwd.length <= 32;
    const upperLowerOk = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd);
    const numberOk = /\d/.test(pwd);
    const hasInvalidChar = /[^\x21-\x7E]/.test(pwd);

    if (hasInvalidChar) {
      return 'رمز عبور فقط باید شامل حروف انگلیسی، اعداد و علائم مجاز باشد.';
    }
    if (!lengthOk || !upperLowerOk || !numberOk) {
      return 'رمز عبور باید حداقل ۸ کاراکتر و شامل حروف بزرگ، کوچک و عدد باشد.';
    }
    return null;
  };

  const finishSignup = async (event) => {
    event.preventDefault();
    setSignupTouched(true);

    const validationError = validatePassword(signup.password);
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await completeSignup({ tempToken, ...signup });

      if (result.requiresOtp) {
        setIdentifier(signup.email.trim());
        setMode('otp');
        setMfa(result.mfa);
        setOtp('');
        setMessage({ type: 'info', text: getOtpMessage(result.step) });
        return;
      }

      finishLogin();
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const startPasswordReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await resetPasswordInitiate(resetEmail.trim());
      setResetToken(result.mfa_token);
      setResetStep(2);
      setMessage({ type: 'info', text: 'کد بازیابی به ایمیل شما ارسال شد.' });
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const verifyPasswordReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await resetPasswordVerify(resetToken, otp);
      setResetTempToken(result.temp_token);
      setResetStep(3);
      setOtp('');
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const completePasswordReset = async (event) => {
    event.preventDefault();
    setResetTouched(true);

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await resetPasswordComplete(resetTempToken, newPassword);
      switchMode('password');
      setIdentifier(resetEmail);
      setMessage({ type: 'info', text: 'رمز عبور تغییر کرد؛ اکنون وارد شوید.' });
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setMfa('');
    setOtp('');
    setMessage(null);
    setSignupStep(1);
    setResetStep(1);
  };

  return (
    <section className="auth-section">
      <div className="container auth-layout">
        <div className="auth-card">
          <div className="auth-heading">
            <span>{mode === 'signup' ? <UserPlus size={21} /> : <KeyRound size={21} />}</span>
            <div>
              <h2>{heading}</h2>
              <p>{location.state?.message || 'اطلاعات خواسته‌شده را وارد کنید.'}</p>
            </div>
          </div>

          {mode !== 'signup' && !mfa && (
            <div className="auth-tabs">
              <button
                className={mode === 'password' ? 'active' : ''}
                type="button"
                onClick={() => switchMode('password')}
              >
                رمز عبور
              </button>
              <button
                className={mode === 'otp' ? 'active' : ''}
                type="button"
                onClick={() => switchMode('otp')}
              >
                کد یک‌بارمصرف
              </button>
            </div>
          )}
          {message && (
            <div className={`form-message ${message.type}`} role="status">
              {message.text}
            </div>
          )}

          {mode === 'password' && (
            <form className="auth-form" onSubmit={submitPassword} aria-busy={loading}>
              <label>
                ایمیل یا شماره تلفن
                <input
                  required
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="example@mail.com یا 09121234567"
                  autoComplete="username"
                />
              </label>
              <label>
                رمز عبور
                <div className="password-field-wrapper">
                  <input
                    required
                    minLength={1}
                    maxLength={32}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="رمز عبور حساب"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'مخفی‌کردن رمز عبور' : 'نمایش رمز عبور'}
                    aria-label={showPassword ? 'مخفی‌کردن رمز عبور' : 'نمایش رمز عبور'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>
                <LogIn size={18} />
                {loading ? 'در حال ورود...' : 'ورود به حساب'}
              </button>
              <button className="auth-text-button" type="button" onClick={() => switchMode('reset')}>
                رمز عبور را فراموش کرده‌ام
              </button>
            </form>
          )}

          {mode === 'reset' && resetStep === 1 && (
            <form className="auth-form" onSubmit={startPasswordReset} aria-busy={loading}>
              <label>ایمیل حساب
                <input required type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} />
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>ارسال کد بازیابی</button>
            </form>
          )}

          {mode === 'reset' && resetStep === 2 && (
            <form className="auth-form" onSubmit={verifyPasswordReset} aria-busy={loading}>
              <label>کد تأیید
                <input required className="otp-field" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} />
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>تأیید کد</button>
            </form>
          )}

          {mode === 'reset' && resetStep === 3 && (
            <form className="auth-form" onSubmit={completePasswordReset} aria-busy={loading} noValidate>
              <label>رمز عبور جدید
                <div className="password-field-wrapper">
                  <input
                    required
                    type={showResetPassword ? 'text' : 'password'}
                    minLength={8}
                    maxLength={32}
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      if (message?.type === 'error') setMessage(null);
                    }}
                    placeholder="۸ تا ۳۲ کاراکتر؛ شامل حرف بزرگ، کوچک و عدد"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowResetPassword((prev) => !prev)}
                    title={showResetPassword ? 'مخفی‌کردن رمز عبور' : 'نمایش رمز عبور'}
                    aria-label={showResetPassword ? 'مخفی‌کردن رمز عبور' : 'نمایش رمز عبور'}
                  >
                    {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <PasswordCriteriaIndicator value={newPassword} touched={resetTouched} />
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>ثبت رمز جدید</button>
            </form>
          )}

          {mode === 'otp' && !mfa && (
            <form className="auth-form" onSubmit={requestLoginCode} aria-busy={loading}>
              <label>
                ایمیل یا شماره تلفن
                <input
                  required
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="example@mail.com یا 09121234567"
                />
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'در حال ارسال...' : 'ارسال کد ورود'}
              </button>
            </form>
          )}

          {mode === 'otp' && mfa && (
            <form className="auth-form" onSubmit={verifyLoginCode} aria-busy={loading}>
              <label>
                کد تأیید
                <input
                  className="otp-field"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                  placeholder="کد ۶ رقمی"
                />
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'در حال بررسی...' : 'تأیید و ورود'}
              </button>
              <button
                className="auth-text-button"
                type="button"
                onClick={() => {
                  setMfa('');
                  setOtp('');
                  setMessage(null);
                }}
              >
                تغییر ایمیل یا شماره تلفن
              </button>
            </form>
          )}

          {mode === 'signup' && signupStep === 1 && (
            <form className="auth-form" onSubmit={startSignup} aria-busy={loading}>
              <label>
                ایمیل
                <input
                  required
                  type="email"
                  value={signup.email}
                  onChange={(event) => setSignup({ ...signup, email: event.target.value })}
                  placeholder="example@mail.com"
                  autoComplete="email"
                />
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
              </button>
            </form>
          )}

          {mode === 'signup' && signupStep === 2 && (
            <form className="auth-form" onSubmit={verifySignupCode} aria-busy={loading}>
              <label>
                کد تأیید ایمیل
                <input
                  className="otp-field"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                  placeholder="کد ۶ رقمی"
                />
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'در حال بررسی...' : 'تأیید کد'}
              </button>
            </form>
          )}

          {mode === 'signup' && signupStep === 3 && (
            <form className="auth-form" onSubmit={finishSignup} aria-busy={loading} noValidate>
              <div className="auth-two-fields">
                <label>
                  نام
                  <input
                    required
                    minLength={2}
                    maxLength={50}
                    autoComplete="given-name"
                    value={signup.firstName}
                    onChange={(event) => setSignup({ ...signup, firstName: event.target.value })}
                  />
                </label>
                <label>
                  نام خانوادگی
                  <input
                    required
                    minLength={2}
                    maxLength={50}
                    autoComplete="family-name"
                    value={signup.lastName}
                    onChange={(event) => setSignup({ ...signup, lastName: event.target.value })}
                  />
                </label>
              </div>
              <label>
                رمز عبور
                <div className="password-field-wrapper">
                  <input
                    required
                    minLength={8}
                    maxLength={32}
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signup.password}
                    onChange={(event) => {
                      setSignup({ ...signup, password: event.target.value });
                      if (message?.type === 'error') setMessage(null);
                    }}
                    placeholder="۸ تا ۳۲ کاراکتر؛ شامل حرف بزرگ، کوچک و عدد"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    title={showSignupPassword ? 'مخفی‌کردن رمز عبور' : 'نمایش رمز عبور'}
                    aria-label={showSignupPassword ? 'مخفی‌کردن رمز عبور' : 'نمایش رمز عبور'}
                  >
                    {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <PasswordCriteriaIndicator value={signup.password} touched={signupTouched} />
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'در حال ساخت حساب...' : 'ساخت حساب'}
              </button>
            </form>
          )}

          <div className="auth-switch">
            {mode === 'signup' ? (
              <>
                قبلاً ثبت‌نام کرده‌اید؟
                <button type="button" onClick={() => switchMode('password')}>ورود</button>
              </>
            ) : (
              <>
                حساب کاربری ندارید؟
                <button type="button" onClick={() => switchMode('signup')}>ثبت‌نام</button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
