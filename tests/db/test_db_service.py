"""
tests/db/test_db_service.py
─── pytest tests for db_service.py ──────────────────────────────────────────────
Covers: get_or_create_user, record_game_win, get_leaderboard
Uses a temporary in-memory database — never touches muno_data.db.
"""
import pytest
import sys
import os
import json
import time
import sqlite3

# Add parent dir to path so we can import db_service
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import db_service

# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def temp_db(tmp_path, monkeypatch):
    """Redirect db_service.DB_PATH to a fresh temp database for each test."""
    db_path = str(tmp_path / 'test_muno.db')
    monkeypatch.setattr(db_service, 'DB_PATH', db_path)
    db_service.init_db()
    return db_path

# ─── init_db ──────────────────────────────────────────────────────────────────

class TestInitDB:
    def test_creates_users_table(self, temp_db):
        conn = sqlite3.connect(temp_db)
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        assert cursor.fetchone() is not None
        conn.close()

    def test_creates_matches_table(self, temp_db):
        conn = sqlite3.connect(temp_db)
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='matches'")
        assert cursor.fetchone() is not None
        conn.close()

    def test_idempotent(self, temp_db):
        """Calling init_db twice should not raise or duplicate tables."""
        db_service.init_db()
        db_service.init_db()

# ─── get_or_create_user ───────────────────────────────────────────────────────

class TestGetOrCreateUser:
    def test_creates_new_user(self, temp_db):
        user = db_service.get_or_create_user('usr_abc123', 'TestPlayer')
        assert user['user_key'] == 'usr_abc123'
        assert user['username'] == 'TestPlayer'
        assert user['wins'] == 0
        assert user['games_played'] == 0
        assert user['achievements'] == []

    def test_returns_existing_user(self, temp_db):
        db_service.get_or_create_user('usr_abc123', 'TestPlayer')
        user = db_service.get_or_create_user('usr_abc123', 'TestPlayer')
        assert user['user_key'] == 'usr_abc123'

    def test_updates_username_if_changed(self, temp_db):
        db_service.get_or_create_user('usr_abc123', 'OldName')
        user = db_service.get_or_create_user('usr_abc123', 'NewName')
        assert user['username'] == 'NewName'

    def test_returns_none_for_empty_key(self, temp_db):
        assert db_service.get_or_create_user('', 'Player') is None
        assert db_service.get_or_create_user(None, 'Player') is None

    def test_default_username_fallback(self, temp_db):
        user = db_service.get_or_create_user('usr_xyz789', '')
        assert user['username'] == 'Jugador MUNO'

    def test_achievements_is_list(self, temp_db):
        user = db_service.get_or_create_user('usr_abc123', 'Player')
        assert isinstance(user['achievements'], list)

# ─── record_game_win ──────────────────────────────────────────────────────────

class TestRecordGameWin:
    def _setup_players(self, temp_db):
        db_service.get_or_create_user('usr_winner', 'Winner')
        db_service.get_or_create_user('usr_loser1', 'Loser1')
        db_service.get_or_create_user('usr_loser2', 'Loser2')

    def test_inserts_match_record(self, temp_db):
        self._setup_players(temp_db)
        db_service.record_game_win(
            'ROOM1', 'usr_winner', 'Winner',
            [['usr_winner', 'Winner'], ['usr_loser1', 'Loser1']]
        )
        conn = sqlite3.connect(temp_db)
        count = conn.execute("SELECT COUNT(*) FROM matches").fetchone()[0]
        conn.close()
        assert count == 1

    def test_match_has_correct_fields(self, temp_db):
        self._setup_players(temp_db)
        db_service.record_game_win(
            'ROOM42', 'usr_winner', 'Winner',
            [['usr_winner', 'Winner'], ['usr_loser1', 'Loser1']]
        )
        conn = sqlite3.connect(temp_db)
        match = conn.execute("SELECT * FROM matches WHERE room_code='ROOM42'").fetchone()
        conn.close()
        assert match[1] == 'ROOM42'       # room_code
        assert match[2] == 'usr_winner'   # winner_key
        assert match[3] == 'Winner'       # winner_name
        assert match[4] == 2              # players_count

    def test_increments_wins_for_winner(self, temp_db):
        self._setup_players(temp_db)
        db_service.record_game_win(
            'ROOM1', 'usr_winner', 'Winner',
            [['usr_winner', 'Winner'], ['usr_loser1', 'Loser1']]
        )
        user = db_service.get_or_create_user('usr_winner', 'Winner')
        assert user['wins'] == 1
        assert user['games_played'] == 1

    def test_does_not_increment_wins_for_losers(self, temp_db):
        self._setup_players(temp_db)
        db_service.record_game_win(
            'ROOM1', 'usr_winner', 'Winner',
            [['usr_winner', 'Winner'], ['usr_loser1', 'Loser1']]
        )
        user = db_service.get_or_create_user('usr_loser1', 'Loser1')
        assert user['wins'] == 0
        assert user['games_played'] == 1

    def test_first_win_achievement(self, temp_db):
        self._setup_players(temp_db)
        db_service.record_game_win(
            'ROOM1', 'usr_winner', 'Winner',
            [['usr_winner', 'Winner'], ['usr_loser1', 'Loser1']]
        )
        user = db_service.get_or_create_user('usr_winner', 'Winner')
        assert 'first_win' in user['achievements']

    def test_veteran_achievement_at_5_games(self, temp_db):
        db_service.get_or_create_user('usr_vet', 'Veteran')
        db_service.get_or_create_user('usr_opp', 'Opponent')
        for i in range(5):
            db_service.record_game_win(
                f'ROOM{i}', 'usr_opp', 'Opponent',
                [['usr_vet', 'Veteran'], ['usr_opp', 'Opponent']]
            )
        user = db_service.get_or_create_user('usr_vet', 'Veteran')
        assert 'veteran_5' in user['achievements']

    def test_master_achievement_at_10_wins(self, temp_db):
        db_service.get_or_create_user('usr_master', 'Master')
        db_service.get_or_create_user('usr_opp', 'Opponent')
        for i in range(10):
            db_service.record_game_win(
                f'ROOM{i}', 'usr_master', 'Master',
                [['usr_master', 'Master'], ['usr_opp', 'Opponent']]
            )
        user = db_service.get_or_create_user('usr_master', 'Master')
        assert 'master_10' in user['achievements']

    def test_duelist_achievement_on_1v1_win(self, temp_db):
        db_service.get_or_create_user('usr_duel', 'Duelist')
        db_service.get_or_create_user('usr_opp', 'Opponent')
        db_service.record_game_win(
            'ROOM1', 'usr_duel', 'Duelist',
            [['usr_duel', 'Duelist'], ['usr_opp', 'Opponent']]
        )
        user = db_service.get_or_create_user('usr_duel', 'Duelist')
        assert 'duelist_1v1' in user['achievements']

    def test_duelist_NOT_awarded_for_3plus_players(self, temp_db):
        for key in ['usr_a', 'usr_b', 'usr_c']:
            db_service.get_or_create_user(key, key)
        db_service.record_game_win(
            'ROOM1', 'usr_a', 'usr_a',
            [['usr_a', 'usr_a'], ['usr_b', 'usr_b'], ['usr_c', 'usr_c']]
        )
        user = db_service.get_or_create_user('usr_a', 'usr_a')
        assert 'duelist_1v1' not in user['achievements']

    def test_creates_users_on_the_fly(self, temp_db):
        """Players not yet in DB should be created during record_game_win."""
        db_service.record_game_win(
            'ROOM1', 'usr_new_winner', 'NewWinner',
            [['usr_new_winner', 'NewWinner'], ['usr_new_loser', 'NewLoser']]
        )
        conn = sqlite3.connect(temp_db)
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        conn.close()
        assert count == 2

    def test_skips_null_player_keys(self, temp_db):
        """Players without a userKey (guests) should not raise an error."""
        db_service.record_game_win(
            'ROOM1', 'usr_winner', 'Winner',
            [['usr_winner', 'Winner'], [None, 'GuestPlayer']]
        )
        conn = sqlite3.connect(temp_db)
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        conn.close()
        assert count == 1  # only the winner was inserted

# ─── get_leaderboard ──────────────────────────────────────────────────────────

class TestGetLeaderboard:
    def test_empty_leaderboard(self, temp_db):
        result = db_service.get_leaderboard()
        assert result == []

    def test_only_includes_players_with_games(self, temp_db):
        db_service.get_or_create_user('usr_no_games', 'NoGames')
        result = db_service.get_leaderboard()
        assert len(result) == 0

    def test_leaderboard_sorted_by_wins(self, temp_db):
        for key in ['usr_a', 'usr_b', 'usr_c']:
            db_service.get_or_create_user(key, key)

        # Give A 3 wins, B 1 win
        for i in range(3):
            db_service.record_game_win(f'RA{i}', 'usr_a', 'usr_a',
                [['usr_a', 'usr_a'], ['usr_b', 'usr_b']])
        db_service.record_game_win('RB0', 'usr_b', 'usr_b',
            [['usr_b', 'usr_b'], ['usr_c', 'usr_c']])

        result = db_service.get_leaderboard()
        assert result[0]['username'] == 'usr_a'  # highest wins first
        assert result[0]['wins'] == 3

    def test_leaderboard_entry_structure(self, temp_db):
        db_service.get_or_create_user('usr_a', 'PlayerA')
        db_service.record_game_win('R1', 'usr_a', 'PlayerA',
            [['usr_a', 'PlayerA'], ['usr_b', 'PlayerB']])
        result = db_service.get_leaderboard()
        entry = result[0]
        assert 'rank' in entry
        assert 'username' in entry
        assert 'wins' in entry
        assert 'gamesPlayed' in entry
        assert 'winRate' in entry
        assert 'achievements' in entry
        assert 'lastSeenAt' in entry

    def test_win_rate_calculation(self, temp_db):
        db_service.get_or_create_user('usr_a', 'A')
        db_service.get_or_create_user('usr_b', 'B')
        # 1 win out of 2 games = 50%
        db_service.record_game_win('R1', 'usr_a', 'A', [['usr_a', 'A'], ['usr_b', 'B']])
        db_service.record_game_win('R2', 'usr_b', 'B', [['usr_a', 'A'], ['usr_b', 'B']])
        result = db_service.get_leaderboard()
        a = next(r for r in result if r['username'] == 'A')
        assert a['winRate'] == 50

    def test_respects_limit(self, temp_db):
        for i in range(10):
            key = f'usr_{i:03d}'
            db_service.get_or_create_user(key, f'Player{i}')
            db_service.record_game_win(f'R{i}', key, f'Player{i}',
                [[key, f'Player{i}'], ['usr_opp', 'Opp']])
        result = db_service.get_leaderboard(limit=5)
        assert len(result) == 5
