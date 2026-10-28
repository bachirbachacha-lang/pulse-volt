import pytest
from pydantic import ValidationError

from trading.config.settings import DEFAULT_CONFIG_PATH, load_settings


def test_default_file_loads_in_paper_mode():
    s = load_settings(environ={})
    assert s.mode == "paper"
    assert s.account.starting_balance == 1000.0  # PAPER / SIMULATION default virtual balance
    assert s.market_data.source == "yfinance"
    assert s.strategy.active == ""  # no strategy selected at this stage


def test_env_overrides_are_typed():
    s = load_settings(environ={"TRADING__ACCOUNT__STARTING_BALANCE": "25000",
                               "TRADING__MARKET_DATA__SYMBOLS": '["NQ=F", "QQQ"]',
                               "TRADING__DISCORD__ENABLED": "true"})
    assert s.account.starting_balance == 25000.0
    assert s.market_data.symbols == ["NQ=F", "QQQ"]
    assert s.discord.enabled is True


def test_live_mode_is_rejected():
    with pytest.raises(ValidationError):
        load_settings(environ={"TRADING__MODE": '"live"'})
    with pytest.raises(ValidationError):
        load_settings(environ={}, overrides={"mode": "live"})


def test_unknown_keys_are_rejected():
    with pytest.raises(ValidationError):
        load_settings(environ={}, overrides={"account": {"starting_balanse": 1}})


def test_invalid_values_are_rejected():
    with pytest.raises(ValidationError):
        load_settings(environ={}, overrides={"account": {"starting_balance": -5}})
    with pytest.raises(ValidationError):
        load_settings(environ={}, overrides={"sessions": {"equity": {"days": [7]}}})


def test_paths_resolve_against_root(tmp_path):
    s = load_settings(environ={}, root=tmp_path)
    assert s.raw_dir == tmp_path / "data" / "raw"
    assert s.database_path.parent == tmp_path / "database"


def test_config_file_via_env(tmp_path):
    alt = tmp_path / "alt.toml"
    alt.write_text(DEFAULT_CONFIG_PATH.read_text().replace("starting_balance = 1000.0", "starting_balance = 777.0"))
    assert load_settings(environ={"TRADING_CONFIG": str(alt)}).account.starting_balance == 777.0


def test_discord_webhook_only_from_env(monkeypatch):
    s = load_settings(environ={})
    monkeypatch.delenv("DISCORD_WEBHOOK_URL", raising=False)
    assert s.discord.webhook_url is None
    monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://example.invalid/hook")
    assert s.discord.webhook_url == "https://example.invalid/hook"


def test_point_values():
    s = load_settings(environ={})
    assert s.point_value("ES=F") == 50.0
    assert s.point_value("SPY") == 1.0
