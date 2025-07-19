import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import logging

# --- 0. 配置日志 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log = logging.getLogger(__name__)

# --- 1. 应用创建与配置 ---
log.info("Starting Flask application setup...")
app = Flask(__name__)
app.config.from_object('config')
log.info("Configuration loaded from config.py.")
log.info(f"JWT Secret Key Loaded: {'Yes' if app.config.get('JWT_SECRET_KEY') else 'No'}")


# --- 2. 初始化扩展 ---
jwt = JWTManager(app)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
        "allow_headers": ["Authorization", "Content-Type"]
    }
})
log.info("Extensions (JWT, CORS) initialized.")


# --- 3. 导入并注册蓝图 ---
# 延迟导入，确保 app 已配置
from routes.auth import auth_bp
from routes.comments import comments_bp
from routes.users import users_bp
from routes.ai import ai_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth') # 建议给 auth 路由加个前缀
app.register_blueprint(comments_bp, url_prefix='/api')
app.register_blueprint(users_bp, url_prefix='/api/users') # 建议给 user 路由加个前缀
app.register_blueprint(ai_bp, url_prefix='/api/ai')
log.info("Blueprints registered.")


# --- 4. 定义全局 JWT 错误处理器 ---
@jwt.invalid_token_loader
def handle_invalid_token(error_string):
    """
    当提供的 Token 无效时（格式错误、签名不对等），会调用这个函数。
    """
    # 关键日志：打印出具体的错误原因，和请求头
    log.error(f"Invalid Token Loader triggered. Reason: {error_string}")
    log.error(f"Headers from the failing request:\n{request.headers}")
    return jsonify({"success": False, "msg": "Token is invalid or malformed."}), 401

@jwt.expired_token_loader
def handle_expired_token(jwt_header, jwt_payload):
    """当 Token 过期时调用。"""
    log.warning(f"Expired token received. User: {jwt_payload.get('sub')}")
    return jsonify({"success": False, "msg": "Token has expired."}), 401

@jwt.unauthorized_loader
def handle_missing_token(error_string):
    """当请求缺少 Token 时调用。"""
    log.warning(f"Unauthorized access attempt. Reason: {error_string}")
    return jsonify({"success": False, "msg": "Authorization token is missing."}), 401


# --- 5. 定义根路由和初始化 ---
@app.route('/')
def index():
    return "New Backend Server is Running!"

def setup_database_and_folders():
    """在应用上下文中初始化数据库和文件夹"""
    with app.app_context():
        import db
        from config import UPLOAD_FOLDER, DB_DIR
        
        log.info("Ensuring necessary directories exist...")
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(DB_DIR, exist_ok=True)
        
        log.info("Initializing database schema...")
        db.initialize_db()
        log.info("Database setup complete.")

# --- 6. 应用启动入口 ---
if __name__ == "__main__":
    setup_database_and_folders()
    log.info("--- Starting Flask Development Server ---")
    app.run(host="0.0.0.0", port=5000, debug=True)
