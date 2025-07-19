import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// --- 样式定义 ---
const styles = {
  menuContainer: {
    position: 'absolute',
    top: '15px',
    right: '75px',
    zIndex: 1001,
  },
  triggerButton: {
    width: '45px',
    height: '45px',
    borderRadius: '8px',
    backgroundColor: 'white',
    border: '1px solid #ccc',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '24px',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
    position: 'absolute',
    top: 0,
    right: 0,
    transition: 'opacity 0.2s ease, transform 0.2s ease',
  },
  // 展开后的每一个菜单项的通用样式
  menuItem: {
    width: '180px',
    height: '45px',
    padding: '0 15px',
    backgroundColor: 'white',
    border: '1px solid #ccc',
    // 为了实现无缝连接，我们需要处理边框重叠的问题
    // 让每个按钮的上边框都消失，只保留第一个按钮的上边框
    borderTop: 'none',
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease-in-out',
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    right: 0,
  },
  menuItemIcon: {
    marginRight: '15px',
    fontSize: '20px',
  },
};

const HoverMenu = ({ items = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleMouseEnter = () => setIsExpanded(true);
  const handleMouseLeave = () => setIsExpanded(false);

  const handleItemClick = (path) => {
    if (!isAuthenticated) {
      toast.error('请先登录才能使用此功能！');
      navigate('/login');
      return;
    }
    navigate(path);
  };

  return (
    <div
      style={styles.menuContainer}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 汉堡图标触发器 */}
      <div
        style={{
          ...styles.triggerButton,
          opacity: isExpanded ? 0 : 1,
          transform: isExpanded ? 'scale(0.8)' : 'scale(1)',
          pointerEvents: isExpanded ? 'none' : 'auto',
        }}
      >
        ☰
      </div>


      {items.map((item, index) => {
        let dynamicBorderRadius = {};
        if (items.length === 1) {
          dynamicBorderRadius = { borderRadius: '8px' };
        } else if (index === 0) {
          dynamicBorderRadius = { borderTopLeftRadius: '8px', borderTopRightRadius: '8px' };
        } else if (index === items.length - 1) {
          dynamicBorderRadius = { borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' };
        }
        return (
          <div
            key={index}
            onClick={() => handleItemClick(item.path)}
            style={{
              ...styles.menuItem,
              ...dynamicBorderRadius, // 3. 【应用】将计算好的圆角样式应用到按钮上
              borderTop: index === 0 ? '1px solid #ccc' : 'none', // 只有第一个按钮需要上边框
              transform: isExpanded
                ? `translateY(${index * 44}px)` // 44px = 45px高度 - 1px边框重叠
                : 'translateY(0px)',
              opacity: isExpanded ? 1 : 0,
              pointerEvents: isExpanded ? 'auto' : 'none',
              transitionDelay: isExpanded ? `${index * 0.04}s` : '0s',
            }}
          >
            <span style={styles.menuItemIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default HoverMenu;