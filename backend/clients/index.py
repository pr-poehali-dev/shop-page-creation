import json
import os
import base64
import hashlib
import hmac
import uuid
import psycopg2
import psycopg2.extras
import boto3


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


CLIENT_FIELDS = [
    'full_name', 'phone', 'email', 'birth_date', 'diabetes', 'varicose',
    'fungus', 'ingrown_nail', 'circulation', 'oncology', 'skin_type',
    'allergies', 'contraindications', 'notes', 'next_visit_date',
]


def serialize(row: dict) -> dict:
    d = dict(row)
    for k, v in d.items():
        if hasattr(v, 'isoformat'):
            d[k] = v.isoformat()
    return d


def handler(event: dict, context) -> dict:
    '''API карт клиентов мастера педикюра: список, создание, просмотр, анамнез, визиты, фото'''
    method = event.get('httpMethod', 'GET')
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        'Access-Control-Max-Age': '86400',
    }
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''
    auth = verify_token(token)
    if not auth:
        return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Требуется авторизация'})}

    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'clients')
    body = json.loads(event.get('body') or '{}')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # === КЛИЕНТЫ ===
        if resource == 'clients':
            if method == 'GET':
                client_id = params.get('id')
                if client_id:
                    row = _get_client_for_user(cur, int(client_id), auth)
                    if not row:
                        return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Клиент не найден'})}
                    return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(row))}
                # список — только мастер
                if auth['role'] != 'master':
                    cur.execute("SELECT * FROM clients WHERE client_user_id = %s", (auth['user_id'],))
                else:
                    cur.execute(
                        "SELECT c.*, (SELECT MAX(visit_date) FROM visits v WHERE v.client_id = c.id) AS last_visit "
                        "FROM clients c WHERE master_id = %s ORDER BY full_name",
                        (auth['user_id'],),
                    )
                rows = [serialize(r) for r in cur.fetchall()]
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(rows)}

            if method == 'POST':
                if auth['role'] != 'master':
                    return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет прав'})}
                cur.execute(
                    "INSERT INTO clients (master_id, full_name, phone, email) VALUES (%s, %s, %s, %s) RETURNING *",
                    (auth['user_id'], body.get('full_name', 'Без имени'), body.get('phone'), body.get('email')),
                )
                row = cur.fetchone()
                conn.commit()
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(row))}

            if method == 'PUT':
                if auth['role'] != 'master':
                    return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет прав'})}
                client_id = int(body.get('id'))
                existing = _get_client_for_user(cur, client_id, auth)
                if not existing:
                    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Клиент не найден'})}
                sets = []
                vals = []
                for f in CLIENT_FIELDS:
                    if f in body:
                        sets.append(f"{f} = %s")
                        vals.append(body[f] if body[f] != '' else None)
                if sets:
                    vals.extend([client_id, auth['user_id']])
                    cur.execute(f"UPDATE clients SET {', '.join(sets)} WHERE id = %s AND master_id = %s RETURNING *", vals)
                    row = cur.fetchone()
                    conn.commit()
                    return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(row))}
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(existing))}

        # === ВИЗИТЫ ===
        if resource == 'visits':
            client_id = int(params.get('client_id') or body.get('client_id'))
            if not _get_client_for_user(cur, client_id, auth):
                return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет доступа'})}
            if method == 'GET':
                cur.execute("SELECT * FROM visits WHERE client_id = %s ORDER BY visit_date DESC", (client_id,))
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps([serialize(r) for r in cur.fetchall()])}
            if method == 'POST':
                if auth['role'] != 'master':
                    return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет прав'})}
                cur.execute(
                    "INSERT INTO visits (client_id, visit_date, procedure, notes) VALUES (%s, %s, %s, %s) RETURNING *",
                    (client_id, body.get('visit_date'), body.get('procedure'), body.get('notes')),
                )
                row = cur.fetchone()
                conn.commit()
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(row))}

        # === ФОТО ===
        if resource == 'photos':
            client_id = int(params.get('client_id') or body.get('client_id'))
            if not _get_client_for_user(cur, client_id, auth):
                return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет доступа'})}
            if method == 'GET':
                cur.execute("SELECT * FROM photos WHERE client_id = %s ORDER BY created_at DESC", (client_id,))
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps([serialize(r) for r in cur.fetchall()])}
            if method == 'POST':
                if auth['role'] != 'master':
                    return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет прав'})}
                file_b64 = body.get('file_base64', '')
                if ',' in file_b64:
                    file_b64 = file_b64.split(',', 1)[1]
                data = base64.b64decode(file_b64)
                key = f"clients/{client_id}/{uuid.uuid4().hex}.jpg"
                s3 = boto3.client(
                    's3', endpoint_url='https://bucket.poehali.dev',
                    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
                )
                s3.put_object(Bucket='files', Key=key, Body=data, ContentType='image/jpeg')
                url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
                cur.execute(
                    "INSERT INTO photos (client_id, url, caption) VALUES (%s, %s, %s) RETURNING *",
                    (client_id, url, body.get('caption')),
                )
                row = cur.fetchone()
                conn.commit()
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(row))}

        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Неверный запрос'})}
    finally:
        cur.close()
        conn.close()


def _get_client_for_user(cur, client_id: int, auth: dict):
    if auth['role'] == 'master':
        cur.execute("SELECT * FROM clients WHERE id = %s AND master_id = %s", (client_id, auth['user_id']))
    else:
        cur.execute("SELECT * FROM clients WHERE id = %s AND client_user_id = %s", (client_id, auth['user_id']))
    return cur.fetchone()
