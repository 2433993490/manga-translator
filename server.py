# 终端安装依赖: pip install fastapi uvicorn pydantic flask (如果你用flask)
# 这里以 FastAPI 为例
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64

app = FastAPI()

# 允许跨域请求（必须加，否则 Chrome 扩展无法调用）
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
    # 1. 解码前端传来的 Base64 图片
    image_data = base64.b64decode(data.base64_img.split(",")[1] if "," in data.base64_img else data.base64_img)
    
    # ---------------------------------------------------------
    # 2. 在这里接入你的 PaddleOCR 代码，识别 image_data
    # 3. 将识别出的日文文本，发送给 DeepSeek 或 Gemini API 获取中文
    # 4. 计算文本框在图片上的相对坐标 (0.0 ~ 1.0)
    # ---------------------------------------------------------
    
    # 下面是需要返回给 Chrome 扩展的数据格式示例：
    result = [
        {
            "originalText": "何してんの こんなとこで",
            "translatedText": "你在这里干什么？",
            "box": {"x": 0.38, "y": 0.18, "width": 0.1, "height": 0.15} # 相对坐标
        }
    ]
    
    return {"success": True, "data": result}

# 运行命令: uvicorn server:app --reload --port 8000
