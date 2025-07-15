import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import React from 'react';
const LoginPage= () =>{
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      });
      
      if (res.data.success) {
        // 只需传递 token，用户信息将从 token 中解码
        login(res.data.access_token);
        navigate('/');
      } else {
        throw new Error(res.data.error || '登录失败');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || '登录失败');
      console.error('登录错误:', err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
      <h2 style={styles.title}>用户登录</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
      <div style={styles.formGroup}>
            <label htmlFor="username" style={styles.label}>用户名</label>
            <input
              type="text"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              style={styles.input}
            />
          </div>
        <button 
            type="submit" 
            
            style={styles.button}>登录
            </button>
      </form>
    </div>
    </div>
  );
}
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
export default LoginPage;
