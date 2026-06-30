import React, { useState } from 'react';

export default function LoginView({ onLoginSuccess, showToast }) {
  const [loginStep, setLoginStep] = useState('login'); // 'login' | 'register_request'
  
  // Inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // UX toggles
  const [showPass, setShowPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          password
        })
      });

      if (res.ok) {
        const user = await res.json();
        setErrorMsg('');
        onLoginSuccess(user.role, user.username);
        showToast(`Welcome back, ${user.username}!`);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Invalid login details.');
      }
    } catch (err) {
      setErrorMsg('Cannot connect to authentication server.');
    }
  };

  // Handle Registration Request submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword) return;

    try {
      const res = await fetch('/api/auth/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(),
          password: regPassword,
          role: regRole
        })
      });

      if (res.ok) {
        setErrorMsg('');
        setLoginStep('login');
        setRegUsername('');
        setRegPassword('');
        showToast('Registration request sent to Admin for approval!');
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Registration failed.');
      }
    } catch (err) {
      setErrorMsg('Cannot connect to registration server.');
    }
  };

  return (
    <div className="login-root-wrapper">
      <header className="header">
        <div className="header-content">
          <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="/logo.jpg" 
              alt="SSS Logo" 
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover' }} 
            />
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                SSS Family Restaurant
                <span style={{ fontSize: '13px', fontWeight: 'normal', opacity: 0.8, color: 'var(--text-muted)' }}>
                  📞 9985177939
                </span>
              </h1>
              <p>{loginStep === 'login' ? 'Staff Login Portal' : 'Staff Registration Portal'}</p>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => window.location.href = '/'}>
            ← Menu
          </button>
        </div>
      </header>

      <main className="container fade-in" style={{ paddingTop: '20px' }}>
        <div style={{ maxWidth: '480px', margin: '40px auto 0', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
          {loginStep === 'login' ? (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px', textAlign: 'center' }}>Staff Login</h2>

              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Username</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter username..." 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required 
                    autoFocus 
                    autoComplete="username" 
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showPass ? 'text' : 'password'} 
                      className="form-input" 
                      placeholder="Enter password..." 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                      autoComplete="current-password" 
                      style={{ paddingRight: '40px' }} 
                    />
                    <button 
                      type="button" 
                      className="no-print"
                      onClick={() => setShowPass(!showPass)} 
                      style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', outline: 'none', padding: 0 }}
                    >
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                
                {errorMsg && <p className="login-error">{errorMsg}</p>}
                
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Log in</button>
                
                <p style={{ fontSize: '12px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '8px' }}>
                  New staff member? <a href="#" onClick={(e) => { e.preventDefault(); setLoginStep('register_request'); setErrorMsg(''); }} style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'underline' }}>Request registration</a>
                </p>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px', textAlign: 'center' }}>Request Registration</h2>
              
              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Requested Role</label>
                  <select 
                    className="form-input" 
                    value={regRole} 
                    onChange={(e) => setRegRole(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Role...</option>
                    <option value="waiter">Waiter / Waitress</option>
                    <option value="cook">Kitchen Chef / Cook</option>
                    <option value="admin">Restaurant Admin</option>
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Desired Username</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. chef_kalyan" 
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required 
                    autoComplete="username" 
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showRegPass ? 'text' : 'password'} 
                      className="form-input" 
                      placeholder="Create password..." 
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required 
                      autoComplete="new-password" 
                      style={{ paddingRight: '40px' }} 
                    />
                    <button 
                      type="button" 
                      className="no-print"
                      onClick={() => setShowRegPass(!showRegPass)} 
                      style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', outline: 'none', padding: 0 }}
                    >
                      {showRegPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {errorMsg && <p className="login-error">{errorMsg}</p>}
                
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Submit Request</button>
                
                <p style={{ fontSize: '12px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setLoginStep('login'); setErrorMsg(''); }} style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'underline' }}>Back to Login</a>
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
