"""
WebSocket routes for real-time status updates.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
from typing import Dict, Set
import json
import asyncio
from threading import Thread
import queue
from auth import verify_token

router = APIRouter()

# Message queue for broadcasting from background tasks
message_queue = queue.Queue()


class ConnectionManager:
    """Manages WebSocket connections."""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        self.active_connections.discard(websocket)
        print(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_text(message)
        except:
            self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all active connections."""
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                disconnected.add(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            self.disconnect(conn)


# Global connection manager
manager = ConnectionManager()


@router.websocket("/ws/status")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time status updates. Requires authentication token."""
    # Get token from query parameter or header
    token = websocket.query_params.get("token") or websocket.headers.get("authorization", "").replace("Bearer ", "")
    
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
        return
    
    # Verify token
    payload = verify_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
        return
    
    await manager.connect(websocket)
    
    # Start message queue processor for this connection
    async def process_queue():
        while True:
            try:
                if not message_queue.empty():
                    message = message_queue.get_nowait()
                    await websocket.send_text(json.dumps(message))
                await asyncio.sleep(0.1)
            except:
                break
    
    queue_task = asyncio.create_task(process_queue())
    
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                # Echo back or handle client messages if needed
                await websocket.send_text(json.dumps({"type": "pong", "message": "connected"}))
            except asyncio.TimeoutError:
                # Timeout is fine, just check connection
                continue
    except WebSocketDisconnect:
        queue_task.cancel()
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        queue_task.cancel()
        manager.disconnect(websocket)


def broadcast_status_update_sync(doc_id: int, status: str, message: str = None):
    """Broadcast a status update from a synchronous context (background task)."""
    update = {
        "doc_id": doc_id,
        "status": status,
        "message": message or status
    }
    message_queue.put(update)


async def process_message_queue():
    """Process messages from the queue and broadcast them."""
    while True:
        try:
            if not message_queue.empty():
                message = message_queue.get_nowait()
                await manager.broadcast(message)
            await asyncio.sleep(0.1)  # Small delay to prevent busy waiting
        except Exception as e:
            print(f"Error processing message queue: {e}")
            await asyncio.sleep(0.5)

