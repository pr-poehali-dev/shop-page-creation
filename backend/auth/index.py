import json
import os
import hashlib
import hmac
import secrets
import psycopg2


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((salt + password).encode()).hexdigest()


def make_token(user_id: int, role: str) -> str:
    payload = f"{user_id}:{role}:{secrets.token_hex(8)}"
    sig = hmac.new(os.environ.get('JWT_SECRET', 'podocard').encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def verify_token(token: str):
    try:
        parts = token.split(':')
        if len(parts) != 4:
            return None
        user_id, role, nonce, sig = parts
        payload = f"{user_id}:{role}:{nonce}"
        expected = hmac.new(os.environ.get('JWT_SECRET', 'podocard').encode(), payload.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expected):
            return {'user_id': int(user_id), 'role': role}
    except Exception:
        return None
    return None


def handler(event: dict, context) -> dict:
    '''Авторизация и регистрация: вход мастера и клиента, выдача токена с ролью'''
    method = event.get('httpMethod', 'GET')
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        'Access-Control-Max-Age': '86400',
    }
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        if action == 'register':
            email = (body.get('email') or '').strip().lower()
            password = body.get('password') or ''
            full_name = body.get('full_name') or ''
            role = body.get('role') if body.get('role') in ('master', 'client') else 'master'
            if not email or not password:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Email и пароль обязательны'})}
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                return {'statusCode': 409, 'headers': cors, 'body': json.dumps({'error': 'Пользователь уже существует'})}
            salt = secrets.token_hex(8)
            ph = salt + ':' + hash_password(password, salt)
            cur.execute(
                "INSERT INTO users (email, password_hash, role, full_name) VALUES (%s, %s, %s, %s) RETURNING id",
                (email, ph, role, full_name),
            )
            user_id = cur.fetchone()[0]
            conn.commit()
            token = make_token(user_id, role)
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'token': token, 'role': role, 'user_id': user_id, 'full_name': full_name})}

        if action == 'login':
            email = (body.get('email') or '').strip().lower()
            password = body.get('password') or ''
            cur.execute("SELECT id, password_hash, role, full_name FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Неверный email или пароль'})}
            user_id, ph, role, full_name = row
            salt, stored = ph.split(':', 1)
            if not hmac.compare_digest(stored, hash_password(password, salt)):
                return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Неверный email или пароль'})}
            token = make_token(user_id, role)
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'token': token, 'role': role, 'user_id': user_id, 'full_name': full_name})}

        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Неизвестное действие'})}
    finally:
        cur.close()
        conn.close()
