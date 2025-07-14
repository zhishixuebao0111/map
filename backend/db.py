import sqlite3
import logging
from config import DB_PATH  # 直接从 config.py 导入配置好的数据库路径
log = logging.getLogger(__name__)
def get_db_connection():
    """获取并返回一个数据库连接对象"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # 让查询结果可以像字典一样通过列名访问
        return conn
    except Exception as e:
        log.error(f"Database connection failed at path: {DB_PATH}. Error: {e}", exc_info=True)
        return None
def initialize_db():
    """初始化数据库，创建所有需要的表"""
    conn = get_db_connection()
    if not conn:
        log.critical("Cannot initialize database, connection is None.")
        return
    try:
        with conn:
            cur = conn.cursor()
            # 1. Users Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now', 'localtime'))
            );
            """)
            # 2. Comments Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                text TEXT NOT NULL,
                img_url TEXT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                created_at TEXT DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
            """)
            # 3. Replies Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS replies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                comment_id INTEGER NOT NULL,
                user_id INTEGER,
                name TEXT NOT NULL,
                text TEXT NOT NULL,
                img_url TEXT,
                created_at TEXT DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
            """)
        log.info("Database tables initialized successfully or already exist.")
    except Exception as e:
        log.error(f"Database schema initialization failed: {e}", exc_info=True)
    finally:
        if conn:
            conn.close()
def add_user(username, password_hash):
    """在数据库中添加一个新用户"""
    conn = get_db_connection()
    if not conn: return None
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, password_hash))
            return cur.lastrowid
    except sqlite3.IntegrityError:
        log.warning(f"Attempt to register an already existing username: {username}")
        return None
    except Exception as e:
        log.error(f"Failed to add user '{username}': {e}", exc_info=True)
        return None
    finally:
        if conn: conn.close()
def get_user_by_username(username):
    """通过用户名从数据库中获取用户信息"""
    conn = get_db_connection()
    if not conn: return None
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (username,))
        return cur.fetchone()
    except Exception as e:
        log.error(f"Failed to get user by username '{username}': {e}", exc_info=True)
        return None
    finally:
        if conn: conn.close()
def add_comment(name, text, lat, lng, user_id=None, img_url=None):
    """在数据库中添加一条新评论"""
    conn = get_db_connection()
    if not conn: return None
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO comments (user_id, name, text, lat, lng, img_url) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, name, text, lat, lng, img_url)
            )
            comment_id = cur.lastrowid
            # 返回新创建的行，以便API可以立即响应
            return cur.execute("SELECT * FROM comments WHERE id = ?", (comment_id,)).fetchone()
    except Exception as e:
        log.error(f"Failed to add comment by '{name}': {e}", exc_info=True)
        return None
    finally:
        if conn: conn.close()
def get_comments_by_location(lat, lng, radius=0.001): # 1. 将 radius 减小以进行更精确的测试
    """
    获取指定经纬度附近的评论列表，并为每条评论附加其回复列表。
    """
    comments = []
    conn = get_db_connection()
    if not conn: return comments
    try:
        cur = conn.cursor()
        
        # 2. 第一步：获取该位置的所有主评论
        cur.execute("""
            SELECT id, user_id, name, text, img_url, lat, lng, created_at
            FROM comments
            WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
            ORDER BY created_at ASC;
        """, (lat - radius, lat + radius, lng - radius, lng + radius))
        
        main_comments_rows = cur.fetchall()

        # 3. 第二步：为每一条主评论查询其所有回复
        for row in main_comments_rows:
            comment_dict = dict(row)
            
            # 格式化图片 URL
            if comment_dict.get("img_url"):
                comment_dict["img_url"] = f"/static/img/{comment_dict['img_url']}"
            
            # 查询这条评论的所有回复
            cur.execute("""
                SELECT id, user_id, name, text, img_url, created_at
                FROM replies
                WHERE comment_id = ?
                ORDER BY created_at ASC;
            """, (comment_dict['id'],))
            
            replies_rows = cur.fetchall()
            
            # 将回复组装成列表
            comment_dict['replies'] = []
            for reply_row in replies_rows:
                reply_dict = dict(reply_row)
                if reply_dict.get("img_url"):
                    reply_dict["img_url"] = f"/static/img/{reply_dict['img_url']}"
                comment_dict['replies'].append(reply_dict)
            
            comments.append(comment_dict)
            
        return comments # 返回组装好的、带有嵌套回复的评论列表

    except Exception as e:
        log.error(f"Failed to get comments and replies by location ({lat}, {lng}): {e}", exc_info=True)
        return []
    finally:
        if conn: conn.close()
def get_one_comment_for_each_location():
    """获取每个独立地理位置的一条最新评论（用于地图打点）"""
    comments = []
    conn = get_db_connection()
    if not conn: return comments
    try:
        with conn:
            cur = conn.cursor()
            # 使用窗口函数获取每个位置最新的评论，性能更佳
            cur.execute("""
                SELECT id, name, text, img_url, lat, lng, created_at FROM (
                    SELECT *, ROW_NUMBER() OVER(PARTITION BY lat, lng ORDER BY created_at DESC) as rn
                    FROM comments
                ) WHERE rn = 1;
            """)
            rows = cur.fetchall()
            for row in rows:
                comment_dict = dict(row)
                if comment_dict.get("img_url"):
                    comment_dict["img_url"] = f"/static/img/{comment_dict['img_url']}"
                comments.append(comment_dict)
        return comments
    except Exception as e:
        log.error(f"Failed to get one comment for each location: {e}", exc_info=True)
        return []
    finally:
        if conn: conn.close()
def get_comment_with_details(comment_id):
    """获取单个评论的详细信息"""
    conn = get_db_connection()
    if not conn: return None
    try:
        cur = conn.cursor()
        cur.execute("SELECT id,user_id, name, text, img_url, lat, lng, created_at FROM comments WHERE id = ?", (comment_id,))
        row = cur.fetchone()
        if row:
            comment_data = dict(row)
            if comment_data.get("img_url"):
                comment_data["img_url"] = f"/static/img/{comment_data['img_url']}"
            return comment_data
        return None # 如果找不到评论，返回 None
    except Exception as e:
        log.error(f"Failed to get comment with details for id {comment_id}: {e}", exc_info=True)
        return None
    finally:
        if conn: conn.close()
def get_replies_with_details(comment_id):
    """获取某条评论的所有回复的详细信息"""
    replies = []
    conn = get_db_connection()
    if not conn: return replies
    try:
        cur = conn.cursor()
        cur.execute("SELECT id,user_id, comment_id, name, text, img_url, created_at FROM replies WHERE comment_id = ? ORDER BY created_at ASC", (comment_id,))
        rows = cur.fetchall()
        for row in rows:
            reply_data = dict(row)
            if reply_data.get("img_url"):
                reply_data["img_url"] = f"/static/img/{reply_data['img_url']}"
            replies.append(reply_data)
        return replies
    except Exception as e:
        log.error(f"Failed to get replies for comment id {comment_id}: {e}", exc_info=True)
        return []
    finally:
        if conn: conn.close()
def add_reply(comment_id, name, text, user_id=None, img_url=None):
    """在数据库中添加一条新回复"""
    conn = get_db_connection()
    if not conn: return None
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO replies (comment_id, user_id, name, text, img_url) VALUES (?, ?, ?, ?, ?)",
                (comment_id, user_id, name, text, img_url)
            )
            reply_id = cur.lastrowid
            return cur.execute("SELECT * FROM replies WHERE id = ?", (reply_id,)).fetchone()
    except Exception as e:
        log.error(f"Failed to add reply to comment id {comment_id}: {e}", exc_info=True)
        return None
    finally:
        if conn: conn.close()
def delete_comment(comment_id, user_id):
    """删除一条评论，前提是 user_id 匹配"""
    conn = get_db_connection()
    if not conn: return 0
    try:
        with conn:
            cur = conn.cursor()
            # 执行删除，并检查 user_id 是否匹配，防止越权
            cur.execute(
                "DELETE FROM comments WHERE id = ? AND user_id = ?",
                (comment_id, user_id)
            )
            # 返回受影响的行数。如果 > 0，说明删除成功。
            return cur.rowcount 
    except Exception as e:
        log.error(f"Failed to delete comment id {comment_id} for user id {user_id}: {e}", exc_info=True)
        return 0 # 返回 0 表示删除失败
    finally:
        if conn: conn.close()
def delete_reply(reply_id, user_id):
    """删除一条回复，前提是 user_id 匹配"""
    conn = get_db_connection()
    if not conn: return 0
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM replies WHERE id = ? AND user_id = ?",
                (reply_id, user_id)
            )
            return cur.rowcount
    except Exception as e:
        log.error(f"Failed to delete reply id {reply_id} for user id {user_id}: {e}", exc_info=True)
        return 0
    finally:
        if conn: conn.close()
