# main.py
import asyncio
import signal
import websockets
from ws_handler import handler

HOST = "127.0.0.1"
PORT = 8765

stop_event = asyncio.Event()

def shutdown():
    stop_event.set()

async def main():
    loop = asyncio.get_running_loop()

    # Handle shutdown signals
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, shutdown)
        except NotImplementedError:
            # Windows fallback (signals behave differently)
            pass

    print(f"Starting server at ws://{HOST}:{PORT}")

    async with websockets.serve(
        handler,
        HOST,
        PORT,
        max_size=None,
        ping_interval=20,
        ping_timeout=10
    ):
        # 🔑 Wait here until Electron closes the app
        await stop_event.wait()

    print("Server shutting down cleanly")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
