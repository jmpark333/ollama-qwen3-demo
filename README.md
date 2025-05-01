# Qwen3 문제풀이 데모

이 프로젝트는 Ollama Qwen3 모델을 이용해 주어진 수학/논리 문제에 대한 AI 답변을 저장하고, 웹에서 한눈에 볼 수 있도록 하는 데모입니다.

## 주요 기능
- Ollama Qwen3 API 연동 및 답변 자동 저장
- 문제/답변을 카드 형태로 보여주는 웹 UI
- FastAPI 기반 서버, Jinja2 템플릿 사용

## 실행 방법
1. Ollama 서버가 로컬에서 실행 중이어야 합니다 (예: `ollama run qwen3`)
2. Python 패키지 설치: `pip install -r requirements.txt`
3. 서버 실행: `uvicorn main:app --reload`
4. 브라우저에서 `http://localhost:8000` 접속

## 참고
- Ollama Qwen3 엔드포인트: http://localhost:11434/v1/
- 데모 스타일 참고: https://gemini-flash-inference-demo.windsurf.build/

(2025-05-01 07:58:39)
