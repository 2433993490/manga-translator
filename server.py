import base64

import cv2
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from paddleocr import PaddleOCR

app = FastAPI(title="Manga Translator Local OCR API")

# 首次运行会下载模型
ocr = PaddleOCR(use_angle_cls=True, lang="japan")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ImageData(BaseModel):
    base64_img: str


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/api/ocr")
async def ocr_image(data: ImageData):
    image_data = base64.b64decode(data.base64_img.split(",")[1] if "," in data.base64_img else data.base64_img)
    nparr = np.frombuffer(image_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    img_height, img_width = img.shape[:2]
    result = ocr.ocr(img, cls=True)

    blocks = []
    if result and result[0]:
        for line in result[0]:
            box = line[0]
            text = line[1][0]

            x_coords = [point[0] for point in box]
            y_coords = [point[1] for point in box]
            min_x, max_x = min(x_coords), max(x_coords)
            min_y, max_y = min(y_coords), max(y_coords)

            blocks.append(
                {
                    "originalText": text,
                    "translatedText": text,
                    "box": {
                        "x": min_x / img_width,
                        "y": min_y / img_height,
                        "width": (max_x - min_x) / img_width,
                        "height": (max_y - min_y) / img_height,
                    },
                }
            )

    return {"success": True, "blocks": blocks}


# 兼容旧接口名
@app.post("/api/translate")
async def translate_image(data: ImageData):
    result = await ocr_image(data)
    return {"success": True, "data": result.get("blocks", [])}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
