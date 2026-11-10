"""WebSocket real-time event streaming server for iPhone and Apple Watch companion apps."""

import asyncio
import json
from pathlib import Path
import sys
import time
from typing import Any, Dict, List, Optional, Set
import websockets

from tennis_ai.core.schemas import BounceEvent, CallDecision, Point2D


class EventBroadcaster:
    """Manages connected client queues and distributes formatted line call events."""

    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    @property
    def client_count(self) -> int:
        return len(self._subscribers)

    def subscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.add(queue)

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)

    def format_event_message(self, event: BounceEvent) -> str:
        """Format a BounceEvent into a lightweight JSON message with haptic action cue."""
        if event.call == CallDecision.IN:
            haptic_type = "SUCCESS"  # Single crisp vibration
        elif event.call == CallDecision.OUT:
            haptic_type = "FAILURE"  # Double alert vibration
        else:
            haptic_type = "RETRY"  # Subtle uncertainty tap

        payload = {
            "type": "LINE_CALL",
            "event_id": event.event_id,
            "session_id": event.session_id,
            "timestamp_ms": event.timestamp_ms,
            "server_time_ms": time.time() * 1000.0,
            "haptic": haptic_type,
            "event": event.model_dump(),
        }
        return json.dumps(payload)

    async def broadcast_event(self, event: BounceEvent) -> None:
        """Broadcast a BounceEvent to all active subscribers."""
        msg = self.format_event_message(event)
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(msg)
            except asyncio.QueueFull:
                pass

    async def broadcast_synthetic_call(
        self,
        call: CallDecision = CallDecision.IN,
        session_id: str = "synthetic-session",
    ) -> BounceEvent:
        """Generate and broadcast a synthetic call event for connection & latency testing."""
        event = BounceEvent(
            event_id=f"synth-{int(time.time() * 1000) % 10000:04d}",
            session_id=session_id,
            frame_idx=100,
            timestamp_ms=time.time() * 1000.0,
            ball_image_xy=Point2D(x=960.0, y=850.0),
            estimated_court_xy=Point2D(x=4.115, y=11.885),
            bounce_confidence=0.99,
            call=call,
            call_confidence=0.99,
            reason="synthetic_test_event",
        )
        await self.broadcast_event(event)
        return event


class LiveEventServer:
    """Async WebSocket server allowing iPhone/Watch clients to subscribe to real-time match events."""

    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        self.host = host
        self.port = port
        self.broadcaster = EventBroadcaster()
        self._server: Optional[Any] = None

    async def _handle_connection(self, websocket: Any) -> None:
        """Handle individual WebSocket client session."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self.broadcaster.subscribe(queue)
        print(f"[Transport] Client connected from {websocket.remote_address}. Total clients: {self.broadcaster.client_count}")

        # Send welcome message
        welcome = json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "server_time_ms": time.time() * 1000.0,
            "status": "ready",
        })
        await websocket.send(welcome)

        # Consumer & producer loop
        try:
            while True:
                # Wait for outgoing event or incoming ping
                send_task = asyncio.create_task(queue.get())
                recv_task = asyncio.create_task(websocket.recv())

                done, pending = await asyncio.wait(
                    [send_task, recv_task],
                    return_when=asyncio.FIRST_COMPLETED,
                )

                for task in pending:
                    task.cancel()

                if send_task in done:
                    msg = send_task.result()
                    await websocket.send(msg)

                if recv_task in done:
                    # Incoming message from iPhone (e.g. heartbeat or capture state)
                    recv_msg = recv_task.result()
                    # Respond with pong
                    pong = json.dumps({"type": "PONG", "echo": recv_msg, "server_time_ms": time.time() * 1000.0})
                    await websocket.send(pong)

        except (websockets.exceptions.ConnectionClosed, asyncio.CancelledError):
            pass
        finally:
            self.broadcaster.unsubscribe(queue)
            print(f"[Transport] Client disconnected. Total clients: {self.broadcaster.client_count}")

    async def start(self) -> None:
        """Start the WebSocket server."""
        self._server = await websockets.serve(
            self._handle_connection, self.host, self.port
        )
        print(f"--> Tennis AI Event Transport running on ws://{self.host}:{self.port}")

    async def stop(self) -> None:
        """Stop the WebSocket server."""
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._server = None


def main() -> None:
    """Run standalone transport server with optional periodic synthetic test events."""
    import argparse

    parser = argparse.ArgumentParser(description="Tennis AI Real-Time WebSocket Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host address (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8765, help="Port (default: 8765)")
    parser.add_argument(
        "--synthetic-interval",
        type=float,
        default=0.0,
        help="If > 0, broadcast synthetic test calls every N seconds",
    )

    args = parser.parse_args()

    async def runner():
        server = LiveEventServer(host=args.host, port=args.port)
        await server.start()

        if args.synthetic_interval > 0:
            print(f"--> Broadcasting synthetic call events every {args.synthetic_interval}s...")
            calls = [CallDecision.IN, CallDecision.OUT, CallDecision.UNCERTAIN]
            idx = 0
            while True:
                await asyncio.sleep(args.synthetic_interval)
                call = calls[idx % len(calls)]
                await server.broadcaster.broadcast_synthetic_call(call)
                print(f"[Transport] Broadcast synthetic call: {call.value}")
                idx += 1
        else:
            await asyncio.Future()  # run forever

    try:
        asyncio.run(runner())
    except KeyboardInterrupt:
        print("\n[Transport] Server stopped by user.")


if __name__ == "__main__":
    main()
