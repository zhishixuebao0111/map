import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // 优化点1：使用函数式初始化，确保只在首次渲染时读取 localStorage
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 解决方案1：将 logout 包裹在 useCallback 中，使其成为一个稳定的函数
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  }, []); // 空依赖数组，此函数永不改变

  // --- 核心函数：通过后端验证 Token 并获取用户信息 ---
  const fetchUser = useCallback(async () => {
    // 如果本地没有 token，直接结束
    if (!token) {
      // 优化点2：确保在 token 为空时，用户状态也被清空
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) { // 确保 data.user 存在
          setCurrentUser(data.user); // 认证成功，设置用户信息
        } else {
          // API 返回成功但没有用户信息，或 success:false，都视为失败
          logout();
        }
      } else {
        // 如果 Token 无效或过期 (401)，或其他错误，则登出
        console.error("Token 验证失败，状态码:", response.status);
        logout(); // 调用 logout 清理状态
      }
    } catch (error) {
      console.error('获取用户信息时网络错误:', error);
      logout(); // 网络错误也视为登出
    } finally {
      setLoading(false);
    }
  // 解决方案2：将稳定的 logout 函数添加到依赖数组中
  }, [token, logout]); 

  // 应用加载时，执行一次用户验证
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // 登录函数：只负责存 Token，然后让 useEffect 去处理验证
  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken); // 更新 token 状态，这会触发上面的 useEffect 重新运行
  };

  const value = {
    currentUser,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!currentUser
  };

  // 只有在初始加载完成后，才渲染子组件，避免页面闪烁
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);