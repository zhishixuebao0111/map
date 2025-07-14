import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

// 1. 使用 forwardRef 包裹组件定义
const CommentForm = forwardRef(({ onSubmit, isLoading, replyingTo, onCancelReply }, ref) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const formRef = useRef(null);

  // 2. 定义一个重置函数
  const resetForm = () => {
    if (formRef.current) {
      formRef.current.reset();
    }
    setText('');
    setImage(null);
    setPreview(null);
  };

  // 3. 使用 useImperativeHandle 将 resetForm 方法暴露给父组件
  useImperativeHandle(ref, () => ({
    resetForm
  }));

  // 当回复对象变化时，也调用重置
  useEffect(() => {
    resetForm();
  }, [replyingTo]);
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    } else {
      setImage(null);
      setPreview(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit({ text, image });
  };

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      {replyingTo && (
         <div style={{ marginBottom: '10px', padding: '8px', background: '#f0f8ff', borderRadius: '4px' }}>
          <span>正在回复 <strong>{replyingTo.name}</strong></span>
          <button type="button" onClick={onCancelReply} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
            [取消]
          </button>
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={replyingTo ? '输入你的回复...' : '输入你的评论...'}
        rows={3}
        disabled={isLoading}
        required
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={handleImageChange}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '提交中...' : '发布'}
        </button>
      </div>
      {preview && (
        <img src={preview} alt="图片预览" style={{ maxWidth: '100px', marginTop: '10px', borderRadius: '4px' }} />
      )}
    </form>
  );
});

export default CommentForm;