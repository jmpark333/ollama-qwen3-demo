# main.py
# Ollama Qwen3 API와 연동하여 문제-답변 저장 및 제공 (2025-05-01 07:58:39)
from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import httpx
import asyncio
import re

app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")  # (2025-05-01 08:55:30) 정적 파일 서빙 추가

OLLAMA_ENDPOINT = "http://localhost:11434/v1/chat/completions"
MODEL = "qwen3"

QUESTIONS = [
    "5학년과 6학년 학생 160명이 나무 심기에 참가하였습니다. 6학년 학생들이 각각 평균5그루,5학년 학생들이 각각 평균 3그루씩 심은 결과 모두 560그루를 심었습니다. 나무심기에 참가한 5,6학년 학생은 각각 몇명일까요?",
    "베티는 새 지갑을 위해 돈을 모으고 있습니다. 새 지갑의 가격은 100달러입니다. 베티는 필요한 돈의 절반만 가지고 있습니다. 그녀의 부모는 그 목적을 위해 15달러를 주기로 결정했고, 할아버지와 할머니는 그녀의 부모들의 두 배를 줍니다. 베티가 지갑을 사기 위해 더 얼마나 많은 돈이 필요한가요?",
    "전국 초등학생 수학경시대회가 열렸는데 영희,철수,진호 세사람이 참가했습니다. 그들은 서울,부산,인천에서 온 학생이고 각각 1등,2등,3등 상을 받았습니다. 다음과 같은 사항을 알고 있을때 진호는 어디에서 온 학생이고 몇등을 했습니까? 1) 영희는 서울의 선수가 아닙니다. 2) 철수는 부산의 선수가 아닙니다. 3)서울의 선수는 1등이 아닙니다. 4) 부산의 선수는 2등을 했습니다. 5)철수는 3등이 아닙니다.",
    "방 안에는 살인자가 세 명 있습니다. 어떤 사람이 방에 들어와 그중 한 명을 죽입니다. 아무도 방을 나가지 않습니다. 방에 남아 있는 살인자는 몇 명입니까? 단계별로 추론 과정을 설명하세요.",
    "A marble is put in a glass. The glass is then turned upside down and put on a table. Then the glass is picked up and put in a microwave. Where's the marble? Explain your reasoning step by step.",
    "도로에 5대의 큰 버스가 차례로 세워져 있는데 각 차의 뒤에 모두 차의 목적지가 적혀져 있습니다. 기사들은 이 5대 차 중 2대는 A시로 가고, 나머지 3대는 B시로 간다는 사실을 알고 있지만 앞의 차의 목적지만 볼 수 있습니다. 안내원은 이 몇 분의 기사들이 모두 총명할 것으로 생각하고 그들의 차가 어느 도시로 가야 하는지 목적지를 알려 주지 않고 그들에게 맞혀 보라고 하였습니다. 먼저 세번째 기사에게 자신의 목적지를 맞혀 보라고 하였더니 그는 앞의 두 차에 붙여 놓은 표시를 보고 말하기를 \"모르겠습니다.\" 라고 말하였습니다. 이것을 들은 두번째 기사도 곰곰히 생각해 보더니 \"모르겠습니다.\" 라고 말하였습니다. 두명의 기사의 이야기를 들은 첫번째 기사도 곰곰히 생각하더니 자신의 목적지를 정확하게 말하였습니다. 첫번째 기사가 말한 목적지는 어디입니까?"
]

# (2025-05-02 06:47:49) 수학문제 데모용 math_problems 추가
math_problems = {
    "기초 대수 문제": "두 숫자 𝑥와 𝑦가 있습니다. 이들이 만족하는 식은 3𝑥 + 4𝑦 = 12이며, 𝑥 − 2𝑦 = 1입니다. 단계별로 추론 과정을 설명하고, 𝑥와 𝑦의 값을 소수점으로 답하세요",
    "기하학 문제": "반지름이 7cm인 원의 넓이를 구하세요. 𝜋 = 3.14159로 계산하세요. 단계별로 추론 과정을 설명하고, 답하세요",
    "확률 문제": "주사위를 두 번 던졌을 때, 두 숫자의 합이 7이 될 확률을 구하세요. 단계별로 추론 과정을 설명하고, 답하세요",
    "수열 문제": "첫 번째 항이 3이고, 공차가 5인 등차수열의 10번째 항을 구하세요. 단계별로 추론 과정을 설명하고, 답하세요",
    "최적화 문제": "어떤 직사각형의 둘레가 36cm입니다. 이 직사각형의 넓이를 최대화하려면 가로와 세로의 길이는 각각 얼마여야 하나요? 단계별로 추론 과정을 설명하세요.",
    "복합 문제": "복소평면에서 다음 극한값을 구하시오. lim[n→∞] (1 + i/n)^(n^2) 여기서 i는 허수단위 (i^2 = -1)입니다. 단계별로 추론 과정을 설명하세요"
}

# (2025-05-02 07:01:40) system 프롬프트 강화: think 태그, 마크다운, 수식, 단계별 설명, 최종답만 수식 없이 안내
SYSTEM_PROMPT = (
    "모든 답변은 반드시 한국어로 해주세요. "
    "모든 생각 과정은 반드시 <think>...</think> 태그로 감싸서 출력하세요. "
    "풀이 과정, 논리, 수식, 단계별 설명 등은 반드시 마크다운(번호, 목록, 소제목, 수식)으로 구분해서 출력하세요. "
    "각 단계는 반드시 줄바꿈(\\n) 또는 마크다운 번호/목록/소제목(예: 1., 2., 3. 또는 -, * 등)으로 구분해서 출력하세요. "
    "새로운 문단과 각 단계는 반드시 빈 줄(두 번 엔터)로 구분하세요. "
    "이 규칙을 반드시 지키세요."
)

# (2025-05-02 12:06:15) 수식 표현 후처리 함수 추가
def process_math_expressions(text):
    """
    수식 표현을 후처리하여 올바르게 표시되도록 변환합니다.
    """
    if not text:
        return text
    
    # (2025-05-02 14:25:15) LaTeX 수식 처리 방식 단순화
    # 백슬래시 명령어 이스케이프 처리
    
    # 특수 LaTeX 명령어 처리
    replacements = {
        r'\times': '\\times',
        r'\cdot': '\\cdot',
        r'\tag': '\\tag',
        r'\quad': '\\quad',
        r'\boxed': '\\boxed',
        r'\Rightarrow': '\\Rightarrow',
        r'\Leftarrow': '\\Leftarrow',
        r'\rightarrow': '\\rightarrow',
        r'\leftarrow': '\\leftarrow',
        r'\therefore': '\\therefore',
        r'\because': '\\because',
        r'\forall': '\\forall',
        r'\exists': '\\exists',
        r'\in': '\\in',
        r'\subset': '\\subset',
        r'\supset': '\\supset',
        r'\cup': '\\cup',
        r'\cap': '\\cap',
        r'\emptyset': '\\emptyset',
        r'\infty': '\\infty',
        r'\partial': '\\partial',
        r'\nabla': '\\nabla',
        r'\alpha': '\\alpha',
        r'\beta': '\\beta',
        r'\gamma': '\\gamma',
        r'\delta': '\\delta',
        r'\epsilon': '\\epsilon',
        r'\zeta': '\\zeta',
        r'\eta': '\\eta',
        r'\theta': '\\theta',
        r'\iota': '\\iota',
        r'\kappa': '\\kappa',
        r'\lambda': '\\lambda',
        r'\mu': '\\mu',
        r'\nu': '\\nu',
        r'\xi': '\\xi',
        r'\pi': '\\pi',
        r'\rho': '\\rho',
        r'\sigma': '\\sigma',
        r'\tau': '\\tau',
        r'\upsilon': '\\upsilon',
        r'\phi': '\\phi',
        r'\chi': '\\chi',
        r'\psi': '\\psi',
        r'\omega': '\\omega',
    }
    
    # 수식 명령어 이스케이프 처리
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    return text

async def fetch_answer(question):
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": question}
                ],
                "options": {"num_ctx": 4096, "num_predict": 512}
            }
            response = await client.post(OLLAMA_ENDPOINT, json=payload, timeout=120.0)
            if response.status_code != 200:
                return f"HTTP 오류: {response.status_code} - {response.text}"
            try:
                data = response.json()
                print(f"[응답 데이터] {str(data)[:100]}...")
                if "choices" in data and data["choices"]:
                    content = data["choices"][0]["message"]["content"]
                    # (2025-05-02 12:06:15) 수식 표현 후처리 적용
                    processed_content = process_math_expressions(content)
                    print(f"[응답 내용] {processed_content[:100]}...")
                    return processed_content
                else:
                    return f"API 응답 구조 오류: {data}"
            except Exception as e:
                import traceback
                return f"JSON 파싱 예외: {str(e)}, 원본 응답: {response.text}"
    except Exception as e:
        import traceback
        return f"예외 발생: {str(e)}\n{traceback.format_exc()}"

async def fetch_answer_stream(question):
    import json
    import asyncio
    try:
        yield "data: [STREAM_START]\n\n".encode('utf-8')
        print(f"[fetch_answer_stream] 질문: {question}")
        async with httpx.AsyncClient(timeout=120.0) as client:
            payload = {
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": question}
                ],
                "stream": True,
                "options": {"num_ctx": 4096, "num_predict": 512}
            }
            async with client.stream("POST", OLLAMA_ENDPOINT, json=payload) as response:
                if response.status_code != 200:
                    error_message = await response.aread()
                    yield f"data: [HTTP 오류] {response.status_code} - {error_message.decode('utf-8')}\n\n".encode('utf-8')
                    yield "data: [DONE]\n\n".encode('utf-8')
                    return
                buffer = ""
                async for chunk in response.aiter_bytes():
                    buffer += chunk.decode('utf-8')
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        if line.strip():
                            try:
                                if line.startswith('data:'):
                                    line = line[5:].strip()
                                data = json.loads(line)
                                if "choices" in data and data["choices"]:
                                    delta = data["choices"][0].get("delta", {})
                                    content_chunk = delta.get("content")
                                    if content_chunk:
                                        # (2025-05-02 12:06:15) 수식 표현 후처리 적용
                                        processed_chunk = process_math_expressions(content_chunk)
                                        print(f"[스트림 전송] chunk: {processed_chunk}")
                                        yield f"data: {processed_chunk}\n\n".encode('utf-8')
                                        await asyncio.sleep(0.01)
                                if data.get("done") or (data.get("choices") and data["choices"][0].get("finish_reason") == "stop"):
                                    break
                            except json.JSONDecodeError as e:
                                print(f"JSON 디코딩 오류 무시: {e}, 라인: '{line}'")
                            except Exception as e:
                                print(f"스트림 처리 중 예외 발생: {e}")
                                yield f"data: [처리 오류] {str(e)}\n\n".encode('utf-8')
        yield "data: [DONE]\n\n".encode('utf-8')
    except Exception as e:
        print(f"[fetch_answer_stream] 전체 예외: {e}")
        yield f"data: [예외] {str(e)}\n\n".encode('utf-8')
        yield "data: [DONE]\n\n".encode('utf-8')

@app.get("/api/math_qa_detail")
def api_math_qa_detail():
    return JSONResponse([{"type": k, "question": math_problems[k]} for k in math_problems])

@app.get("/api/math_qa")
def api_math_qa():
    return JSONResponse(list(math_problems.keys()))

@app.post("/api/math_answer_stream")
async def post_math_answer_stream(idx: int = Form(...)):
    keys = list(math_problems.keys())
    if idx < 0 or idx >= len(keys):
        return StreamingResponse((line.encode('utf-8') for line in ["[오류] 잘못된 문제 인덱스입니다."]), media_type="text/event-stream")
    question = math_problems[keys[idx]]
    return StreamingResponse(fetch_answer_stream(question), media_type="text/event-stream")

@app.get("/api/math_answer")
async def get_math_answer_stream(idx: int):
    keys = list(math_problems.keys())
    if idx < 0 or idx >= len(keys):
        return StreamingResponse((line.encode('utf-8') for line in ["[오류] 잘못된 문제 인덱스입니다."]), media_type="text/event-stream")
    question = math_problems[keys[idx]]
    return StreamingResponse(fetch_answer_stream(question), media_type="text/event-stream")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "questions": QUESTIONS})

@app.post("/api/answer")
async def post_answer_stream(idx: int = Form(...)):
    if 0 <= idx < len(QUESTIONS):
        return StreamingResponse(fetch_answer_stream(QUESTIONS[idx]), media_type="text/event-stream")
    else:
        async def error_stream():
            yield f"data: [오류] 잘못된 질문 인덱스: {idx}\n\n".encode('utf-8')
            yield "data: [DONE]\n\n".encode('utf-8')
        return StreamingResponse(error_stream(), media_type="text/event-stream", status_code=400)

@app.get("/api/answer")
async def get_answer_stream(idx: int):
    if 0 <= idx < len(QUESTIONS):
        return StreamingResponse(fetch_answer_stream(QUESTIONS[idx]), media_type="text/event-stream")
    else:
        async def error_stream():
            yield f"data: [오류] 잘못된 질문 인덱스: {idx}\n\n".encode('utf-8')
            yield "data: [DONE]\n\n".encode('utf-8')
        return StreamingResponse(error_stream(), media_type="text/event-stream", status_code=400)

@app.get("/api/qa", response_class=JSONResponse)
async def get_qa():
    return {"qa": list(zip(QUESTIONS, [await fetch_answer(q) for q in QUESTIONS]))}
