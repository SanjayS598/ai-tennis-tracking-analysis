"""Unit tests for live line-call event broadcasting transport server."""

import asyncio
import json
import pytest

from tennis_ai.core.schemas import BounceEvent, CallDecision, Point2D
from tennis_ai.transport.server import EventBroadcaster


def test_event_broadcaster():
    async def _run():
        broadcaster = EventBroadcaster()

        # Create synthetic bounce event
        event = BounceEvent(
            event_id="bounce-0001",
            session_id="session-live-01",
            frame_idx=100,
            timestamp_ms=3333.3,
            ball_image_xy=Point2D(x=500.0, y=700.0),
            estimated_court_xy=Point2D(x=4.0, y=10.0),
            bounce_confidence=0.95,
            call=CallDecision.IN,
            call_confidence=0.98,
            reason="cleanly_inside_court",
        )

        # Mock queue subscriber
        queue = asyncio.Queue()
        broadcaster.subscribe(queue)
        assert broadcaster.client_count == 1

        # Broadcast event
        await broadcaster.broadcast_event(event)

        # Verify message delivered to client queue
        msg = await asyncio.wait_for(queue.get(), timeout=1.0)
        data = json.loads(msg)
        assert data["type"] == "LINE_CALL"
        assert data["event"]["call"] == "IN"
        assert data["haptic"] == "SUCCESS"

        # Unsubscribe
        broadcaster.unsubscribe(queue)
        assert broadcaster.client_count == 0

    asyncio.run(_run())
