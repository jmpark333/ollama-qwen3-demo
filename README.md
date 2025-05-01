# Qwen3-8B 추론 테스트 데모

이 프로젝트는 Ollama Qwen3 모델을 이용해 주어진 수학/논리 문제에 대한 AI 답변을 저장하고, 웹에서 한눈에 볼 수 있도록 하는 데모입니다.

## 주요 기능
- Ollama Qwen3 API 연동 및 답변 자동 저장
- 문제/답변을 카드 형태로 보여주는 웹 UI
- FastAPI 기반 서버, Jinja2 템플릿 사용

## 실행 방법
1. Ollama 서버가 로컬에서 실행 중이어야 합니다 (예: `ollama run qwen3`)
2. Python 패키지 설치: `pip install -r requirements.txt`
3. 코드 다운로드: 아래 명령어로 소스코드를 본인 PC에 복제하세요.
git clone https://github.com/jmpark333/ollama-qwen3-demo.git
4. cd qwen3 && pip install -r requirements.txt
5. Ollama 설치 및 모델 다운로드: Ollama 공식 다운로드에서 설치 후, 터미널에서 "ollama pull qwen3"
6. FastAPI 서버 실행: uvicorn main:app --host 0.0.0.0 --port 10000
7. 웹 브라우저에서 접속: http://localhost:10000 으로 접속하여 데모 사용
(질문 클릭 시 Ollama가 답변을 생성합니다)
※ 본 데모는 각 사용자가 직접 자신의 PC에서 실행해야 정상 동작합니다.
(외부에서 접속하거나 서버에 배포된 버전에서는 Ollama 연결이 되지 않습니다)

## 참고
- Ollama Qwen3 엔드포인트: http://localhost:11434/v1/

(2025-05-01 07:58:39)
