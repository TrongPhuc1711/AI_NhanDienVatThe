"""
🎯 YOLOv8 Object Detection + 😴 Drowsiness Detection API
Backend sử dụng FastAPI + Ultralytics YOLOv8 + MediaPipe + OpenCV
"""

import base64
import time
import math
from collections import Counter

import cv2
import numpy as np
import mediapipe as mp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from ultralytics import YOLO


# ========================
# Khởi tạo ứng dụng
# ========================
app = FastAPI(
    title="YOLOv8 + Drowsiness Detection API",
    description="API phát hiện vật thể và buồn ngủ realtime",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# Load Models
# ========================
print("🚀 Đang tải model YOLOv8n...")
model = YOLO("yolov8n.pt")
print("✅ YOLOv8 sẵn sàng!")

print("🚀 Đang tải MediaPipe Face Mesh...")
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
    static_image_mode=False,
)
print("✅ MediaPipe sẵn sàng!")

# ========================
# Constants
# ========================
CLASSES_OF_INTEREST = {
    0:  "person",
    67: "cell phone",
    63: "laptop",
    64: "mouse",
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
    "tv":           "#9B59B6",
    "chair":        "#1ABC9C",
    "dining table": "#E67E22",
    "book":         "#3498DB",
    "scissors":     "#E74C3C",
}

# MediaPipe eye landmark indices
# Left eye:  outer(33), top1(160), top2(158), inner(133), bot1(153), bot2(144)
LEFT_EYE  = [33, 160, 158, 133, 153, 144]
# Right eye: outer(362), top1(385), top2(387), inner(263), bot1(373), bot2(380)
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

# Nose tip và chin để tính pitch (head tilt)
NOSE_TIP = 1
CHIN     = 152

# Ngưỡng
EAR_THRESHOLD   = 0.22   # Dưới ngưỡng này → mắt nhắm
PITCH_THRESHOLD = 15.0   # Độ nghiêng đầu (degrees) → gật đầu


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

# ── Drowsiness schemas ──
class EyeLandmark(BaseModel):
    x: float
    y: float

class DrowsinessResponse(BaseModel):
    face_detected:      bool
    left_ear:           float          # Eye Aspect Ratio mắt trái
    right_ear:          float          # Eye Aspect Ratio mắt phải
    avg_ear:            float          # EAR trung bình
    eyes_closed:        bool           # Mắt đang nhắm?
    head_pitch:         float          # Góc nghiêng đầu (degrees)
    head_nodding:       bool           # Đang gật đầu?
    drowsy:             bool           # Tổng hợp: đang buồn ngủ?
    drowsy_level:       int            # 0=OK, 1=Cảnh báo, 2=Nguy hiểm
    processing_time_ms: float
    # Toạ độ landmarks để vẽ lên canvas (normalized 0-1)
    left_eye_pts:       list[EyeLandmark]
    right_eye_pts:      list[EyeLandmark]
    nose_pt:            EyeLandmark | None
    chin_pt:            EyeLandmark | None


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
        raise ValueError("Không thể decode ảnh")
    return img


def resize_for_speed(img: np.ndarray, max_width: int = 640) -> np.ndarray:
    h, w = img.shape[:2]
    if w > max_width:
        scale = max_width / w
        img = cv2.resize(img, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def euclidean(p1, p2) -> float:
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)


def compute_ear(landmarks, eye_indices: list[int], img_w: int, img_h: int) -> float:
    """
    Eye Aspect Ratio = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
    Khi mắt mở: EAR ~ 0.3
    Khi mắt nhắm: EAR < 0.2
    """
    pts = []
    for idx in eye_indices:
        lm = landmarks[idx]
        pts.append((lm.x * img_w, lm.y * img_h))

    # pts[0]=outer, pts[1]=top1, pts[2]=top2,
    # pts[3]=inner, pts[4]=bot1, pts[5]=bot2
    vertical1  = euclidean(pts[1], pts[5])
    vertical2  = euclidean(pts[2], pts[4])
    horizontal = euclidean(pts[0], pts[3])

    if horizontal < 1e-6:
        return 0.0
    return (vertical1 + vertical2) / (2.0 * horizontal)


def compute_pitch(landmarks, img_w: int, img_h: int) -> float:
    """
    Tính góc nghiêng đầu theo chiều dọc (gật đầu).
    Dùng nose tip và chin.
    Pitch > 0: đầu cúi xuống
    """
    nose = landmarks[NOSE_TIP]
    chin = landmarks[CHIN]

    nose_y = nose.y * img_h
    chin_y = chin.y * img_h
    nose_x = nose.x * img_w
    chin_x = chin.x * img_w

    dy = chin_y - nose_y
    dx = chin_x - nose_x

    angle = math.degrees(math.atan2(abs(dx), dy))
    return angle  # 0 = thẳng, tăng = nghiêng


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
        bbox = BBox(x=x1/w, y=y1/h, width=(x2-x1)/w, height=(y2-y1)/h)
        detections.append(Detection(
            label=label, confidence=round(confidence, 3),
            bbox=bbox, color=CLASS_COLORS.get(label, "#FFFFFF"),
        ))
    return detections


# ========================
# API Endpoints
# ========================
@app.get("/", tags=["Health"])
def health_check():
    return {
        "status":  "ok",
        "message": "YOLOv8 + Drowsiness API đang chạy 🚀",
        "model":   "yolov8n + mediapipe",
        "version": "2.0.0",
    }


@app.post("/detect", response_model=DetectionResponse, tags=["Detection"])
async def detect(request: FrameRequest):
    t0 = time.perf_counter()
    try:
        img        = decode_image(request.image)
        img        = resize_for_speed(img, max_width=640)
        detections = run_yolo(img, request.confidence)
        counts     = dict(Counter(d.label for d in detections))

        return DetectionResponse(
            detections         = detections,
            counts             = counts,
            total              = len(detections),
            processing_time_ms = round((time.perf_counter() - t0) * 1000, 1),
            phone_alert        = "cell phone" in counts,
            person_count       = counts.get("person", 0),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/drowsiness", response_model=DrowsinessResponse, tags=["Drowsiness"])
async def detect_drowsiness(request: FrameRequest):
    """
    Phân tích frame để phát hiện buồn ngủ.
    Dùng MediaPipe Face Mesh để:
    - Tính EAR (Eye Aspect Ratio) → mắt nhắm
    - Tính head pitch → gật đầu
    """
    t0 = time.perf_counter()

    # Giá trị mặc định khi không phát hiện mặt
    empty = DrowsinessResponse(
        face_detected=False,
        left_ear=0.0, right_ear=0.0, avg_ear=0.0,
        eyes_closed=False,
        head_pitch=0.0, head_nodding=False,
        drowsy=False, drowsy_level=0,
        processing_time_ms=0.0,
        left_eye_pts=[], right_eye_pts=[],
        nose_pt=None, chin_pt=None,
    )

    try:
        img = decode_image(request.image)
        img = resize_for_speed(img, max_width=480)
        h, w = img.shape[:2]

        # MediaPipe cần RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(img_rgb)

        if not results.multi_face_landmarks:
            empty.processing_time_ms = round((time.perf_counter() - t0) * 1000, 1)
            return empty

        landmarks = results.multi_face_landmarks[0].landmark

        # ── Tính EAR ──
        left_ear  = compute_ear(landmarks, LEFT_EYE,  w, h)
        right_ear = compute_ear(landmarks, RIGHT_EYE, w, h)
        avg_ear   = (left_ear + right_ear) / 2.0
        eyes_closed = avg_ear < EAR_THRESHOLD

        # ── Tính head pitch ──
        head_pitch   = compute_pitch(landmarks, w, h)
        head_nodding = head_pitch > PITCH_THRESHOLD

        # ── Tổng hợp mức độ buồn ngủ ──
        # Level 0: Bình thường
        # Level 1: Cảnh báo (mắt nhắm HOẶC đầu cúi)
        # Level 2: Nguy hiểm (cả hai)
        drowsy_level = 0
        if eyes_closed or head_nodding:
            drowsy_level = 1
        if eyes_closed and head_nodding:
            drowsy_level = 2

        drowsy = drowsy_level > 0

        # ── Thu thập toạ độ landmarks để vẽ ──
        def lm_to_pt(idx):
            lm = landmarks[idx]
            return EyeLandmark(x=lm.x, y=lm.y)

        left_eye_pts  = [lm_to_pt(i) for i in LEFT_EYE]
        right_eye_pts = [lm_to_pt(i) for i in RIGHT_EYE]
        nose_pt       = lm_to_pt(NOSE_TIP)
        chin_pt       = lm_to_pt(CHIN)

        elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

        return DrowsinessResponse(
            face_detected      = True,
            left_ear           = round(left_ear, 3),
            right_ear          = round(right_ear, 3),
            avg_ear            = round(avg_ear, 3),
            eyes_closed        = eyes_closed,
            head_pitch         = round(head_pitch, 1),
            head_nodding       = head_nodding,
            drowsy             = drowsy,
            drowsy_level       = drowsy_level,
            processing_time_ms = elapsed_ms,
            left_eye_pts       = left_eye_pts,
            right_eye_pts      = right_eye_pts,
            nose_pt            = nose_pt,
            chin_pt            = chin_pt,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drowsiness error: {e}")


@app.get("/classes", tags=["Info"])
def get_classes():
    return {"classes": CLASSES_OF_INTEREST, "colors": CLASS_COLORS}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)