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
        # === ПРОФИЛЬ МАСТЕРА ===
        if resource == 'profile':
            if method == 'GET':
                cur.execute("SELECT id, email, role, full_name, phone FROM users WHERE id = %s", (auth['user_id'],))
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(cur.fetchone()))}
            if method == 'PUT':
                cur.execute(
                    "UPDATE users SET full_name = %s, phone = %s WHERE id = %s RETURNING id, email, role, full_name, phone",
                    (body.get('full_name'), body.get('phone'), auth['user_id']),
                )
                row = cur.fetchone()
                conn.commit()
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(row))}

        # === КАБИНЕТ КЛИЕНТА ===
        if resource == 'me':
            cur.execute("SELECT * FROM clients WHERE client_user_id = %s ORDER BY id LIMIT 1", (auth['user_id'],))
            client = cur.fetchone()
            if not client:
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'linked': False})}
            cur.execute(
                "SELECT * FROM visits WHERE client_id = %s ORDER BY COALESCE(visit_at, visit_date::timestamp) DESC",
                (client['id'],),
            )
            visits = [serialize(v) for v in cur.fetchall()]
            cur.execute("SELECT * FROM photos WHERE client_id = %s ORDER BY created_at DESC", (client['id'],))
            photos = [serialize(p) for p in cur.fetchall()]
            cur.execute("SELECT full_name, phone FROM users WHERE id = %s", (client['master_id'],))
            master = serialize(cur.fetchone() or {})
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                'linked': True,
                'client': serialize(client),
                'visits': visits,
                'photos': photos,
                'master': master,
            })}

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
                email = (body.get('email') or '').strip().lower() or None
                client_user_id = _find_client_user(cur, email)
                cur.execute(
                    "INSERT INTO clients (master_id, full_name, phone, email, client_user_id) VALUES (%s, %s, %s, %s, %s) RETURNING *",
                    (auth['user_id'], body.get('full_name', 'Без имени'), body.get('phone'), email, client_user_id),
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
                if 'email' in body and body.get('email') and not existing.get('client_user_id'):
                    cu = _find_client_user(cur, (body.get('email') or '').strip().lower())
                    if cu:
                        sets.append("client_user_id = %s")
                        vals.append(cu)
                if sets:
                    vals.extend([client_id, auth['user_id']])
                    cur.execute(f"UPDATE clients SET {', '.join(sets)} WHERE id = %s AND master_id = %s RETURNING *", vals)
                    row = cur.fetchone()
                    conn.commit()
                    return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(row))}
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(existing))}

        # === ВИЗИТЫ ===
        if resource == 'visits':
            if method == 'GET' and params.get('id'):
                visit_id = int(params['id'])
                cur.execute("SELECT * FROM visits WHERE id = %s", (visit_id,))
                v = cur.fetchone()
                if not v or not _get_client_for_user(cur, v['client_id'], auth):
                    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Визит не найден'})}
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(v))}

            client_id = int(params.get('client_id') or body.get('client_id'))
            if not _get_client_for_user(cur, client_id, auth):
                return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет доступа'})}
            if method == 'GET':
                cur.execute("SELECT * FROM visits WHERE client_id = %s ORDER BY COALESCE(visit_at, visit_date::timestamp) DESC", (client_id,))
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps([serialize(r) for r in cur.fetchall()])}
            if method == 'POST':
                if auth['role'] != 'master':
                    return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет прав'})}
                visit_at = body.get('visit_at')
                visit_date = (visit_at or '')[:10] or body.get('visit_date')
                cur.execute(
                    "INSERT INTO visits (client_id, visit_date, visit_at, duration_minutes, procedure, materials, result, recommendations, next_visit_date, price, notes) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *",
                    (client_id, visit_date or None, visit_at or None, _num(body.get('duration_minutes')), body.get('procedure'),
                     body.get('materials'), body.get('result'), body.get('recommendations'),
                     body.get('next_visit_date') or None, _num(body.get('price')), body.get('notes')),
                )
                row = cur.fetchone()
                _refresh_client_dates(cur, client_id, body.get('next_visit_date'))
                conn.commit()
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(row))}
            if method == 'PUT':
                if auth['role'] != 'master':
                    return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет прав'})}
                visit_id = int(body.get('id'))
                visit_at = body.get('visit_at')
                visit_date = (visit_at or '')[:10] or body.get('visit_date')
                cur.execute(
                    "UPDATE visits SET visit_date=%s, visit_at=%s, duration_minutes=%s, procedure=%s, materials=%s, "
                    "result=%s, recommendations=%s, next_visit_date=%s, price=%s, notes=%s WHERE id=%s AND client_id=%s RETURNING *",
                    (visit_date or None, visit_at or None, _num(body.get('duration_minutes')), body.get('procedure'),
                     body.get('materials'), body.get('result'), body.get('recommendations'),
                     body.get('next_visit_date') or None, _num(body.get('price')), body.get('notes'), visit_id, client_id),
                )
                row = cur.fetchone()
                _refresh_client_dates(cur, client_id, body.get('next_visit_date'))
                conn.commit()
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(row))}

        # === ФОТО ===
        if resource == 'photos':
            client_id = int(params.get('client_id') or body.get('client_id'))
            if not _get_client_for_user(cur, client_id, auth):
                return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет доступа'})}
            if method == 'GET':
                visit_id = params.get('visit_id')
                if visit_id:
                    cur.execute(
                        "SELECT * FROM photos WHERE client_id = %s AND visit_id = %s ORDER BY photo_type, created_at",
                        (client_id, int(visit_id)),
                    )
                else:
                    cur.execute("SELECT * FROM photos WHERE client_id = %s ORDER BY created_at DESC", (client_id,))
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps([serialize(r) for r in cur.fetchall()])}
            if method == 'POST':
                if auth['role'] != 'master':
                    return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет прав'})}
                visit_id = body.get('visit_id')
                photo_type = body.get('photo_type') if body.get('photo_type') in ('before', 'after', 'process') else 'process'
                if visit_id:
                    cur.execute("SELECT COUNT(*) AS cnt FROM photos WHERE visit_id = %s", (int(visit_id),))
                    if cur.fetchone()['cnt'] >= 10:
                        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Можно загрузить не более 10 фото на визит'})}
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
                    "INSERT INTO photos (client_id, visit_id, photo_type, url, caption) VALUES (%s, %s, %s, %s, %s) RETURNING *",
                    (client_id, int(visit_id) if visit_id else None, photo_type, url, body.get('caption')),
                )
                row = cur.fetchone()
                conn.commit()
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps(serialize(row))}

        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Неверный запрос'})}
    finally:
        cur.close()
        conn.close()


def _num(v):
    if v is None or v == '':
        return None
    return v


def _find_client_user(cur, email):
    if not email:
        return None
    cur.execute("SELECT id FROM users WHERE email = %s AND role = 'client'", (email,))
    r = cur.fetchone()
    return r['id'] if r else None


def _refresh_client_dates(cur, client_id: int, next_visit_date):
    cur.execute(
        "UPDATE clients SET next_visit_date = COALESCE("
        "(SELECT MAX(next_visit_date) FROM visits WHERE client_id = %s), %s) "
        "WHERE id = %s",
        (client_id, next_visit_date or None, client_id),
    )


def _get_client_for_user(cur, client_id: int, auth: dict):
    if auth['role'] == 'master':
        cur.execute("SELECT * FROM clients WHERE id = %s AND master_id = %s", (client_id, auth['user_id']))
    else:
        cur.execute("SELECT * FROM clients WHERE id = %s AND client_user_id = %s", (client_id, auth['user_id']))
    return cur.fetchone()