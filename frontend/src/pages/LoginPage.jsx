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
    <div className="login-container">
      <h2>用户登录</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>用户名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
          />
        </div>
        <button type="submit">登录</button>
      </form>
    </div>
  );
}

export default LoginPage;
