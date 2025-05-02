
# Qwen3-8B 추론 테스트 데모

이 프로젝트는 Ollama Qwen3 모델을 이용해 주어진 수학/논리 문제에 대한 AI 답변을 저장하고, 웹에서 한눈에 볼 수 있도록 하는 데모입니다.

## 주요 기능

- Ollama Qwen3 API 연동
- 문제/답변을 카드 형태로 보여주는 웹 UI
- FastAPI 기반 서버, Jinja2 템플릿 사용

## 실행 방법

1. Ollama 서버가 로컬에서 실행 중이어야 합니다 (예: `ollama run qwen3`)
2. 코드 다운로드: 아래 명령어로 소스코드를 본인 PC에 복제하세요.
   git clone https://github.com/jmpark333/ollama-qwen3-demo.git
3. cd qwen3 && pip install -r requirements.txt
4. Ollama 설치 및 모델 다운로드: Ollama 공식 다운로드에서 설치 후, 터미널에서 "ollama pull qwen3"
5. FastAPI 서버 실행: uvicorn main:app --host 0.0.0.0 --port 10000
6. 웹 브라우저에서 접속: http://localhost:10000 으로 접속하여 데모 사용
   (질문 클릭 시 Ollama가 답변을 생성합니다)
   ※ 본 데모는 각 사용자가 직접 자신의 PC에서 실행해야 정상 동작합니다.
   (외부에서 접속하거나 서버에 배포된 버전에서는 Ollama 연결이 되지 않습니다)

## 참고

- Ollama Qwen3 엔드포인트: http://localhost:11434/v1/

## 변경 이력

- 2025-05-02 (Fix)

  - LaTeX 수식 렌더링 오류 수정: 서버 측 불필요한 이스케이프 제거 및 클라이언트 MathJax 렌더링 로직 단순화 (main.py, static/main.js)
- 2025-05-02

  - (2025-05-02 12:29:45) LaTeX 수식 표현 렌더링 개선 - MathJax 라이브러리 추가 및 수식 처리 로직 개선
  - 수학문제 답변도 추론문제와 동일하게 **think 태그 접힘(생각 과정 보기)**, **마크다운 변환**, **수식(MathJax) 표시**가 적용되도록 개선
  - 스트리밍 중에도 줄바꿈/HTML 이스케이프 처리 일관성 유지
  - 관련 코드: templates/index.html, main.py, static/main.js

(2025-05-01 07:58:39)
