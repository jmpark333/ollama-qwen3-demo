// main.js (2025-05-01 13:23:00) 스트리밍 응답 처리 (EventSource 사용)
document.addEventListener("DOMContentLoaded", function() {
    const questionCards = document.querySelectorAll(".qa-card");
    let currentEventSource = null; // 현재 활성화된 EventSource 추적
    questionCards.forEach(function(card, idx) {
        const qDiv = card.querySelector(".question");
        qDiv.style.cursor = "pointer";
        qDiv.title = "클릭해서 답변 확인";

        qDiv.addEventListener("click", function() {
            // 기존 EventSource가 있으면 닫기
            if (currentEventSource) {
                currentEventSource.close();
                console.log("Previous EventSource closed.");
            }
            const answerDiv = card.querySelector(".answer");
            answerDiv.innerHTML = '<span style="color:#888;">답변 스트리밍 시작...</span>';
            answerDiv.style.cssText = ''; // 기존 인라인 스타일 제거
            answerDiv.classList.add('answer-streaming'); // 스트리밍 중 클래스 추가 (옵션)

            // EventSource 생성 (GET 요청 사용)
            const url = `/api/answer?idx=${idx}`;
            const eventSource = new EventSource(url);
            currentEventSource = eventSource; // 현재 EventSource 추적
            console.log(`EventSource created for question ${idx}: ${url}`);

            let fullContent = ""; // 전체 내용을 누적할 변수
            let thinkingContent = ""; // 생각 과정 내용을 누적할 변수
            let isThinking = false; // 현재 생각 과정 처리 중인지 여부
            
            eventSource.onopen = function() {
                console.log(`EventSource connection opened for question ${idx}.`);
                answerDiv.innerHTML = ''; // 연결되면 로딩 메시지 제거
            };

            eventSource.onmessage = function(event) {
                const data = event.data;
                console.log("Received data:", data);

                if (data === "[STREAM_START]") {
                    console.log("Stream started.");
                    fullContent = ""; // 스트림 시작 시 내용 초기화
                    answerDiv.innerHTML = ''; // 내용 초기화
                    return;
                }

                if (data === "[DONE]") {
                    console.log("Stream finished.");
                    eventSource.close();
                    currentEventSource = null; // 추적 종료
                    answerDiv.classList.remove('answer-streaming'); // 스트리밍 완료 클래스 제거

                    // 스트림 종료 후 최종 마크다운 처리 및 스타일 적용
                    renderFinalContent(answerDiv, fullContent);
                    return;
                }

                // 오류 메시지 처리
                if (data.startsWith("[HTTP 오류]") || data.startsWith("[예외]") || data.startsWith("[처리 오류]") || data.startsWith("[오류]")) {
                    answerDiv.innerHTML = `<span style="color:red;">${data}</span>`;
                    eventSource.close(); // 오류 발생 시 연결 종료
                    currentEventSource = null;
                    answerDiv.classList.remove('answer-streaming');
                    return;
                }

                try {
                    let rawData = event.data; // 서버에서 받은 원본 데이터
                    // 'data: ' 접두사 제거 (혹시 있을 경우)
                    const dataPrefix = "data: ";
                    if (rawData.startsWith(dataPrefix)) {
                        rawData = rawData.substring(dataPrefix.length).trim();
                    }
                    // 빈 데이터 무시
                    if (!rawData) {
                        console.warn("Ignoring empty data after prefix removal.");
                        return;
                    }
                    // 2025-05-01 13:40:30 JSON 파싱 제거, 텍스트만 누적
                    fullContent += rawData;
                    // 실시간 임시 표시 (HTML 엔티티 이스케이프 - 템플릿 리터럴 사용)
                    const tempHtml = fullContent
                        .replace(/&/g, "&amp;")   // & -> &amp;
                        .replace(/</g, "&lt;")    // < -> &lt;
                        .replace(/>/g, "&gt;")    // > -> &gt;
                        .replace(/"/g, "&quot;")  // " -> &quot; (템플릿 리터럴 사용)
                        .replace(/'/g, "&#039;")  // ' -> &#039;
                        .replace(/\n/g, '<br>');  // 개행 -> <br>
                    answerDiv.innerHTML = tempHtml;
                } catch (e) {
                    console.error("스트림 데이터 처리 오류:", e); // 2025-05-01 13:40:30
                    answerDiv.innerHTML = `<span style="color:red;">[오류] 데이터 처리 오류: ${e.message}</span>`;
                    return;
                }
            };

            eventSource.onerror = function(error) {
                console.error("EventSource error:", error);
                answerDiv.innerHTML = `<span style="color:red;">[오류] 스트리밍 중 오류가 발생했습니다: ${error.message}</span>`;
                eventSource.close();
                currentEventSource = null;
                answerDiv.classList.remove('answer-streaming');
            };
        });
    });

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
