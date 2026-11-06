"""
Backend Tunneling Bridge (asyncssh / Telnet)
Spawns an asynchronous SSH client connection or terminal server connection targeting the device management IP and port.
Establishes a pseudo-terminal (pty) session.
Bidirectional stream piping:
  - Keystrokes from xterm.js via WebSocket -> asyncssh stdin
  - asyncssh stdout/stderr -> WebSocket back to browser
"""
import asyncio
import logging
import asyncssh
from typing import Optional
from fastapi import WebSocket

logger = logging.getLogger("netgateway.terminal_bridge")

class SSHClientSession(asyncssh.SSHClientSession):
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket

    def data_received(self, data: str, datatype: Optional[int] = None):
        """Forward SSH output back to browser xterm.js in real time."""
        try:
            asyncio.create_task(self.websocket.send_text(data))
        except Exception as e:
            logger.error(f"Error forwarding SSH data to WebSocket: {e}")

    def connection_lost(self, exc: Optional[Exception]):
        logger.info(f"SSH channel closed: {exc}")
        try:
            asyncio.create_task(self.websocket.close(code=1000, reason="SSH session closed"))
        except Exception:
            pass

class TerminalBridgeService:
    @staticmethod
    async def bridge_session(
        websocket: WebSocket,
        host: str,
        port: int,
        username: str,
        password: Optional[str] = None,
        client_keys: Optional[list] = None,
        term_type: str = "xterm-256color",
        term_size: tuple[int, int] = (120, 35),
    ):
        """
        Full non-blocking bidirectional bridge between FastAPI WebSocket and target network device.
        """
        cols, rows = term_size

        try:
            # 1. Connect asynchronously to device via asyncssh
            async with asyncssh.connect(
                host=host,
                port=port,
                username=username,
                password=password,
                client_keys=client_keys,
                known_hosts=None,  # Or strict known_hosts in enterprise env
                preferred_auth=["password", "publickey", "keyboard-interactive"]
            ) as conn:
                # 2. Open interactive session with PTY
                chan, session = await conn.create_session(
                    lambda: SSHClientSession(websocket),
                    term_type=term_type,
                    term_size=(cols, rows)
                )

                logger.info(f"Connected to {host}:{port} with PTY allocated ({cols}x{rows})")

                # 3. Read incoming keystrokes from WebSocket and pipe into SSH stdin
                while True:
                    data = await websocket.receive_text()
                    if not data:
                        break

                    # Check for client protocol messages (such as window resize events)
                    if data.startswith('{"type":"resize"'):
                        import json
                        try:
                            msg = json.loads(data)
                            chan.change_terminal_size(cols=msg.get("cols", 80), rows=msg.get("rows", 24))
                            continue
                        except Exception:
                            pass

                    # Pipe keystrokes to target device stdin
                    chan.write(data)

        except asyncssh.Error as ssh_err:
            logger.warning(f"SSH connection failed to {host}:{port}: {ssh_err}")
            await websocket.send_text(f"\r\n\x1b[31m[NetGateway Error] SSH Connection to {host}:{port} failed: {ssh_err}\x1b[0m\r\n")
            await websocket.close(code=1011, reason="SSH Connection Failed")
        except asyncio.CancelledError:
            logger.info("Session cancelled by client")
        except Exception as e:
            logger.exception(f"Unexpected bridge error: {e}")
            await websocket.close(code=1011, reason=str(e))
