import sqlite3
import json
import time
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'muno_data.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Table: users
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_key TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            wins INTEGER DEFAULT 0,
            games_played INTEGER DEFAULT 0,
            achievements TEXT DEFAULT '[]',
            created_at INTEGER,
            last_seen_at INTEGER
        )
    ''')

    # Table: matches
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_code TEXT,
            winner_key TEXT,
            winner_name TEXT,
            players_count INTEGER,
            ended_at INTEGER
        )
    ''')

    conn.commit()
    conn.close()

def get_or_create_user(user_key, username):
    if not user_key:
        return None
    conn = get_db()
    cursor = conn.cursor()
    now = int(time.time() * 1000)

    cursor.execute('SELECT * FROM users WHERE user_key = ?', (user_key,))
    row = cursor.fetchone()

    if row:
        if username and username != row['username']:
            cursor.execute('UPDATE users SET username = ?, last_seen_at = ? WHERE user_key = ?', (username, now, user_key))
        else:
            cursor.execute('UPDATE users SET last_seen_at = ? WHERE user_key = ?', (now, user_key))
    else:
        cursor.execute('''
            INSERT INTO users (user_key, username, wins, games_played, achievements, created_at, last_seen_at)
            VALUES (?, ?, 0, 0, '[]', ?, ?)
        ''', (user_key, username or 'Jugador MUNO', now, now))

    conn.commit()

    cursor.execute('SELECT * FROM users WHERE user_key = ?', (user_key,))
    user = dict(cursor.fetchone())
    user['achievements'] = json.loads(user['achievements'] or '[]')
    conn.close()
    return user

def record_game_win(room_code, winner_key, winner_name, player_keys_names):
    conn = get_db()
    cursor = conn.cursor()
    now = int(time.time() * 1000)

    # Insert match
    cursor.execute('''
        INSERT INTO matches (room_code, winner_key, winner_name, players_count, ended_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (room_code, winner_key, winner_name, len(player_keys_names), now))

    # Update stats for all players
    for key, name in player_keys_names:
        if not key:
            continue
        cursor.execute('SELECT * FROM users WHERE user_key = ?', (key,))
        u = cursor.fetchone()
        if not u:
            get_or_create_user(key, name)
            cursor.execute('SELECT * FROM users WHERE user_key = ?', (key,))
            u = cursor.fetchone()

        gp = u['games_played'] + 1
        is_win = (key == winner_key)
        w = u['wins'] + (1 if is_win else 0)

        achievements = json.loads(u['achievements'] or '[]')
        if is_win and 'first_win' not in achievements:
            achievements.append('first_win')
        if gp >= 5 and 'veteran_5' not in achievements:
            achievements.append('veteran_5')
        if w >= 10 and 'master_10' not in achievements:
            achievements.append('master_10')
        if is_win and len(player_keys_names) == 2 and 'duelist_1v1' not in achievements:
            achievements.append('duelist_1v1')

        cursor.execute('''
            UPDATE users SET wins = ?, games_played = ?, achievements = ?, last_seen_at = ?
            WHERE user_key = ?
        ''', (w, gp, json.dumps(achievements), now, key))

    conn.commit()
    conn.close()

def get_leaderboard(limit=50):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT username, wins, games_played, achievements, last_seen_at
        FROM users
        WHERE games_played > 0
        ORDER BY wins DESC, (CAST(wins AS FLOAT) / games_played) DESC
        LIMIT ?
    ''', (limit,))
    
    rows = cursor.fetchall()
    result = []
    
    achievements_def = {
        'first_win': {'id': 'first_win', 'name': 'Primera Victoria', 'icon': '🏆', 'desc': 'Gana tu primera partida de MUNO!'},
        'veteran_5': {'id': 'veteran_5', 'name': 'Veterano (5 Partidas)', 'icon': '⚔️', 'desc': 'Completa 5 partidas de MUNO!'},
        'master_10': {'id': 'master_10', 'name': 'Maestro MUNO (10 Victorias)', 'icon': '👑', 'desc': 'Acumula 10 victorias en el servidor.'},
        'duelist_1v1': {'id': 'duelist_1v1', 'name': 'Dominador 1v1', 'icon': '⚡', 'desc': 'Gana un duelo 1v1 mano a mano.'},
    }

    for idx, r in enumerate(rows, 1):
        ach_ids = json.loads(r['achievements'] or '[]')
        achs = [achievements_def[aid] for aid in ach_ids if aid in achievements_def]
        gp = r['games_played']
        w = r['wins']
        wr = round((w / gp) * 100) if gp > 0 else 0
        result.append({
            'rank': idx,
            'username': r['username'],
            'wins': w,
            'gamesPlayed': gp,
            'winRate': wr,
            'achievements': achs,
            'lastSeenAt': r['last_seen_at']
        })

    conn.close()
    return result

if __name__ == '__main__':
    init_db()
    print("MUNO Python SQLite Database Initialized Successfully!")
