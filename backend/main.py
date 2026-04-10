"""
🎯 YOLOv8 Object Detection API
Backend sử dụng FastAPI + Ultralytics YOLOv8 + OpenCV
"""


import base64
import time
from collections import Counter

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from ultralytics import YOLO


# ========================
# Khởi tạo ứng dụng
# ========================
app = FastAPI(
    title="YOLOv8 Object Detection API",
    description="API phát hiện vật thể realtime bằng YOLOv8",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# Load YOLOv8 Model
# ========================
print("🚀 Đang tải model YOLOv8n...")
model = YOLO("yolov8n.pt")
print("✅ Model sẵn sàng!")

CLASSES_OF_INTEREST = {
    0:  "person",
    67: "cell phone",
    63: "laptop",
    64: "mouse",
    65: "remote",
    62: "tv",
    56: "chair",
    60: "dining table",
    73: "book",
    76: "scissors",
}

CLASS_COLORS = {
    "person":       "#00FF88",
    "cell phone":   "#FF4444",
    "laptop":       "#4488FF",
    "mouse":        "#FFD700",
    "remote":       "#FF8C00",
    "tv":           "#9B59B6",
    "chair":        "#1ABC9C",
    "dining table": "#E67E22",
    "book":         "#3498DB",
    "scissors":     "#E74C3C",
}


# ========================
# Pydantic Schemas
# ========================
class FrameRequest(BaseModel):
    image:      str
    confidence: float = Field(default=0.4, ge=0.1, le=0.9)

class BBox(BaseModel):
    x:      float
    y:      float
    width:  float
    height: float

class Detection(BaseModel):
    label:      str
    confidence: float
    bbox:       BBox
    color:      str

class DetectionResponse(BaseModel):
    detections:         list[Detection]
    counts:             dict
    total:              int
    processing_time_ms: float
    phone_alert:        bool
    person_count:       int


# ========================
# Utility Functions
# ========================
def decode_image(base64_str: str) -> np.ndarray:
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_bytes = base64.b64decode(base64_str)
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Không thể decode ảnh — kiểm tra định dạng base64")
    return img


def resize_for_speed(img: np.ndarray, max_width: int = 640) -> np.ndarray:
    h, w = img.shape[:2]
    if w > max_width:
        scale = max_width / w
        img = cv2.resize(img, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def run_yolo(img: np.ndarray, conf_threshold: float) -> list[Detection]:
    h, w = img.shape[:2]
    results = model(img, conf=conf_threshold, verbose=False)[0]

    detections = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        if cls_id not in CLASSES_OF_INTEREST:
            continue

        label      = CLASSES_OF_INTEREST[cls_id]
        confidence = float(box.conf[0])

        x1, y1, x2, y2 = box.xyxy[0].tolist()
        bbox = BBox(
            x      = x1 / w,
            y      = y1 / h,
            width  = (x2 - x1) / w,
            height = (y2 - y1) / h,
        )

        detections.append(Detection(
            label      = label,
            confidence = round(confidence, 3),
            bbox       = bbox,
            color      = CLASS_COLORS.get(label, "#FFFFFF"),
        ))

    return detections


# ========================
# API Endpoints
# ========================
@app.get("/", tags=["Health"])
def health_check():
    return {
        "status":  "ok",
        "message": "YOLOv8 API đang chạy 🚀",
        "model":   "yolov8n",
        "classes": list(CLASSES_OF_INTEREST.values()),
    }


@app.post("/detect", response_model=DetectionResponse, tags=["Detection"])
async def detect(request: FrameRequest):
    """
    Nhận frame ảnh từ webcam, chạy YOLOv8, trả kết quả JSON.
    - **image**: Chuỗi base64 của ảnh JPEG
    - **confidence**: Ngưỡng tin cậy (mặc định: 0.4)
    """
    t0 = time.perf_counter()

    try:
        img          = decode_image(request.image)
        img          = resize_for_speed(img, max_width=640)
        detections   = run_yolo(img, request.confidence)
        counts       = dict(Counter(d.label for d in detections))
        phone_alert  = "cell phone" in counts
        person_count = counts.get("person", 0)
        elapsed_ms   = (time.perf_counter() - t0) * 1000

        return DetectionResponse(
            detections         = detections,
            counts             = counts,
            total              = len(detections),
            processing_time_ms = round(elapsed_ms, 1),
            phone_alert        = phone_alert,
            person_count       = person_count,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.get("/classes", tags=["Info"])
def get_classes():
    return {
        "classes": CLASSES_OF_INTEREST,
        "colors":  CLASS_COLORS,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)