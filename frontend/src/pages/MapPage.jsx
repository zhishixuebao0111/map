import React, { useState, useEffect, useCallback, useRef } from 'react';
import CommentForm from '../components/CommentForm';
import CommentList from '../components/CommentList';
import { useAuth } from '../contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';


const API_BASE_URL = 'http://localhost:5000';

const MapPage = () => {
  const { isAuthenticated, token, currentUser } = useAuth();
  const commentFormRef = useRef(null); 
  const [map, setMap] = useState(null);
  const markersRef = useRef([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [commentsForModal, setCommentsForModal] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  const fetchCommentsForModal = useCallback(async (position) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/comments?lat=${position.lat}&lng=${position.lng}`);
      const data = await response.json();
      if (data.success) {
        setCommentsForModal(data.comments || []);
      } else {
        throw new Error(data.error || '获取评论详情失败');
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // 这个函数本身没有外部依赖，所以是空数组

  // --- 创建 Marker ---
  const createMarker = useCallback((comment) => {
    if (!map) return null;
    const truncatedText = comment.text.length > 20 ? comment.text.substring(0, 20) + '...' : comment.text;
    const markerContent = `
      <div class="custom-marker">
        <div class="marker-username">${comment.name}</div>
        <div class="marker-text">${truncatedText}</div>
        <div class="marker-arrow"></div>
      </div>`;

    const marker = new window.AMap.Marker({
      position: [comment.lng, comment.lat],
      content: markerContent,
      offset: new window.AMap.Pixel(-75, -95),
    });
    
    marker.on('click', () => {
      const position = { lat: comment.lat, lng: comment.lng };
      setSelectedPosition(position);
      fetchCommentsForModal(position);
      setShowModal(true);
    });
    
    map.add(marker);
    return marker;
  }, [map, fetchCommentsForModal]); // 依赖 map 和 fetchCommentsForModal

  // --- 加载地图上所有初始标记 ---
  const fetchAndDrawInitialMarkers = useCallback(async () => {
    if (!map) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/comments/all`);
      const data = await response.json();
      if (data.success && data.comments) {
        map.remove(markersRef.current);
        markersRef.current = [];
        const newMarkers = data.comments.map(comment => createMarker(comment));
        markersRef.current = newMarkers.filter(m => m !== null);
      }
    } catch (err) {
      console.error("加载初始标记失败:", err);
      toast.error(err.message || "无法加载地图标记点");
    }
  }, [map, createMarker]);

  // --- 地图双击处理 ---
  // 1. 用 useCallback 包裹，以便在 useEffect 中安全使用
  const handleMapDoubleClick = useCallback((e) => {
    const position = { lng: e.lnglat.getLng(), lat: e.lnglat.getLat() };
    setSelectedPosition(position);
    // 2. 逻辑修正：双击新位置，评论列表应该为空，而不是去请求
    setCommentsForModal([]);
    setShowModal(true);
  }, []); // 这个函数也没有外部依赖

  // --- 提交新评论或回复 ---
  const handleSubmit = async (formData) => {
    if (!isAuthenticated) {
      toast.error('请先登录后再操作！');
      return;
    }
    setLoading(true);
    
    const isReply = !!replyTo;
    const url = isReply ? `${API_BASE_URL}/api/replies` : `${API_BASE_URL}/api/comments`;
    
    const dataToSend = new FormData();
    dataToSend.append('text', formData.text);
    if (formData.image) {
      dataToSend.append('image', formData.image);
    }
    
    if (isReply) {
      dataToSend.append('comment_id', replyTo.id);
    } else {
      // 确保 selectedPosition 不是 null
      if (!selectedPosition) {
          toast.error("错误：没有选定的坐标。");
          setLoading(false);
          return;
      }
      dataToSend.append('lat', selectedPosition.lat);
      dataToSend.append('lng', selectedPosition.lng);
    }
    const headers = new Headers();
    headers.append('Authorization', `Bearer ${token}`);
    try {
      const response = await fetch(url, { method: 'POST', headers, body: dataToSend });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '提交失败');

      toast.success(isReply ? '回复成功！' : '评论发布成功！');
      
      // 成功后，刷新弹窗内的评论列表和地图上的标记
      await fetchCommentsForModal(selectedPosition);
      await fetchAndDrawInitialMarkers();
      
      if (isReply) setReplyTo(null);
      if (commentFormRef.current) {
        commentFormRef.current.resetForm();
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("你确定要删除这条评论吗？其所有回复也将被一并删除。")) {
        return;
    }

    const headers = new Headers();
    headers.append('Authorization', `Bearer ${token}`);

    try {
        const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: headers
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || '删除失败');
        }

        toast.success("评论已删除");
        
        // 刷新数据
        fetchCommentsForModal(selectedPosition);
        fetchAndDrawInitialMarkers();

    } catch (err) {
        toast.error(err.message || '删除评论时出错');
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm("你确定要删除这条回复吗？")) {
        return;
    }
    
    const headers = new Headers();
    headers.append('Authorization', `Bearer ${token}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/replies/${replyId}`, {
            method: 'DELETE',
            headers: headers
        });
        
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || '删除失败');
        }

        toast.success("回复已删除");
        fetchCommentsForModal(selectedPosition); // 只刷新弹窗即可

    } catch (err) {
        toast.error(err.message || '删除回复时出错');
    }
  };
  // --- 关闭弹窗并重置状态 ---
  const closeModal = () => {
    setShowModal(false);
    setCommentsForModal([]);
    setReplyTo(null);
    setError(null);
  };

  // --- 初始化地图 ---
  useEffect(() => {
    let mapInstance = null;
    const initMap = () => {
      mapInstance = new window.AMap.Map('map-container', {
        zoom: 17, center: [117.145, 34.217],
        viewMode: '3D', pitch: 45,
        doubleClickZoom: false,
      });
      mapInstance.addControl(new window.AMap.Scale());
      mapInstance.addControl(new window.AMap.ToolBar());
      
      // 5. 绑定用 useCallback 包裹的稳定函数
      mapInstance.on('dblclick', handleMapDoubleClick);
      
      setMap(mapInstance);
    };

    if (window.AMap && !map) {
      initMap();
    } else if (!window.AMap) {
      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=be38f49d3fd17ed74d3940f14081bf75&plugin=AMap.Scale,AMap.ToolBar`;
      script.async = true;
      document.body.appendChild(script);
      script.onload = initMap;
    }

    return () => {
      if (mapInstance) {
        // 6. 清理时也使用同一个稳定的函数实例
        mapInstance.off('dblclick', handleMapDoubleClick);
        mapInstance.destroy();
      }
    };
  // 7. 修正依赖数组：现在它依赖的是一个稳定的函数，所以可以设为空数组，确保只运行一次
  }, [handleMapDoubleClick]);

  // --- 地图准备好后，加载初始标记 ---
  useEffect(() => {
    if (map) {
      fetchAndDrawInitialMarkers();
    }
  }, [map, fetchAndDrawInitialMarkers]);

  return (
    <div className="app">
      <Toaster position="top-center" />
      <div id="map-container" className="map-container" />

      {showModal && (
        <div className="overlay">
          <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <button className="close-btn" onClick={closeModal}>×</button>
            <h2 style={{marginTop: 0, flexShrink: 0 }}>位置留言</h2>
            
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '10px' }}>
              <CommentList 
                comments={commentsForModal}
                currentUser={currentUser}
                onSetReply={(comment) => {
                  if (!isAuthenticated) {
                    toast.error('请先登录才能回复！');
                    return;
                  }
                  setReplyTo({ id: comment.id, name: comment.name });
                }}
                onDeleteComment={handleDeleteComment}
                onDeleteReply={handleDeleteReply}
                isLoading={loading}
              />
            </div>
            
            <div style={{ flexShrink: 0 }}>
              <CommentForm
                  ref={commentFormRef} // 3. 将 ref 传递给 CommentForm
                  onSubmit={handleSubmit}
                  isLoading={loading}
                  replyingTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
              />
              {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;