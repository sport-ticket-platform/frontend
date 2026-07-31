import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const emptySignup = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
};

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
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    loginWithPassword,
    requestOtp,
    verifyOtp,
    signupInitiate,
    signupVerify,
    completeSignup,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || '/';

  const heading = useMemo(() => {
    if (mode === 'signup') {
      if (signupStep === 2) return 'تأیید ایمیل';
      if (signupStep === 3) return 'تکمیل مشخصات';
      return 'ساخت حساب جدید';
    }
    if (mode === 'otp' && mfa) return 'واردکردن کد یک‌بارمصرف';
    if (mode === 'otp') return 'ورود با کد یک‌بارمصرف';
    return 'ورود با رمز عبور';
  }, [mode, signupStep, mfa]);

  const showError = (error) => {
    setMessage({ type: 'error', text: error.message || 'عملیات با خطا روبه‌رو شد.' });
  };

  const finishLogin = () => {
    navigate(destination, { replace: true });
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await loginWithPassword(identifier.trim(), password);
      if (result.requiresOtp) {
        setMode('otp');
        setMfa(result.mfa);
        setMessage({ type: 'info', text: 'کد تأیید دومرحله‌ای را وارد کنید.' });
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
        text: result.demoOtp ? `کد آزمایشی ورود: ${result.demoOtp}` : 'کد ورود ارسال شد.',
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
      await verifyOtp(identifier.trim(), mfa, otp);
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
        text: result.demoOtp ? `کد آزمایشی ثبت‌نام: ${result.demoOtp}` : 'کد تأیید ایمیل ارسال شد.',
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

  const finishSignup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await completeSignup({ tempToken, ...signup });
      finishLogin();
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
            <form className="auth-form" onSubmit={submitPassword}>
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
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="حداقل ۸ کاراکتر"
                  autoComplete="current-password"
                />
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>
                <LogIn size={18} />
                {loading ? 'در حال ورود...' : 'ورود به حساب'}
              </button>
            </form>
          )}

          {mode === 'otp' && !mfa && (
            <form className="auth-form" onSubmit={requestLoginCode}>
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
            <form className="auth-form" onSubmit={verifyLoginCode}>
              <label>
                کد تأیید
                <input
                  className="otp-field"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                  placeholder="12345"
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
            <form className="auth-form" onSubmit={startSignup}>
              <label>
                ایمیل
                <input
                  required
                  type="email"
                  value={signup.email}
                  onChange={(event) => setSignup({ ...signup, email: event.target.value })}
                  placeholder="example@mail.com"
                />
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
              </button>
            </form>
          )}

          {mode === 'signup' && signupStep === 2 && (
            <form className="auth-form" onSubmit={verifySignupCode}>
              <label>
                کد تأیید ایمیل
                <input
                  className="otp-field"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                  placeholder="12345"
                />
              </label>
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'در حال بررسی...' : 'تأیید کد'}
              </button>
            </form>
          )}

          {mode === 'signup' && signupStep === 3 && (
            <form className="auth-form" onSubmit={finishSignup}>
              <div className="auth-two-fields">
                <label>
                  نام
                  <input
                    required
                    value={signup.firstName}
                    onChange={(event) => setSignup({ ...signup, firstName: event.target.value })}
                  />
                </label>
                <label>
                  نام خانوادگی
                  <input
                    required
                    value={signup.lastName}
                    onChange={(event) => setSignup({ ...signup, lastName: event.target.value })}
                  />
                </label>
              </div>
              <label>
                رمز عبور
                <input
                  required
                  minLength={8}
                  type="password"
                  value={signup.password}
                  onChange={(event) => setSignup({ ...signup, password: event.target.value })}
                  placeholder="حداقل ۸ کاراکتر"
                />
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
