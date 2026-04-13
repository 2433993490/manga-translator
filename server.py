from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import numpy as np
import cv2
from paddleocr import PaddleOCR

app = FastAPI()

# 初始化 PaddleOCR，指定语言为日语。
# 首次运行时会自动下载检测和识别模型，请耐心等待终端跑完下载进度条。
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

@app.post("/api/translate")
async def translate_image(data: ImageData):
    # 1. 解码前端传来的 Base64 图片数据
    image_data = base64.b64decode(data.base64_img.split(",")[1] if "," in data.base64_img else data.base64_img)
    
    # 2. 将字节数据转换为 OpenCV 可读的图像矩阵
    nparr = np.frombuffer(image_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 获取图片的真实像素宽高
    img_height, img_width = img.shape[:2]

    # 3. 核心：运行 PaddleOCR 提取文字和坐标
    result = ocr.ocr(img, cls=True)
    
    chrome_extension_data = []

    # 判断是否成功识别到了内容
    if result and result[0]:
        for line in result[0]:
            box = line[0]  # 这是四个角的坐标 [[左上x, 左上y], [右上x, 右上y], [右下x, 右下y], [左下x, 左下y]]
            text = line[1][0] # 识别出的日文文本
            
            # 寻找这个文本框的最小边界（最左、最右、最上、最下）
            x_coords = [point[0] for point in box]
            y_coords = [point[1] for point in box]
            min_x = min(x_coords)
            max_x = max(x_coords)
            min_y = min(y_coords)
            max_y = max(y_coords)
            
            # 4. 坐标换算：把绝对像素点转换为 0.0 ~ 1.0 的相对比例，发给 Chrome
            rel_x = min_x / img_width
            rel_y = min_y / img_height
            rel_width = (max_x - min_x) / img_width
            rel_height = (max_y - min_y) / img_height
            
            # 目前这步先不调用 AI 翻译，我们把识别出来的日文本体加上前缀返回，看看框画得准不准
            chrome_extension_data.append({
                "originalText": text,
                "translatedText": f"识别到: {text}", 
                "box": {
                    "x": rel_x, 
                    "y": rel_y, 
                    "width": rel_width, 
                    "height": rel_height
                }
            })

    return {"success": True, "data": chrome_extension_data}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
