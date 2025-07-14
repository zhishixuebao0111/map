import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '注册失败');
      
      // 只需传递 token，用户信息将从 token 中解码
      login(data.access_token);
      navigate('/map');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h2 style={styles.title}>用户注册</h2>
        {error && <div style={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="username" style={styles.label}>用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              style={styles.input}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={styles.button}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        
        <div style={styles.loginLink}>
          已有账号？<a href="/login" style={styles.link}>立即登录</a>
        </div>
      </div>
    </div>
  );
};

const styles = {
  // ... (styles 保持不变)
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5', },
  formContainer: { width: '100%', maxWidth: '400px', padding: '2rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)', },
  title: { marginBottom: '1.5rem', textAlign: 'center', color: '#333', },
  form: { display: 'flex', flexDirection: 'column', },
  formGroup: { marginBottom: '1rem', },
  label: { display: 'block', marginBottom: '0.5rem', color: '#555', },
  input: { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', },
  button: { padding: '0.75rem', backgroundColor: '#409eff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', marginTop: '1rem', },
  error: { color: '#f56c6c', marginBottom: '1rem', textAlign: 'center', },
  loginLink: { marginTop: '1.5rem', textAlign: 'center', color: '#666', },
  link: { color: '#409eff', textDecoration: 'none', },
};

export default RegisterPage;