import React from 'react';
import { useAuth } from '../contexts/AuthContext'; // 导入 useAuth

const API_BASE_URL = 'http://localhost:5000';

const DeleteButton = ({ onClick }) => (
    <button 
        onClick={onClick} 
        style={{ float: 'right', background: 'none', border: '1px solid #ccc',color: '#ff4d4f', cursor: 'pointer', borderRadius: '4px' }}>
        删除
    </button>
);

const ReplyItem = ({ reply, currentUser, onDeleteReply }) => (
  <div style={{ marginLeft: '20px', marginTop: '10px', borderLeft: '2px solid #eee', paddingLeft: '10px' }}>
    <p>
      <strong>{reply.name}</strong> 
      <small>({new Date(reply.created_at).toLocaleString()})</small>
      {/* 权限检查：只有当这条回复的 user_id 和当前登录用户的 id 相同时，才显示删除按钮 */}
      {currentUser && reply.user_id === currentUser.id && (
        <DeleteButton onClick={() => onDeleteReply(reply.id)} />
      )}
    </p>
    <p style={{ margin: '5px 0' }}>{reply.text}</p>
    {reply.img_url && <img src={`${API_BASE_URL}${reply.img_url}`} alt="回复图片" style={{ maxWidth: '150px', borderRadius: '4px' }} />}
  </div>
);

const CommentItem = ({ comment, currentUser, onSetReply, onDeleteComment, onDeleteReply }) => (
  <li style={{ listStyle: 'none', padding: '15px 0', borderBottom: '1px solid #f0f0f0' }}>
    <div>
      <strong>{comment.name}</strong>
      <small style={{ marginLeft: '10px' }}>({new Date(comment.created_at).toLocaleString()})</small>
      {/* 权限检查：只有当这条评论的 user_id 和当前登录用户的 id 相同时，才显示删除按钮 */}
      {currentUser && comment.user_id === currentUser.id && (
        <DeleteButton onClick={() => onDeleteComment(comment.id)} />
      )}
      <button 
        onClick={() => onSetReply(comment)} 
        style={{ float: 'right', background: 'none', border: '1px solid #ccc', cursor: 'pointer', borderRadius: '4px' }}>
        回复
      </button>
    </div>
    <p style={{ margin: '8px 0' }}>{comment.text}</p>
    {comment.img_url && <img src={`${API_BASE_URL}${comment.img_url}`} alt="评论图片" style={{ maxWidth: '200px', borderRadius: '4px' }} />}
    
    {comment.replies && comment.replies.length > 0 && (
      <div style={{ marginTop: '10px' }}>
        {comment.replies.map(reply => (
          <ReplyItem 
            key={reply.id} 
            reply={reply} 
            currentUser={currentUser} 
            onDeleteReply={onDeleteReply} 
          />
        ))}
      </div>
    )}
  </li>
);

const CommentList = ({ comments, currentUser, onSetReply, onDeleteComment, onDeleteReply, isLoading }) => {
  if (isLoading) {
    return <p>正在加载评论...</p>;
  }
  
  if (!comments || comments.length === 0) {
    return <p>这个地方还没有人留言，快来抢沙发吧！</p>;
  }

  return (
    <ul style={{ padding: 0, margin: 0 }}>
      {comments.map(comment => (
        <CommentItem 
          key={comment.id} 
          comment={comment} 
          currentUser={currentUser}
          onSetReply={onSetReply} 
          onDeleteComment={onDeleteComment}
          onDeleteReply={onDeleteReply}
        />
      ))}
    </ul>
  );
};

export default CommentList;