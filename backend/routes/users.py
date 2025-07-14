from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import logging

log = logging.getLogger(__name__)
users_bp = Blueprint('users_bp', __name__)

@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """获取当前登录用户的信息"""
    user_id = get_jwt_identity()
    claims = get_jwt()
    username = claims.get('username')

    log.info(f"Accessing /me route for user_id: {user_id}, username: {username}")

    if not user_id or not username:
        # 这个情况理论上不会发生，因为 @jwt_required 会先拦截
        log.error("Token is missing user_id or username claim, but passed @jwt_required check.")
        return jsonify({"success": False, "msg": "Invalid token claims."}), 401
    
    user_data = {"id": user_id, "username": username}
    
    return jsonify({"success": True, "user": user_data})