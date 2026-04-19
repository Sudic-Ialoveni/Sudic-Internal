#!/usr/bin/env python3
"""
Moizvonki API TUI Debugger
==========================
Directly tests the Moizvonki REST API (single POST endpoint).

Usage:
    python scripts/moizvonki_tui.py

Credentials are loaded automatically from backend/.env
(MOIZVONKI_API_KEY, MOIZVONKI_USER, MOIZVONKI_BASE_URL).

Dependencies:
    pip install textual python-dotenv
    - or -
    pip install -r scripts/requirements_moizvonki_tui.txt
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Config loading (no external deps required)
# ---------------------------------------------------------------------------

DEFAULT_BASE_URL = "https://app.moizvonki.ru/api/v1"


def _find_env_file() -> Path | None:
    """Search for backend/.env relative to this script."""
    here = Path(__file__).resolve().parent
    candidates = [
        here.parent / "backend" / ".env",
        here / ".env",
        here.parent / ".env",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def _parse_env_file(path: Path) -> dict[str, str]:
    """Minimal .env parser — no python-dotenv required."""
    env: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
                value = value[1:-1]
            env[key] = value
    return env


def load_config() -> dict[str, str]:
    """Load Moizvonki credentials; OS env takes priority over .env file."""
    cfg: dict[str, str] = {}
    env_file = _find_env_file()
    if env_file:
        cfg.update(_parse_env_file(env_file))
    for key in ("MOIZVONKI_API_KEY", "MOIZVONKI_USER", "MOIZVONKI_BASE_URL"):
        val = os.environ.get(key)
        if val:
            cfg[key] = val
    return cfg


# ---------------------------------------------------------------------------
# API actions registry
# ---------------------------------------------------------------------------


@dataclass
class ParamDef:
    name: str
    type: str          # "str" | "int"
    required: bool = False
    description: str = ""
    example: str = ""


@dataclass
class ActionDef:
    action: str
    description: str
    params: list[ParamDef] = field(default_factory=list)


ACTIONS: list[ActionDef] = [
    ActionDef(
        action="calls.list",
        description="List calls — from_date OR from_id is required by the API",
        params=[
            ParamDef("from_date",    "int", required=True, description="[REQUIRED if no from_id] Start date — Unix timestamp (seconds)", example="1700000000"),
            ParamDef("to_date",      "int", description="End date — Unix timestamp (seconds)",   example="1700086400"),
            ParamDef("from_id",      "int", description="[REQUIRED if no from_date] Start from call ID (exclusive)"),
            ParamDef("from_offset",  "int", description="Pagination offset"),
            ParamDef("max_results",  "int", description="Max results", example="50"),
            ParamDef("supervised",   "int", description="0 = own calls, 1 = supervised calls"),
        ],
    ),
    ActionDef(
        action="calls.get_sms_templates",
        description="Get all SMS templates configured in the account",
        params=[],
    ),
    ActionDef(
        action="company.list_employee",
        description="List employees (users) in the account",
        params=[
            ParamDef("max_results",          "int", description="Max results"),
            ParamDef("from_offset",          "int", description="Pagination offset"),
            ParamDef("employee_user_name",   "str", description="Filter by exact username"),
            ParamDef("employee_id",          "int", description="Filter by employee ID"),
        ],
    ),
    ActionDef(
        action="company.list_group",
        description="List call groups in the account",
        params=[
            ParamDef("max_results",  "int", description="Max results"),
            ParamDef("from_offset",  "int", description="Pagination offset"),
        ],
    ),
    ActionDef(
        action="webhook.list",
        description="List active webhook subscriptions",
        params=[],
    ),
    ActionDef(
        action="[custom]",
        description="Enter any action string manually (for undocumented endpoints)",
        params=[],
    ),
]


# ---------------------------------------------------------------------------
# HTTP layer
# ---------------------------------------------------------------------------


@dataclass
class RequestResult:
    action: str
    params: dict[str, Any]
    url: str
    body_sent: dict[str, Any]       # has api_key masked
    status_code: int | None
    response_text: str | None
    response_json: Any
    elapsed_ms: float
    error: str | None
    timestamp: datetime = field(default_factory=datetime.now)

    @property
    def success(self) -> bool:
        return (
            self.error is None
            and self.status_code is not None
            and 200 <= self.status_code < 300
        )

    @property
    def status_label(self) -> str:
        if self.error:
            return "ERR"
        return str(self.status_code)

    @property
    def short_summary(self) -> str:
        if self.error:
            return self.error[:60]
        if self.response_json and isinstance(self.response_json, dict):
            if "result" in self.response_json:
                r = self.response_json["result"]
                if isinstance(r, list):
                    return f"{len(r)} items"
                return str(r)[:60]
        return "ok"


def _do_request(
    base_url: str,
    user: str,
    api_key: str,
    action: str,
    params: dict[str, Any],
) -> RequestResult:
    body = {
        "user_name": user,
        "api_key": api_key,
        "action": action,
        **params,
    }
    body_logged = {**body, "api_key": f"{api_key[:8]}…" if len(api_key) > 8 else "***"}
    body_bytes = json.dumps(body, ensure_ascii=False).encode("utf-8")

    t0 = time.perf_counter()
    try:
        req = urllib.request.Request(
            base_url,
            data=body_bytes,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "MoizvonkiTUI/1.0",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            text = resp.read().decode("utf-8")
            status = resp.status

    except urllib.error.HTTPError as e:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        try:
            text = e.read().decode("utf-8")
        except Exception:
            text = f"HTTP {e.code}: {e.reason}"
        status = e.code

    except Exception as exc:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return RequestResult(
            action=action,
            params=params,
            url=base_url,
            body_sent=body_logged,
            status_code=None,
            response_text=None,
            response_json=None,
            elapsed_ms=elapsed_ms,
            error=str(exc),
        )

    try:
        response_json = json.loads(text)
    except json.JSONDecodeError:
        response_json = None

    return RequestResult(
        action=action,
        params=params,
        url=base_url,
        body_sent=body_logged,
        status_code=status,
        response_text=text,
        response_json=response_json,
        elapsed_ms=elapsed_ms,
        error=None,
    )


# ---------------------------------------------------------------------------
# TUI
# ---------------------------------------------------------------------------

from textual import on, work                                    # noqa: E402
from textual.app import App, ComposeResult                      # noqa: E402
from textual.binding import Binding                             # noqa: E402
from textual.containers import Horizontal, ScrollableContainer, Vertical  # noqa: E402
from textual.widgets import (                                   # noqa: E402
    Button,
    DataTable,
    Footer,
    Header,
    Input,
    Label,
    ListItem,
    ListView,
    RichLog,
    Static,
    TabbedContent,
    TabPane,
)


# ── Param row ────────────────────────────────────────────────────────────────

class ParamRow(Horizontal):
    """One labeled Input for a single parameter."""

    DEFAULT_CSS = """
    ParamRow {
        height: 3;
        align: left middle;
    }
    ParamRow .plabel {
        width: 22;
        padding: 0 1;
        color: $text-muted;
    }
    ParamRow Input {
        width: 1fr;
    }
    """

    def __init__(self, param: ParamDef, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.param = param

    def compose(self) -> ComposeResult:
        hint = f"{self.param.description}"
        if self.param.example:
            hint += f"  e.g. {self.param.example}"
        if self.param.type == "int":
            hint += "  [int]"
        yield Label(f"{self.param.name}:", classes="plabel")
        yield Input(
            placeholder=hint,
            id=f"p_{self.param.name}",
        )

    def value(self) -> tuple[str, Any] | None:
        """Return (name, typed_value) or None if empty."""
        widget = self.query_one(Input)
        raw = widget.value.strip()
        if not raw:
            return None
        if self.param.type == "int":
            try:
                return (self.param.name, int(raw))
            except ValueError:
                return (self.param.name, raw)   # pass raw; API will reject
        return (self.param.name, raw)


# ── Config panel ─────────────────────────────────────────────────────────────

class ConfigPanel(ScrollableContainer):
    """Editable credential fields — scrollable so all fields are always reachable."""

    DEFAULT_CSS = """
    ConfigPanel {
        padding: 0 2;
        height: 1fr;
    }
    ConfigPanel Label.field-label {
        width: 20;
        padding: 0 1;
        color: $text-muted;
    }
    ConfigPanel .field-row {
        height: 3;
        align: left middle;
    }
    ConfigPanel .hint {
        color: $text-muted;
        height: 1;
        padding: 0 1;
    }
    ConfigPanel Button {
        margin: 1 0 0 0;
        width: 20;
    }
    """

    def __init__(self, config: dict[str, str], **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self._config = config

    def compose(self) -> ComposeResult:
        key = self._config.get("MOIZVONKI_API_KEY", "")
        user = self._config.get("MOIZVONKI_USER", "")
        base_url = self._config.get("MOIZVONKI_BASE_URL", DEFAULT_BASE_URL)
        env_file = _find_env_file()

        env_label = str(env_file) if env_file else "backend/.env not found"
        yield Static(f"[dim]Env: {env_label}  |  Changes apply this session only.[/dim]", classes="hint")

        with Horizontal(classes="field-row"):
            yield Label("API Key:", classes="field-label")
            yield Input(value=key, placeholder="your_api_key_here", id="cfg_key", password=True)

        with Horizontal(classes="field-row"):
            yield Label("User (login):", classes="field-label")
            yield Input(value=user, placeholder="username or email", id="cfg_user")

        with Horizontal(classes="field-row"):
            yield Label("Base URL:", classes="field-label")
            yield Input(
                value=base_url,
                placeholder="https://yoursubdomain.moizvonki.ru/api/v1",
                id="cfg_url",
            )

        yield Button("Apply", id="cfg-apply-btn", variant="success")

    def get_values(self) -> dict[str, str]:
        return {
            "MOIZVONKI_API_KEY":  self.query_one("#cfg_key",  Input).value.strip(),
            "MOIZVONKI_USER":     self.query_one("#cfg_user", Input).value.strip(),
            "MOIZVONKI_BASE_URL": self.query_one("#cfg_url",  Input).value.strip()
                                  or DEFAULT_BASE_URL,
        }


# ── Main App ─────────────────────────────────────────────────────────────────

class MoizvonkiDebugger(App[None]):
    """Moizvonki API TUI Debugger."""

    TITLE = "Moizvonki API Debugger"
    SUB_TITLE = "POST https://app.moizvonki.ru/api/v1"

    CSS = """
    /* ── layout ── */
    #top-bar {
        height: 1;
        background: $boost;
        padding: 0 1;
        color: $text-muted;
    }
    #workspace {
        height: 1fr;
    }
    #left-panel {
        width: 28;
        border: solid $primary-darken-2;
    }
    #left-panel .panel-title {
        background: $primary-darken-2;
        color: $background;
        padding: 0 1;
        width: 100%;
    }
    #center-panel {
        width: 1fr;
        border: solid $primary-darken-2;
        padding: 0 1 1 1;
    }
    #center-panel .panel-title {
        background: $primary-darken-2;
        color: $background;
        padding: 0 1;
        width: 100%;
        margin: 0 -1 1 -1;
    }
    #right-panel {
        width: 1fr;
        border: solid $primary-darken-2;
    }
    #right-panel .panel-title {
        background: $primary-darken-2;
        color: $background;
        padding: 0 1;
        width: 100%;
    }

    /* ── action list ── */
    #action-list {
        height: 1fr;
    }
    ListView > ListItem {
        padding: 0 1;
    }

    /* ── params ── */
    #action-desc {
        color: $text-muted;
        margin: 0 0 1 0;
        height: auto;
    }
    #custom-action-row {
        height: 3;
        align: left middle;
        margin-bottom: 1;
    }
    #custom-action-row Label {
        width: 22;
        padding: 0 1;
        color: $text-muted;
    }
    #params-scroll {
        height: 1fr;
    }
    #send-btn {
        margin: 1 0 0 0;
        width: 100%;
    }

    /* ── request preview ── */
    #req-log {
        height: 1fr;
        padding: 0 1;
    }

    /* ── bottom tabs ── */
    #bottom-tabs {
        height: 45%;
        border: solid $accent-darken-2;
    }
    #status-bar {
        height: 1;
        background: $boost;
        padding: 0 1;
    }
    #resp-log {
        height: 1fr;
    }
    #history-table {
        height: 1fr;
    }
    """

    BINDINGS = [
        Binding("ctrl+r", "send_request", "Send"),
        Binding("ctrl+l", "clear_response", "Clear"),
        Binding("ctrl+e", "export_response", "Export JSON"),
        Binding("ctrl+q", "quit", "Quit"),
        Binding("f1", "show_help", "Help"),
    ]

    def __init__(self) -> None:
        super().__init__()
        self.config: dict[str, str] = load_config()
        self._selected_idx: int = 0
        self._history: list[RequestResult] = []
        self._last_result: RequestResult | None = None

    # ── compose ──────────────────────────────────────────────────────────────

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        yield self._make_top_bar()

        with Horizontal(id="workspace"):
            # Left: action selector
            with Vertical(id="left-panel"):
                yield Label("  Actions", classes="panel-title")
                items = [
                    ListItem(Label(a.action), id=f"act_{i}")
                    for i, a in enumerate(ACTIONS)
                ]
                yield ListView(*items, id="action-list")

            # Center: params + send
            with Vertical(id="center-panel"):
                yield Label("Parameters", classes="panel-title")
                yield Label("", id="action-desc")
                with Horizontal(id="custom-action-row"):
                    yield Label("Custom action:", id="custom-action-label")
                    yield Input(placeholder="e.g.  calls.list", id="custom-action-input")
                yield ScrollableContainer(id="params-scroll")
                yield Button("⚡  Send Request  [Ctrl+R]", id="send-btn", variant="primary")

            # Right: live request preview
            with Vertical(id="right-panel"):
                yield Label("  Request Preview", classes="panel-title")
                yield RichLog(id="req-log", highlight=True, markup=True)

        # Bottom: tabs
        with TabbedContent(id="bottom-tabs"):
            with TabPane("Response", id="pane-response"):
                yield Static("", id="status-bar")
                yield RichLog(id="resp-log", highlight=True, markup=True)
            with TabPane("History", id="pane-history"):
                tbl = DataTable(id="history-table")
                tbl.add_columns("Time", "Action", "Status", "ms", "Size", "Summary")
                yield tbl
            with TabPane("Config / Credentials", id="pane-config"):
                yield ConfigPanel(self.config, id="cfg-panel")

        yield Footer()

    def _make_top_bar(self) -> Static:
        key = self.config.get("MOIZVONKI_API_KEY", "")
        user = self.config.get("MOIZVONKI_USER", "")
        base = self.config.get("MOIZVONKI_BASE_URL", DEFAULT_BASE_URL)
        ks = f"[green]✓ {key[:8]}…[/green]" if key else "[red]✗ KEY NOT SET[/red]"
        us = f"[cyan]{user}[/cyan]" if user else "[yellow]user not set[/yellow]"
        return Static(f" Key: {ks}  │  User: {us}  │  URL: [dim]{base}[/dim]", id="top-bar")

    # ── mount ─────────────────────────────────────────────────────────────────

    def on_mount(self) -> None:
        self._select_action(0)
        lv = self.query_one("#action-list", ListView)
        lv.focus()

        self._write_resp_placeholder()
        self._write_req_placeholder()
        self.action_show_help()

    def _write_resp_placeholder(self) -> None:
        log = self.query_one("#resp-log", RichLog)
        log.write("[dim]Response will appear here. Select an action and press [bold]Ctrl+R[/bold].[/dim]")

    def _write_req_placeholder(self) -> None:
        log = self.query_one("#req-log", RichLog)
        log.write("[dim]Request preview will appear here.[/dim]")

    # ── action selection ──────────────────────────────────────────────────────

    def _select_action(self, idx: int) -> None:
        self._selected_idx = idx
        action = ACTIONS[idx]

        desc = self.query_one("#action-desc", Label)
        desc.update(f"[dim]{action.description}[/dim]")

        is_custom = action.action == "[custom]"
        cust_row = self.query_one("#custom-action-row")
        cust_row.display = is_custom

        # Rebuild param rows
        container = self.query_one("#params-scroll", ScrollableContainer)
        container.remove_children()
        if not is_custom:
            for p in action.params:
                container.mount(ParamRow(p))

        self._refresh_preview()

    @on(ListView.Selected, "#action-list")
    def _on_action_selected(self, event: ListView.Selected) -> None:
        item_id = event.item.id or ""
        if item_id.startswith("act_"):
            self._select_action(int(item_id[4:]))

    # ── param helpers ─────────────────────────────────────────────────────────

    def _collect_params(self) -> dict[str, Any]:
        params: dict[str, Any] = {}
        for row in self.query(ParamRow):
            result = row.value()
            if result is not None:
                params[result[0]] = result[1]
        return params

    def _get_action_name(self) -> str:
        action = ACTIONS[self._selected_idx]
        if action.action == "[custom]":
            return self.query_one("#custom-action-input", Input).value.strip()
        return action.action

    # ── request preview ───────────────────────────────────────────────────────

    def _refresh_preview(self) -> None:
        action_name = self._get_action_name()
        base_url = self.config.get("MOIZVONKI_BASE_URL", DEFAULT_BASE_URL)
        user = self.config.get("MOIZVONKI_USER", "")
        api_key = self.config.get("MOIZVONKI_API_KEY", "")

        try:
            params = self._collect_params()
        except Exception:
            params = {}

        body_preview = {
            "user_name": user or "<not set>",
            "api_key": f"{api_key[:8]}…" if len(api_key) > 8 else ("***" if api_key else "<not set>"),
            "action": action_name or "<select action>",
            **params,
        }

        log = self.query_one("#req-log", RichLog)
        log.clear()
        log.write(f"[bold cyan]POST[/bold cyan]  {base_url}")
        log.write("")
        log.write("[bold]Headers[/bold]")
        log.write("  Content-Type: [green]application/json[/green]")
        log.write("  Accept:       [green]application/json[/green]")
        log.write("")
        log.write("[bold]Body[/bold]")
        formatted = json.dumps(body_preview, indent=2, ensure_ascii=False)
        for line in formatted.splitlines():
            log.write(f"  {line}")

    @on(Input.Changed)
    def _on_any_input_changed(self, _: Input.Changed) -> None:
        self._refresh_preview()

    # ── send request ──────────────────────────────────────────────────────────

    @on(Button.Pressed, "#send-btn")
    def _on_send_btn(self, _: Button.Pressed) -> None:
        self.action_send_request()

    def action_send_request(self) -> None:
        action_name = self._get_action_name()
        if not action_name:
            self._set_status("[red]Select an action or fill in the custom action field.[/red]")
            return

        api_key = self.config.get("MOIZVONKI_API_KEY", "")
        if not api_key:
            self._set_status(
                "[red]MOIZVONKI_API_KEY is not set. Go to the Config tab or set it in backend/.env[/red]"
            )
            return

        params = self._collect_params()
        base_url = self.config.get("MOIZVONKI_BASE_URL", DEFAULT_BASE_URL)
        user = self.config.get("MOIZVONKI_USER", "")

        self._set_status("[yellow]⏳  Sending request…[/yellow]")
        self._fire_request(base_url, user, api_key, action_name, params)

    @work(thread=True)
    def _fire_request(
        self,
        base_url: str,
        user: str,
        api_key: str,
        action: str,
        params: dict[str, Any],
    ) -> None:
        result = _do_request(base_url, user, api_key, action, params)
        self.call_from_thread(self._on_result, result)

    # ── result handling ───────────────────────────────────────────────────────

    def _on_result(self, result: RequestResult) -> None:
        self._last_result = result
        self._history.insert(0, result)

        # Status bar
        if result.error:
            self._set_status(f"[bold red]✗  Error[/bold red]  {result.error[:100]}")
        else:
            color = "green" if result.success else "red"
            size_kb = len(result.response_text or "") / 1024
            self._set_status(
                f"[bold {color}]{result.status_code}[/bold {color}]"
                f"  [dim]{result.elapsed_ms:.1f} ms[/dim]"
                f"  [dim]{size_kb:.1f} KB[/dim]"
            )

        # Response log
        log = self.query_one("#resp-log", RichLog)
        log.clear()
        ts = result.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        log.write(f"[dim]────────────────────  {ts}  ────────────────────[/dim]")
        log.write(f"[bold]Action:[/bold] [cyan]{result.action}[/cyan]")
        if result.params:
            log.write(f"[bold]Params:[/bold] {json.dumps(result.params, ensure_ascii=False)}")
        log.write(f"[bold]URL:[/bold]    {result.url}")
        log.write("")

        if result.error:
            log.write(f"[bold red]Network Error:[/bold red]")
            log.write(f"  {result.error}")
        else:
            color = "green" if result.success else "red"
            log.write(
                f"[bold]Status:[/bold]  [{color}]{result.status_code}[/{color}]"
                f"   [bold]Elapsed:[/bold] {result.elapsed_ms:.1f} ms"
                f"   [bold]Size:[/bold] {len(result.response_text or '')} bytes"
            )
            log.write("")
            log.write("[bold]Response Body:[/bold]")
            if result.response_json is not None:
                self._write_json(log, result.response_json)
            else:
                log.write(f"  [yellow](non-JSON)[/yellow]")
                log.write(result.response_text or "(empty)")

        # Add to history table
        tbl = self.query_one("#history-table", DataTable)
        ts_short = result.timestamp.strftime("%H:%M:%S")
        size_str = f"{len(result.response_text or '')}B"
        tbl.add_row(
            ts_short,
            result.action,
            result.status_label,
            f"{result.elapsed_ms:.0f}",
            size_str,
            result.short_summary,
            key=str(id(result)),
        )

    def _write_json(self, log: RichLog, data: Any, indent: int = 0) -> None:
        """Pretty-print JSON with basic color coding into RichLog."""
        formatted = json.dumps(data, indent=2, ensure_ascii=False)
        lines = formatted.splitlines()
        for line in lines:
            stripped = line.lstrip()
            pad = " " * (len(line) - len(stripped) + 2)  # extra 2 for indent
            # color keys vs values
            if ":" in stripped and stripped.startswith('"'):
                key_part, _, val_part = stripped.partition(":")
                log.write(f"{pad}[cyan]{key_part}[/cyan]:{val_part}")
            elif stripped.startswith('"'):
                log.write(f"{pad}[green]{stripped}[/green]")
            elif stripped.replace(",", "").replace(".", "").lstrip("-").isdigit():
                log.write(f"{pad}[yellow]{stripped}[/yellow]")
            elif stripped in ("true,", "false,", "null,", "true", "false", "null"):
                log.write(f"{pad}[magenta]{stripped}[/magenta]")
            else:
                log.write(f"{pad}{stripped}")

    def _set_status(self, markup: str) -> None:
        self.query_one("#status-bar", Static).update(markup)

    # ── config apply ──────────────────────────────────────────────────────────

    @on(Button.Pressed, "#cfg-apply-btn")
    def _on_cfg_apply(self, _: Button.Pressed) -> None:
        panel = self.query_one("#cfg-panel", ConfigPanel)
        new_vals = panel.get_values()
        self.config.update(new_vals)
        # Refresh top bar
        bar = self.query_one("#top-bar", Static)
        key = self.config.get("MOIZVONKI_API_KEY", "")
        user = self.config.get("MOIZVONKI_USER", "")
        base = self.config.get("MOIZVONKI_BASE_URL", DEFAULT_BASE_URL)
        ks = f"[green]✓ {key[:8]}…[/green]" if key else "[red]✗ KEY NOT SET[/red]"
        us = f"[cyan]{user}[/cyan]" if user else "[yellow]user not set[/yellow]"
        bar.update(f" Key: {ks}  │  User: {us}  │  URL: [dim]{base}[/dim]")
        self._refresh_preview()
        self._set_status("[green]✓  Config applied for this session.[/green]")

    # ── actions ───────────────────────────────────────────────────────────────

    def action_clear_response(self) -> None:
        log = self.query_one("#resp-log", RichLog)
        log.clear()
        self._set_status("")
        self._write_resp_placeholder()

    def action_export_response(self) -> None:
        if not self._last_result:
            self._set_status("[yellow]No response to export yet.[/yellow]")
            return
        r = self._last_result
        ts = r.timestamp.strftime("%Y%m%d_%H%M%S")
        fname = f"moizvonki_{r.action.replace('.', '_')}_{ts}.json"
        export = {
            "timestamp":    r.timestamp.isoformat(),
            "action":       r.action,
            "params":       r.params,
            "url":          r.url,
            "request_body": r.body_sent,
            "status_code":  r.status_code,
            "elapsed_ms":   round(r.elapsed_ms, 2),
            "response":     r.response_json if r.response_json is not None else r.response_text,
            "error":        r.error,
        }
        Path(fname).write_text(json.dumps(export, indent=2, ensure_ascii=False), encoding="utf-8")
        self._set_status(f"[green]✓  Exported to [bold]{fname}[/bold][/green]")

    def action_show_help(self) -> None:
        log = self.query_one("#resp-log", RichLog)
        log.clear()

        key = self.config.get("MOIZVONKI_API_KEY", "")
        user = self.config.get("MOIZVONKI_USER", "")
        base = self.config.get("MOIZVONKI_BASE_URL", DEFAULT_BASE_URL)
        env_file = _find_env_file()

        log.write("[bold]Moizvonki API TUI Debugger[/bold]  —  Help")
        log.write("")
        log.write("[bold]Keyboard Shortcuts[/bold]")
        log.write("  [cyan]Ctrl+R[/cyan]   Send the current request")
        log.write("  [cyan]Ctrl+L[/cyan]   Clear response panel")
        log.write("  [cyan]Ctrl+E[/cyan]   Export last response to a JSON file")
        log.write("  [cyan]Ctrl+Q[/cyan]   Quit")
        log.write("  [cyan]F1[/cyan]       Show this help")
        log.write("")
        log.write("[bold]Current Config[/bold]")
        log.write(f"  API Key  : {'[green]SET  ' + key[:8] + '…[/green]' if key else '[red]NOT SET[/red]'}")
        log.write(f"  User     : {('[cyan]' + user + '[/cyan]') if user else '[yellow]not set[/yellow]'}")
        log.write(f"  Base URL : {base}")
        log.write(f"  Env file : {str(env_file) if env_file else '[yellow]not found — set credentials in Config tab[/yellow]'}")
        log.write("")
        log.write("[bold]API Protocol[/bold]")
        log.write(f"  Single [cyan]POST[/cyan] to  {base}")
        log.write("  Body: [green]{ user_name, api_key, action, ...params }[/green]")
        log.write("")
        log.write("[bold]Available Actions[/bold]")
        for a in ACTIONS:
            if a.action == "[custom]":
                log.write(f"  [cyan][custom][/cyan]  — any undocumented action string")
                continue
            pnames = ", ".join(p.name for p in a.params) if a.params else "(no params)"
            log.write(f"  [cyan]{a.action}[/cyan]")
            log.write(f"    {a.description}")
            log.write(f"    params: [dim]{pnames}[/dim]")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    MoizvonkiDebugger().run()
