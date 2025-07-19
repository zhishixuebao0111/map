from flask import Blueprint, request, jsonify
import logging
from flask_jwt_extended import jwt_required, get_jwt_identity
import db

log = logging.getLogger(__name__)
ai_bp = Blueprint('ai_bp', __name__)

@ai_bp.route('/recommend', methods=['POST'])
@jwt_required()
def recommend():
    """AI景点推荐接口"""
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "msg": "Request body must be JSON."}), 400
    
    # 获取用户输入参数
    location = data.get('location', '').strip()
    interests = data.get('interests', '').strip()
    budget = data.get('budget', '')
    duration = data.get('duration', '')

    # 验证必填字段
    if not location:
        return jsonify({"success": False, "msg": "Location is required."}), 400

    try:
        # 这里可以集成真实AI服务，目前先返回模拟数据
        user_id = get_jwt_identity()
        log.info(f"User {user_id} requested AI recommendations for {location}")

        # 模拟AI推荐结果
        recommendations = [
            {
                "name": f"{location}著名景点1",
                "description": "这是根据您的兴趣推荐的热门景点",
                "type": "历史" if "历史" in interests else "自然",
                "cost": 100 if budget == "100" else 300,
                "reason": "符合您的预算和兴趣偏好"
            },
            {
                "name": f"{location}特色美食",
                "description": "当地必尝的特色美食",
                "type": "美食",
                "cost": 50,
                "reason": "符合您的美食兴趣"
            }
        ]

        return jsonify({
            "success": True,
            "recommendations": recommendations
        })

    except Exception as e:
        log.error(f"AI recommendation error: {str(e)}")
        return jsonify({"success": False, "msg": "AI recommendation failed"}), 500
