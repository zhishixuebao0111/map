import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import ProfileDropdown from '../components/ProfileDropdown';

const API_BASE_URL = 'http://localhost:5000';

const AIPage = () => {
  // 1. 从 useAuth 同时获取认证状态和 token
  const { isAuthenticated, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [formData, setFormData] = useState({
    location: '',
    interests: '',
    budget: '',
    duration: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('请先登录后再使用AI推荐功能');
      return;
    }

    setLoading(true);
    setRecommendations([]); // 在新请求开始时清空旧数据

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 2. 添加 Authorization 请求头，这是后端认证的关键
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      // 3. 更健壮的错误处理：检查 response.ok 是否为 true (即状态码为 2xx)
      if (!response.ok) {
        // 如果服务端返回 401, 400, 500 等错误，从 data.msg 获取具体的错误信息
        throw new Error(data.msg || '请求失败，请稍后再试。');
      }
      
      // 后端逻辑可能返回 { success: false }，也需要处理
      if (!data.success) {
        throw new Error(data.msg || '获取推荐失败');
      }

      setRecommendations(data.recommendations);
      toast.success('AI推荐已生成！');
    } catch (err) {
      // 这里的 err.message 会接收到上面 throw new Error() 的信息
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <ProfileDropdown />
      <Toaster position="top-center" />
      
      <div className="ai-container" style={{maxWidth: '800px', margin: 'auto', padding: '2rem'}}>
        <h1 style={{textAlign: 'center'}}>AI 智能旅行助手</h1>
        
        <form onSubmit={handleSubmit} className="ai-form">
          <div className="form-group">
            <label>当前位置/目的地 (必填)</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>兴趣偏好 (多个请用逗号分隔)</label>
            <input
              type="text"
              name="interests"
              value={formData.interests}
              onChange={handleInputChange}
              placeholder="例如: 美食,历史,自然"
            />
          </div>

          <div className="form-group">
            <label>预算 (元/人/天)</label>
            <select
              name="budget"
              value={formData.budget}
              onChange={handleInputChange}
            >
              <option value="">不限</option>
              <option value="100">100元以下</option>
              <option value="300">100-300元</option>
              <option value="500">300-500元</option>
              <option value="1000">500-1000元</option>
              <option value="1001">1000元以上</option>
            </select>
          </div>

          <div className="form-group">
            <label>停留时间</label>
            <select
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
            >
              <option value="">不限</option>
              <option value="1">1天</option>
              <option value="3">2-3天</option>
              <option value="7">一周</option>
              <option value="30">一个月</option>
            </select>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? '生成中...' : '获取AI推荐'}
          </button>
        </form>

        {recommendations.length > 0 && (
          <div className="recommendations" style={{marginTop: '2rem'}}>
            <h2 style={{borderBottom: '1px solid #eee', paddingBottom: '0.5rem'}}>为您推荐</h2>
            <ul style={{listStyle: 'none', padding: 0}}>
              {recommendations.map((item, index) => (
                <li key={index} className="recommendation-item" style={{background: '#f9f9f9', padding: '1rem', borderRadius: '4px', marginBottom: '1rem'}}>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="details" style={{display: 'flex', gap: '1rem', color: '#555', fontSize: '0.9em'}}>
                    <span><strong>类型:</strong> {item.type}</span>
                    <span><strong>预计花费:</strong> {item.cost}元</span>
                  </div>
                  <p style={{marginTop: '0.5rem', color: '#333'}}><strong>推荐理由:</strong> {item.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPage;