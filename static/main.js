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
            answerDiv.classList.add('answer-streaming');
            let fullContent = "";
            let thinkingContent = "";
            let isThinking = false;

            // 서버 프록시 API로 EventSource 연결 (원상복구)
            const url = `/api/answer?idx=${idx}`;
            const eventSource = new EventSource(url);
            currentEventSource = eventSource;
            console.log(`EventSource created for question ${idx}: ${url}`);

            eventSource.onopen = function() {
                console.log(`EventSource connection opened for question ${idx}.`);
                answerDiv.innerHTML = '';
            };
            eventSource.onmessage = function(event) {
                const data = event.data;
                console.log("Received data:", data);
                if (data === "[STREAM_START]") {
                    console.log("Stream started.");
                    fullContent = "";
                    answerDiv.innerHTML = '';
                    return;
                }
                if (data === "[DONE]") {
                    console.log("Stream finished.");
                    eventSource.close();
                    currentEventSource = null;
                    answerDiv.classList.remove('answer-streaming');
                    renderFinalContent(answerDiv, fullContent);
                    return;
                }
                if (data.startsWith("[HTTP 오류]") || data.startsWith("[예외]") || data.startsWith("[처리 오류]") || data.startsWith("[오류]")) {
                    answerDiv.innerHTML = `<span style="color:red;">${data}</span>`;
                    eventSource.close();
                    currentEventSource = null;
                    answerDiv.classList.remove('answer-streaming');
                    return;
                }
                try {
                    let rawData = event.data;
                    const dataPrefix = "data: ";
                    if (rawData.startsWith(dataPrefix)) {
                        rawData = rawData.substring(dataPrefix.length).trim();
                    }
                    if (!rawData) {
                        console.warn("Ignoring empty data after prefix removal.");
                        return;
                    }
                    fullContent += rawData;
                    const tempHtml = fullContent
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;")
                        .replace(/\n/g, '<br>');
                    answerDiv.innerHTML = tempHtml;
                } catch (e) {
                    console.error("스트림 데이터 처리 오류:", e);
                    answerDiv.innerHTML = `<span style="color:red;">[오류] 데이터 처리 오류: ${e.message}</span>`;
                    return;
                }
            };
            eventSource.onerror = function(error) {
                console.error("EventSource error:", error);
                answerDiv.innerHTML = `<span style=\"color:red;\">[오류] 스트리밍 중 오류가 발생했습니다: ${error.message}</span>`;
                eventSource.close();
                currentEventSource = null;
                answerDiv.classList.remove('answer-streaming');
            };
        });
    });

    function renderFinalContent(answerDiv, rawText) {
        let thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/);
        let thinkHtml = '', answerText = rawText;
        if (thinkMatch) {
            let thinkText = thinkMatch[1].trim();
            if (typeof marked !== 'undefined') {
                thinkHtml = marked.parse(thinkText);
            } else {
                thinkHtml = thinkText.replace(/\n/g, '<br>');
            }
            answerText = rawText.replace(thinkMatch[0], '');
        }
        answerText = answerText.replace(/(\*\*?정답:?\*\*?)/g, '\n$1');
        answerText = answerText.replace(/(\d+\.\s)/g, '\n$1');
        
        // (2025-05-02 14:34:00) LaTeX 수식 처리 단순화: 마크다운 변환 후 MathJax 직접 호출
        
        // 마크다운 변환
        if (typeof marked !== 'undefined') {
            answerText = marked.parse(answerText.trim());
        } else {
            // marked가 없으면 기본적인 HTML 변환 (예: 줄바꿈)
            answerText = answerText.trim().replace(/\n/g, '<br>');
        }
        
        let html = '';
        if (thinkHtml) {
            html += `<details class="think-block"><summary>생각 과정 보기</summary><div class="think-inner">${thinkHtml}</div></details>`;
        }
        html += answerText;
        answerDiv.innerHTML = html; // 마크다운 변환된 HTML 삽입
        
        // MathJax 렌더링: 마크다운 변환 후 전체 answerDiv에 대해 실행
        if (window.MathJax) {
            try {
                // 수식 렌더링 시도
                window.MathJax.typesetPromise([answerDiv])
                    .then(() => {
                        console.log('MathJax 렌더링 완료');
                    })
                    .catch(err => {
                        console.error('MathJax 렌더링 오류:', err);
                        // 오류 발생 시 fallback 시도
                        setTimeout(() => {
                            try {
                                window.MathJax.typeset([answerDiv]);
                            } catch (e2) {
                                console.error('MathJax fallback 처리 중 오류:', e2);
                            }
                        }, 100); // 짧은 지연 후 fallback
                    });
            } catch (e) {
                console.error('MathJax 처리 중 오류:', e);
                 // 오류 발생 시 fallback 시도
                 setTimeout(() => {
                    try {
                        window.MathJax.typeset([answerDiv]);
                    } catch (e2) {
                        console.error('MathJax fallback 처리 중 오류:', e2);
                    }
                }, 100); // 짧은 지연 후 fallback
            }
        }
    }
});
