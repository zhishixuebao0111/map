import os
from datetime import timedelta

# 项目根目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- 数据库配置 ---
DB_PATH = os.path.join(BASE_DIR, "database", "database.db")
DB_DIR = os.path.dirname(DB_PATH)

# --- 文件上传配置 ---
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "img")
# 高德地图 API Key
AMAP_WEB_KEY = "be38f49d3fd17ed74d3940f14081bf75"
# --- JWT 配置 ---
# ！！重要！！在生产环境中请务必替换为一个随机且复杂的密钥
JWT_SECRET_KEY = "a-brand-new-secret-key-that-is-definitely-correct"

# Token 有效期
# 这个自定义变量将被 auth.py 读取，单位：小时
TOKEN_EXPIRE_HOURS = 100 
# flask-jwt-extended 使用的官方配置项
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=TOKEN_EXPIRE_HOURS)
# Refresh Token 的过期时间，通常设置得更长
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)