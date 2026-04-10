"""
🎯 YOLOv8 Object Detection API
Backend sử dụng FastAPI + Ultralytics YOLOv8 + OpenCV
"""

import base64
import time
from collections import Counter
from typing import Optional

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

# CORS: cho phép React frontend kết nối từ localhost
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
model = YOLO("yolov8n.pt")   # Tự động tải nếu chưa có (~6MB)
print("✅ Model sẵn sàng!")

# ── Class quan tâm (COCO dataset IDs) ──────────────
# Xem đầy đủ: https://docs.ultralytics.com/datasets/detect/coco/
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

# Màu HEX cho từng class (hiển thị bounding box trên frontend)
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
    """Dữ liệu nhận từ React frontend"""
    image:      str              # base64 JPEG string
    confidence: float = Field(default=0.4, ge=0.1, le=0.9)

class BBox(BaseModel):
    """Tọa độ bounding box, chuẩn hóa 0..1"""
    x:      float
    y:      float
    width:  float
    height: float

class Detection(BaseModel):
    """Kết quả detect 1 object"""
    label:      str
    confidence: float
    bbox:       BBox
    color:      str

class DetectionResponse(BaseModel):
    """Response trả về frontend"""
    detections:         list[Detection]
    counts:             dict       # {"person": 2, "cell phone": 1}
    total:              int
    processing_time_ms: float
    phone_alert:        bool       # True khi phát hiện điện thoại
    person_count:       int        # Tiện truy cập nhanh


# ========================
# Utility Functions
# ========================
def decode_image(base64_str: str) -> np.ndarray:
    """Giải mã base64 → numpy array (OpenCV BGR format)"""
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_bytes = base64.b64decode(base64_str)
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Không thể decode ảnh — kiểm tra định dạng base64")
    return img


def resize_for_speed(img: np.ndarray, max_width: int = 640) -> np.ndarray:
    """Resize ảnh để tăng tốc inference (giữ tỷ lệ)"""
    h, w = img.shape[:2]
    if w > max_width:
        scale = max_width / w
        img = cv2.resize(img, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def run_yolo(img: np.ndarray, conf_threshold: float) -> list[Detection]:
    """
    Chạy YOLOv8 inference và trả danh sách Detection
    
    Args:
        img: Ảnh numpy BGR
        conf_threshold: Ngưỡng confidence (0.1 ~ 0.9)
    """
    h, w = img.shape[:2]

    # verbose=False để tắt log trên terminal
    results = model(img, conf=conf_threshold, verbose=False)[0]

    detections = []
    for box in results.boxes:
        cls_id = int(box.cls[0])

        # Bỏ qua class không quan tâm
        if cls_id not in CLASSES_OF_INTEREST:
            continue

        label      = CLASSES_OF_INTEREST[cls_id]
        confidence = float(box.conf[0])

        # Tọa độ pixel → chuẩn hóa 0..1
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
    """Kiểm tra server đang hoạt động"""
    return {
        "status":  "ok",
        "message": "YOLOv8 API đang chạy 🚀",
        "model":   "yolov8n",
        "classes": list(CLASSES_OF_INTEREST.values()),
    }


@app.post("/detect", response_model=DetectionResponse, tags=["Detection"])
async def detect(request: FrameRequest):
    """
    **Endpoint chính** — Nhận frame ảnh từ webcam, chạy YOLOv8, trả kết quả JSON.

    - **image**: Chuỗi base64 của ảnh JPEG (có thể có/không có header data:image/...)
    - **confidence**: Ngưỡng tin cậy tối thiểu (mặc định: 0.4 = 40%)
    """
    t0 = time.perf_counter()

    try:
        # 1. Decode ảnh
        img = decode_image(request.image)

        # 2. Resize nhỏ lại để xử lý nhanh hơn
        img = resize_for_speed(img, max_width=640)

        # 3. Chạy YOLO
        detections = run_yolo(img, request.confidence)

        # 4. Tổng hợp thống kê
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
    """Trả về danh sách class và màu tương ứng"""
    return {
        "classes": CLASSES_OF_INTEREST,
        "colors":  CLASS_COLORS,
    }


# ── Chạy trực tiếp bằng: python main.py ────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)