from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import os
import uuid
import db
import logging
from werkzeug.utils import secure_filename
comments_bp = Blueprint('comments_bp', __name__)

@comments_bp.route('/comments/all', methods=['GET'])
def get_all_comment_locations():
    """
    获取当前地图视野内的评论，用于在地图上打点。
    需要提供四个查询参数: sw_lat, sw_lng, ne_lat, ne_lng
    """
    try:
        # 从查询参数中获取边界坐标
        sw_lat = float(request.args.get('sw_lat'))
        sw_lng = float(request.args.get('sw_lng'))
        ne_lat = float(request.args.get('ne_lat'))
        ne_lng = float(request.args.get('ne_lng'))
    except (TypeError, ValueError, AttributeError):
        return jsonify({
            "success": False, 
            "error": "无效或缺失的边界坐标参数 (sw_lat, sw_lng, ne_lat, ne_lng)"
        }), 400

    # 调用新的数据库函数
    comments_in_view = db.get_comments_in_bounds(sw_lat, sw_lng, ne_lat, ne_lng)
    
    return jsonify({"success": True, "comments": comments_in_view})

@comments_bp.route('/comments', methods=['GET'])
def get_comments_by_location_route():
    """根据经纬度获取附近的评论"""
    try:
        lat = float(request.args.get('lat'))
        lng = float(request.args.get('lng'))
    except (TypeError, ValueError, AttributeError):
        return jsonify({"success": False, "error": "无效或缺失的经纬度参数"}), 400
    comments = db.get_comments_by_location(lat, lng)
    return jsonify({"success": True, "comments": comments})

@comments_bp.route('/comments', methods=['POST'])
@jwt_required(optional=True)
def create_comment():
    """创建一条新评论（允许匿名）"""
    try:
        # 1. 获取用户身份 (修正后)
        user_id = get_jwt_identity()  # 如果未登录，返回 None
        username = "游客" 

        if user_id:
            claims = get_jwt()  # 获取完整的 Token 载荷
            username = claims.get('username', '未知用户')

        # 2. 解析表单数据
        text = request.form.get('text', '').strip()
        lat_str = request.form.get('lat')
        lng_str = request.form.get('lng')

        if not all([text, lat_str, lng_str]):
            return jsonify({"success": False, "error": "缺少必要参数 (text, lat, lng)"}), 400
        try:
            lat = float(lat_str)
            lng = float(lng_str)
        except ValueError:
            return jsonify({"success": False, "error": "经纬度格式错误"}), 400

        # 3. 处理文件上传
        img_db_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '':
                filename = secure_filename(file.filename)
                ext = os.path.splitext(filename)[1]
                upload_folder = current_app.config['UPLOAD_FOLDER']
                # 确保目录存在
                os.makedirs(upload_folder, exist_ok=True)
                new_name = f"{uuid.uuid4().hex}{ext}"
                file_path = os.path.join(upload_folder, new_name)
                file.save(file_path)
                img_db_path = new_name

        # 4. 调用 db 函数，确保参数匹配
        new_comment_row = db.add_comment(
            name=username,
            text=text,
            lat=lat,
            lng=lng,
            user_id=user_id,
            img_url=img_db_path
        )
        
        if not new_comment_row:
            logging.error("db.add_comment 返回了 None，数据库写入可能失败。")
            return jsonify({"success": False, "error": "数据库写入失败"}), 500
        
        # 5. 构建成功的响应
        response_comment = {
            "id": new_comment_row['id'],
            "name": new_comment_row['name'],
            "text": new_comment_row['text'],
            "img_url": f"/static/img/{new_comment_row['img_url']}" if new_comment_row['img_url'] else None,
            "lat": new_comment_row['lat'],
            "lng": new_comment_row['lng'],
            "created_at": new_comment_row['created_at']
        }

        return jsonify({"success": True, "comment": response_comment}), 201

    except Exception as e:
        logging.error(f"创建评论时捕获到未处理的异常: {e}", exc_info=True)
        return jsonify({"success": False, "error": "服务器内部错误"}), 500

@comments_bp.route('/comments/<int:comment_id>', methods=['GET'])
def get_single_comment_with_replies(comment_id):
    """获取单个评论及其所有回复"""
    comment = db.get_comment_with_details(comment_id)
    if not comment:
        return jsonify({"success": False, "error": "该留言不存在"}), 404
    
    replies = db.get_replies_with_details(comment_id)
    return jsonify({"success": True, "comment": comment, "replies": replies})

@comments_bp.route('/replies', methods=['POST'])
@jwt_required()
def add_reply_route():
    """创建一条新回复，需要登录"""
    try:
        # 1. 获取用户身份 (修正后)
        user_id = get_jwt_identity()
        claims = get_jwt()
        username = claims.get('username')

        if not user_id or not username:
            return jsonify({"success": False, "error": "无效的用户身份或Token"}), 401

        # 2. 解析表单数据
        comment_id_str = request.form.get('comment_id')
        text = request.form.get('text', '').strip()

        if not comment_id_str or not text:
            return jsonify({"success": False, "error": "必要信息 (comment_id, text) 不能为空"}), 400
        
        try:
            comment_id = int(comment_id_str)
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "无效的评论ID"}), 400

        # 3. 处理可选的文件上传
        img_db_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '':
                filename = secure_filename(file.filename)
                ext = os.path.splitext(filename)[1]
                upload_folder = current_app.config['UPLOAD_FOLDER']
                os.makedirs(upload_folder, exist_ok=True)
                new_name = f"{uuid.uuid4().hex}{ext}"
                file_path = os.path.join(upload_folder, new_name)
                file.save(file_path)
                img_db_path = new_name

        # 4. 调用数据库函数
        new_reply_row = db.add_reply(
            comment_id=comment_id, 
            name=username, 
            text=text, 
            user_id=user_id, 
            img_url=img_db_path
        )

        if new_reply_row:
            response_reply = {
                "id": new_reply_row['id'],
                "comment_id": new_reply_row['comment_id'],
                "name": username,  # 直接使用从 Token 获取的用户名
                "text": new_reply_row['text'],
                "img_url": f"/static/img/{new_reply_row['img_url']}" if new_reply_row['img_url'] else None,
                "created_at": new_reply_row['created_at']
            }
            return jsonify({"success": True, "reply": response_reply}), 201
        else:
            # 检查评论是否存在
            if not db.get_comment_with_details(comment_id):
                 return jsonify({"success": False, "error": f"要回复的评论 (ID: {comment_id}) 不存在"}), 404
            return jsonify({"success": False, "error": "回复添加失败，请检查服务器日志"}), 500
            
    except Exception as e:
        logging.error(f"创建回复时出错: {e}", exc_info=True)
        return jsonify({"success": False, "error": "服务器内部错误"}), 500

@comments_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment_route(comment_id):
    """删除一条属于当前用户的评论"""
    current_user_id = get_jwt_identity()
    comment_to_delete = db.get_comment_with_details(comment_id)
    if not comment_to_delete:
        return jsonify({"success": False, "error": "评论不存在"}), 404
    deleted_rows = db.delete_comment(comment_id, current_user_id)

    if deleted_rows > 0:
        return jsonify({"success": True, "msg": f"评论 ID: {comment_id} 已成功删除。"}), 200
    else:
        return jsonify({"success": False, "error": "删除失败，你可能无权操作此评论。"}), 403 # 403 Forbidden

@comments_bp.route('/replies/<int:reply_id>', methods=['DELETE'])
@jwt_required()
def delete_reply_route(reply_id):
    """删除一条属于当前用户的回复"""
    current_user_id = get_jwt_identity()

    deleted_rows = db.delete_reply(reply_id, current_user_id)

    if deleted_rows > 0:
        return jsonify({"success": True, "msg": "回复已删除。"}), 200
    else:
        return jsonify({"success": False, "error": "删除失败或无权操作。"}), 403    