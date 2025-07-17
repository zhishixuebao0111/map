import React, { useState, useEffect, useCallback, useRef } from 'react';
import CommentForm from '../components/CommentForm';
import CommentList from '../components/CommentList';
import { useAuth } from '../contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import ProfileDropdown from '../components/ProfileDropdown';

const API_BASE_URL = 'http://localhost:5000';

const MapPage = () => {
  const { isAuthenticated, token, currentUser } = useAuth();
  const commentFormRef = useRef(null); 
  const [setMap] = useState(null);
  const markersRef = useRef([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [commentsForModal, setCommentsForModal] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isFetchingMarkers = useRef(false); // 添加一个锁，防止并发请求
  const mapRef = useRef(null); 
  const [isMapReady, setIsMapReady] = useState(false);
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
    const map = mapRef.current;
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
  }, [fetchCommentsForModal]);

  // --- 加载地图上所有初始标记 ---
  const fetchAndDrawMarkersInView = useCallback(async () => {
      const map = mapRef.current; // 直接从 ref 获取最新的 map 实例
        if (!map || isFetchingMarkers.current) return;  
        isFetchingMarkers.current = true;
    
        try {
            const bounds = map.getBounds();
            // ⭐️ 添加一个防御性检查，确保 bounds 对象存在
            if (!bounds) {
                console.warn("map.getBounds() 返回了 undefined，地图可能尚未完全就绪。已跳过本次刷新。");
                isFetchingMarkers.current = false;
                return;
            }

            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
    
            const url = `${API_BASE_URL}/api/comments/all?sw_lat=${sw.lat}&sw_lng=${sw.lng}&ne_lat=${ne.lat}&ne_lng=${ne.lng}`;
            const response = await fetch(url);
            const data = await response.json();
    
              if (data.success && data.comments) {
              map.remove(markersRef.current);
              markersRef.current = [];
              
              // 【核心修改】: 筛选出每个位置的第一条评论用于显示
              const uniqueLocations = new Map();
              const representativeComments = [];

              // 因为后端已经按时间升序排好序，所以我们遍历时遇到的第一个就是最早的
              for (const comment of data.comments) {
                  const key = `${comment.lat},${comment.lng}`;
                  if (!uniqueLocations.has(key)) {
                      uniqueLocations.set(key, true); // 标记这个位置已经处理过
                      representativeComments.push(comment); // 将这条最早的评论加入待显示列表
                  }
              }
              
              // 只为筛选出的代表性评论创建 Marker
              const newMarkers = representativeComments.map(comment => createMarker(comment));
              markersRef.current = newMarkers.filter(m => m !== null);
          }
          } catch (err) {
          console.error("加载视野内标记失败:", err);
          if (!err.message.includes("getStatus")) {
               toast.error(err.message || "无法加载地图标记点");
          }
      } finally {
          isFetchingMarkers.current = false;
      }
    }, [createMarker]);

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
      await fetchAndDrawMarkersInView();
      
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
        fetchAndDrawMarkersInView();

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

      mapInstance.on('complete', () => {
        console.log("地图已完全加载！");
        mapRef.current = mapInstance; // 将实例存入 ref
        
        // 添加控件
        mapInstance.addControl(new window.AMap.Scale());
        mapInstance.addControl(new window.AMap.ToolBar());
        
        // 绑定事件 (这里的函数引用现在是稳定的，不会变)
        mapInstance.on('dblclick', handleMapDoubleClick);
        mapInstance.on('moveend', fetchAndDrawMarkersInView);
        mapInstance.on('zoomend', fetchAndDrawMarkersInView);

        // 设置 ready 状态，触发后续操作
        setIsMapReady(true);
      });
    };
 if (window.AMap) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=be38f49d3fd17ed74d3940f14081bf75&plugin=AMap.Scale,AMap.ToolBar`;
      script.async = true;
      document.body.appendChild(script);
      script.onload = initMap;
    }

    return () => {
      if (mapInstance) {
        mapInstance.destroy();
        mapRef.current = null;
      }
    };
  }, [handleMapDoubleClick, fetchAndDrawMarkersInView]);  
  useEffect(() => {
    if (isMapReady) {
      fetchAndDrawMarkersInView();
    }
  }, [isMapReady, fetchAndDrawMarkersInView]); 

  return (
    <div className="app">
      <ProfileDropdown />
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