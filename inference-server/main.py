"""
FastAPI inference sidecar for real-time pose estimation via YOLOv8-pose.

Run with: uvicorn main:app --host 0.0.0.0 --port 8000
"""

import json
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

from rep_counter import RepCounter, VALID_EXERCISES

app = FastAPI(title="WorkoutCoach Inference Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup (yolov8n-pose for speed)
model = YOLO("yolov8n-pose.pt")


@app.get("/health")
async def health():
    return {"status": "ok", "model": "yolov8n-pose"}


@app.get("/exercises")
async def exercises():
    return {"exercises": VALID_EXERCISES}


@app.websocket("/ws/track")
async def track(ws: WebSocket, exercise: str | None = None):
    await ws.accept()
    target = exercise.replace("_", " ") if exercise else None
    if target and target not in VALID_EXERCISES:
        target = None
    counter = RepCounter(target_exercise=target)

    try:
        while True:
            # Receive JPEG bytes from browser
            data = await ws.receive_bytes()

            # Decode JPEG to numpy array
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                await ws.send_text(json.dumps({"error": "Invalid frame"}))
                continue

            # Run YOLOv8-pose inference
            results = model(frame, verbose=False)

            # Extract keypoints from the first detected person
            keypoints_list: list[list[float]] = []
            confidence = 0.0

            if results and len(results) > 0 and results[0].keypoints is not None:
                kps = results[0].keypoints
                if kps.data is not None and len(kps.data) > 0:
                    # Take the first person detected
                    person_kps = kps.data[0]  # shape: (17, 3) = [x, y, conf]
                    keypoints_list = person_kps.tolist()
                    # Average confidence of visible keypoints
                    confs = [kp[2] for kp in keypoints_list if kp[2] > 0.1]
                    confidence = sum(confs) / len(confs) if confs else 0.0

            # Update rep counter
            rep_state = counter.update(keypoints_list) if keypoints_list else {
                "exercise": "unknown",
                "repCount": 0,
                "phase": "idle",
            }

            response = {
                "keypoints": keypoints_list,
                "exercise": rep_state["exercise"],
                "repCount": rep_state["repCount"],
                "phase": rep_state["phase"],
                "confidence": round(confidence, 3),
            }

            await ws.send_text(json.dumps(response))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws.send_text(json.dumps({"error": str(e)}))
        except Exception:
            pass
