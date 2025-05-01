// main.js (2025-05-01 13:23:00) 스트리밍 응답 처리 (EventSource 사용)
document.addEventListener("DOMContentLoaded", function() {
    const questionCards = document.querySelectorAll(".qa-card");
    let currentEventSource = null; // 현재 활성화된 EventSource 추적
    questionCards.forEach(function(card, idx) {
        const qDiv = card.querySelector(".question");
        qDiv.style.cursor = "pointer";
        qDiv.title = "클릭해서 답변 확인";

        qDiv.addEventListener("click", function() {
            if (currentEventSource) {
                currentEventSource.close();
                console.log("Previous EventSource closed.");
            }
            const answerDiv = card.querySelector(".answer");
            answerDiv.innerHTML = '<span style="color:#888;">답변 스트리밍 시작...</span>';

            // Ollama endpoint 동적 fetch (2025-05-01 16:13:30)
            const questionText = qDiv.innerText.replace(/^Q\d+\.\s*/, "");
            answerDiv.classList.add('answer-streaming');
            let fullContent = "";

            // fetchAnswerStream: 브라우저에서 직접 Ollama로 요청
            fetchAnswerStream(
                questionText,
                function(chunk) {
                    fullContent += chunk;
                    answerDiv.innerHTML = `<span style=\"color:#888;\">스트리밍 중...</span><br>${fullContent}`;
                },
                function(err) {
                    answerDiv.innerHTML = `<span style=\"color:red;\">[오류] Ollama 서버 연결 실패: ${err.message}</span>`;
                }
            ).then(() => {
                renderFinalContent(answerDiv, fullContent);
            });
        });
    });

    // Ollama endpoint 입력란에서 주소 가져오기 (2025-05-01 16:13:30)
    function getOllamaEndpoint() {
        const input = document.getElementById('ollama-endpoint');
        return input ? input.value : 'http://localhost:11434';
    }

    // 스트림 종료 후 최종 내용을 렌더링하는 함수
    function renderFinalContent(answerDiv, rawText) {
        let thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/);
        let thinkHtml = '', answerText = rawText;
        if (thinkMatch) {
            let thinkText = thinkMatch[1].trim();
            // 2025-05-01 15:02:40 생각과정에는 줄바꿈 규칙 미적용, 본문만 적용
            if (typeof marked !== 'undefined') {
                thinkHtml = marked.parse(thinkText);
            } else {
                thinkHtml = thinkText.replace(/\n/g, '<br>');
            }
            answerText = rawText.replace(thinkMatch[0], '');
        }
        // 본문(정답 등)만 줄바꿈 규칙 적용
        answerText = answerText.replace(/(\*\*?정답:?\*\*?)/g, '\n$1');
        answerText = answerText.replace(/(\d+\.\s)/g, '\n$1');
        if (typeof marked !== 'undefined') {
            answerText = marked.parse(answerText.trim());
        }
        let html = '';
        if (thinkHtml) {
            html += `<details class=\"think-block\"><summary>생각 과정 보기</summary><div class=\"think-inner\">${thinkHtml}</div></details>`;
        }
        html += answerText;
        answerDiv.innerHTML = html;
        // MathJax 수식 렌더링 트리거
        if (window.MathJax && window.MathJax.typeset) {
            window.MathJax.typeset([answerDiv]);
        }
    }
});
