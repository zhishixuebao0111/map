from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token
import db
import logging

log = logging.getLogger(__name__)
auth_bp = Blueprint('auth_bp', __name__)

MIN_PASSWORD_LENGTH = 6

@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册接口"""
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "msg": "Request body must be JSON."}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({"success": False, "msg": "Username and password are required."}), 400
    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify({"success": False, "msg": f"Password must be at least {MIN_PASSWORD_LENGTH} characters."}), 400
    if db.get_user_by_username(username):
        return jsonify({"success": False, "msg": "Username already exists."}), 409

    password_hash = generate_password_hash(password)
    user_id = db.add_user(username, password_hash)
    
    if not user_id:
        log.error(f"Database failed to create user '{username}'.")
        return jsonify({"success": False, "msg": "Registration failed due to a server error."}), 500

    # 正确创建 Token
    additional_claims = {"username": username}
    access_token = create_access_token(identity=user_id, additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=user_id, additional_claims=additional_claims)
    
    log.info(f"User '{username}' (ID: {user_id}) registered and token issued.")

    return jsonify({
        "success": True,
        "msg": "Registration successful.",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {"id": user_id, "username": username}
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录接口"""
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "msg": "Request body must be JSON."}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    user = db.get_user_by_username(username)
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({"success": False, "msg": "Invalid username or password."}), 401

    user_id = user["id"]
    
    # 正确创建 Token
    additional_claims = {"username": username}
    access_token = create_access_token(identity=user_id, additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=user_id, additional_claims=additional_claims)
    
    log.info(f"User '{username}' (ID: {user_id}) logged in and token issued.")

    return jsonify({
        "success": True,
        "msg": "Login successful.",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {"id": user_id, "username": username}
    })