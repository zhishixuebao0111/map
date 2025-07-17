import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // 确保路径正确

const ProfileDropdown = () => {
  // 1. 状态和 Hooks
  const [isOpen, setIsOpen] = useState(false); // 控制下拉菜单是否打开
  const { isAuthenticated, currentUser, logout } = useAuth(); // 从 AuthContext 获取登录状态、用户信息和登出函数
  const navigate = useNavigate();
  const dropdownRef = useRef(null); // 用于检测点击是否在组件外部

  // 登出处理函数
  const handleLogout = () => {
    logout();
    setIsOpen(false); // 关闭菜单
    navigate('/map'); // 跳转到登录页
  };

  // 这是一个常用的技巧：当用户点击下拉菜单外部时，自动关闭它
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    // 监听全局的 mousedown 事件
    document.addEventListener('mousedown', handleClickOutside);
    // 组件卸载时，移除监听，防止内存泄漏
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 2. 内联样式 (Styling)
  // 使用 JS 对象来定义样式，直接在 JSX 中使用
  const styles = {
    profileContainer: {
      position: 'absolute',
      top: '15px',
      right: '15px',
      zIndex: 1000, // 确保在地图控件之上
    },
    avatarBtn: {
      width: '45px',
      height: '45px',
      borderRadius: '50%',
      backgroundColor: 'white',
      border: '1px solid #ccc',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '24px',
      cursor: 'pointer',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
    },
    dropdown: {
      position: 'absolute',
      top: '55px', // 按钮下方
      right: 0,
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      minWidth: '160px',
      overflow: 'hidden', // 配合 borderRadius
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    dropdownHeader: {
      padding: '10px 15px',
      borderBottom: '1px solid #f0f0f0',
      color: '#666',
      fontSize: '14px',
    },
    dropdownItemLink: {
      display: 'block',
      padding: '10px 15px',
      color: '#333',
      textDecoration: 'none',
      cursor: 'pointer',
    },
     dropdownItemButton: {
      display: 'block',
      width: '100%',
      padding: '10px 15px',
      color: '#333',
      border: 'none',
      backgroundColor: 'transparent',
      textAlign: 'left',
      cursor: 'pointer',
      fontSize: '16px'
    }
  };

  // 3. JSX 结构和条件渲染
  return (
    <div style={styles.profileContainer} ref={dropdownRef}>
      {/* 头像按钮，点击时切换菜单的打开/关闭状态 */}
      <button onClick={() => setIsOpen(!isOpen)} style={styles.avatarBtn}>
        👤
      </button>

      {/* 条件渲染：只有在 isOpen 为 true 时才显示下拉菜单 */}
      {isOpen && (
        <ul style={styles.dropdown}>
          {/* 条件渲染：根据 isAuthenticated 的值显示不同内容 */}
          {isAuthenticated ? (
            // --- 用户已登录 ---
            <>
              <li style={styles.dropdownHeader}>
                当前用户: <br/>
                <strong>{currentUser.username}</strong>
              </li>
              <li>
                <button onClick={handleLogout} style={styles.dropdownItemButton}>
                  登出
                </button>
              </li>
            </>
          ) : (
            // --- 用户未登录 ---
            <li>
              <Link to="/login" onClick={() => setIsOpen(false)} style={styles.dropdownItemLink}>
                登录
              </Link> 
              <Link to="/register" onClick={() => setIsOpen(false)} style={styles.dropdownItemLink}>
                注册
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default ProfileDropdown;