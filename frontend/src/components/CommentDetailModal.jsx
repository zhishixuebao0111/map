import React from 'react';

// 这是一个简化的回复表单，实际应用中你需要处理状态和提交逻辑
const ReplyForm = ({ commentId }) => (
  <form onSubmit={(e) => { e.preventDefault(); alert(`回复评论 ${commentId} 的功能尚未实现`); }}>
    <hr style={{ margin: '20px 0' }} />
    <h4>回复此留言</h4>
    <input type="text" name="name" placeholder="你的名字" required />
    <textarea name="text" placeholder="你的回复..." rows="3" required></textarea>
    {/* 这里可以添加图片上传和提交逻辑 */}
    <button type="submit">提交回复</button>
  </form>
);

const CommentDetailModal = ({ data, onClose }) => {
  if (!data) return null;

  const { comment, replies } = data;

  return (
    // 点击遮罩层关闭弹窗
    <div className="overlay" onClick={onClose}>
      {/* 点击内容区域防止事件冒泡关闭弹窗 */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        
        {/* 主评论详情 */}
        <div className="comment-detail">
          <h2>留言详情</h2>
          <p>
            <strong>{comment.name} </strong>
            <small>({new Date(comment.created_at).toLocaleString()})</small>
          </p>
          <p>{comment.text}</p>
          {comment.img_url && (
            <img src={comment.img_url} alt="评论图片" className="comment-image" />
          )}
        </div>

        {/* 回复列表 */}
        <div className="replies-list" style={{ marginTop: '20px' }}>
          <h3>回复列表</h3>
          {replies && replies.length > 0 ? (
            replies.map(reply => (
              <div key={reply.id} className="reply-item">
                <p>
                  <strong>{reply.name} </strong>
                  <small>({new Date(reply.created_at).toLocaleString()})</small>
                </p>
                <p>{reply.text}</p>
                {reply.img_url && (
                  <img src={reply.img_url} alt="回复图片" className="reply-image" />
                )}
              </div>
            ))
          ) : (
            <p>暂无回复</p>
          )}
        </div>

        {/* 回复表单 */}
        <ReplyForm commentId={comment.id} />
      </div>
    </div>
  );
};

export default CommentDetailModal;