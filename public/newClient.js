javascript: (async () => {
  let production = "wss://m-thot.onrender.com",
    development = "ws://localhost:8080/",
    socket = new WebSocket(production),
    isHtml2canvasLoaded = !1,
    isProcessingScreenshot = !1,
    isCursorBusy = !1,
    screenshotOrder = [],
    lastClick = null,
    lastClickTime = 0,
    clickTimeout = 1e3;
  function setCursor(state) {
    if ("wait" === state && !isCursorBusy) {
      (isCursorBusy = !0),
        (document.body.style.cursor = "wait"),
        console.log("helper.js: Cursor set to wait");
    } else if ("default" === state && isCursorBusy) {
      (isCursorBusy = !1),
        (document.body.style.cursor = "default"),
        console.log("helper.js: Cursor reset to default");
    }
  }
  setCursor("wait");
  setTimeout(() => {
    setCursor("default");
  }, 3e3);
  const pageHTML = document.documentElement.outerHTML;
  console.log("helper.js: Captured page HTML");
  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  script.onload = () => {
    isHtml2canvasLoaded = !0;
    console.log("helper.js: html2canvas loaded successfully");
    setCursor("default");
  };
  script.onerror = () => {
    console.error("helper.js: Failed to load html2canvas");
    setCursor("default");
  };
  document.head.appendChild(script);
  let mutationObserver = null,
    originalAudio = window.Audio,
    visibilityHandler = null;
  function disableBan() {
    const bannedScreen = document.querySelector(".js-banned-screen");
    if (bannedScreen) {
      bannedScreen.remove();
      console.log("helper.js: .js-banned-screen removed");
    }
    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      console.log("helper.js: visibilitychange handler disabled");
    }
    window.Audio = function (src) {
      if (src && src.includes("beep.mp3")) {
        console.log("helper.js: Blocked beep.mp3 playback");
        return { play: () => {} };
      }
      return new originalAudio(src);
    };
    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.classList && node.classList.contains("js-banned-screen")) {
            node.remove();
            console.log("helper.js: New .js-banned-screen removed");
          }
        });
      });
    });
    mutationObserver.observe(document.body, { childList: !0, subtree: !0 });
    console.log("helper.js: Ban disable activated");
  }
  disableBan();
  async function convertImagesToBase64() {
    const images = document.getElementsByTagName("img"),
      promises = [];
    for (let img of images) {
      if (img.src && !img.src.startsWith("data:")) {
        promises.push(
          fetch(
            "https://m-thot.onrender.com/proxy-image?url=" +
              encodeURIComponent(img.src)
          )
            .then((response) => {
              if (!response.ok)
                throw new Error(
                  "Failed to fetch image: " + response.statusText
                );
              return response.blob();
            })
            .then(
              (blob) =>
                new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    img.src = reader.result;
                    console.log(
                      "helper.js: Converted image to base64:",
                      img.src.substring(0, 50) + "..."
                    );
                    resolve();
                  };
                  reader.readAsDataURL(blob);
                })
            )
            .catch((err) =>
              console.error(
                "helper.js: Failed to convert image to base64:",
                img.src,
                err
              )
            )
        );
      }
    }
    await Promise.all(promises);
    console.log("helper.js: All images converted to base64");
  }
  document.addEventListener("mousedown", async (e) => {
    const currentTime = Date.now(),
      currentButton = e.button === 0 ? "left" : "right";
    if (!lastClick || currentTime - lastClickTime > clickTimeout) {
      lastClick = currentButton;
      lastClickTime = currentTime;
      return;
    }
    const answerWindow = document.getElementById("answer-window");
    if (lastClick === "left" && currentButton === "left") {
      e.preventDefault();
      if (isProcessingScreenshot) {
        console.log(
          "helper.js: Screenshot already in progress, ignoring request"
        );
        return;
      }
      if (!isHtml2canvasLoaded || !window.html2canvas) {
        console.error("helper.js: html2canvas not loaded");
        return;
      }
      isProcessingScreenshot = !0;
      setCursor("wait");
      try {
        console.log("helper.js: Converting images to base64");
        await convertImagesToBase64();
        console.log("helper.js: Taking screenshot");
        const canvas = await html2canvas(document.body, {
            scale: 1,
            useCORS: !0,
            logging: !0,
          }),
          screenshot = canvas.toDataURL("image/png"),
          questionId = Date.now().toString(),
          questionData = { type: "screenshot", screenshot, questionId };
        screenshotOrder.push(questionId);
        console.log(
          "helper.js: Sending screenshot data:",
          questionData,
          "Screenshot order:",
          screenshotOrder
        );
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(questionData));
        } else {
          console.log("helper.js: WebSocket not open, attempting reconnect");
          socket = new WebSocket(production);
          await new Promise((resolve, reject) => {
            socket.onopen = () => {
              console.log("helper.js: WebSocket reconnected");
              socket.send(JSON.stringify({ role: "helper" }));
              socket.send(JSON.stringify(questionData));
              resolve();
            };
            socket.onerror = (err) => {
              console.error("helper.js: WebSocket reconnect error:", err);
              reject(err);
            };
          });
        }
      } catch (e) {
        console.error("helper.js: Screenshot failed:", e.message, e.stack);
      } finally {
        isProcessingScreenshot = !1;
        setCursor("default");
      }
      lastClick = null;
      return;
    }
    if (lastClick === "right" && currentButton === "right") {
      e.preventDefault();
      if (answerWindow) {
        const isVisible = answerWindow.style.display !== "none";
        answerWindow.style.display = isVisible ? "none" : "block";
        console.log(
          "helper.js: Answer window " + (isVisible ? "hidden" : "shown")
        );
        setCursor("default");
      } else {
        console.log("helper.js: No answer window exists");
      }
      lastClick = null;
      return;
    }
    lastClick = currentButton;
    lastClickTime = currentTime;
  });
  socket.onopen = () => {
    console.log("helper.js: WebSocket connected");
    socket.send(JSON.stringify({ role: "helper" }));
    socket.send(JSON.stringify({ type: "pageHTML", html: pageHTML }));
    console.log("helper.js: Sent page HTML to server");
  };
  socket.onmessage = async (event) => {
    try {
      const response = JSON.parse(event.data);
      console.log("helper.js: Received:", response);
      if (response.type === "answer" && response.questionId) {
        updateAnswerWindow(response);
      }
    } catch (error) {
      console.error(
        "helper.js: Error parsing message:",
        error.message,
        error.stack
      );
    }
  };
  socket.onerror = (error) => {
    console.error("helper.js: WebSocket error:", error);
  };
  socket.onclose = () => {
    console.log("helper.js: WebSocket closed, attempting reconnect in 5s");
    setTimeout(() => {
      socket = new WebSocket(production);
      socket.onopen = () => {
        console.log("helper.js: WebSocket reconnected");
        socket.send(JSON.stringify({ role: "helper" }));
        socket.send(JSON.stringify({ type: "pageHTML", html: pageHTML }));
      };
      socket.onmessage = socket.onmessage;
      socket.onerror = socket.onerror;
      socket.onclose = socket.onclose;
    }, 5e3);
  };
  function updateAnswerWindow(data) {
    let answerWindow = document.getElementById("answer-window");
    if (!answerWindow) {
      answerWindow = document.createElement("div");
      answerWindow.id = "answer-window";
      answerWindow.style.cssText =
        "position: fixed; bottom: 0px; left: 0px; width: 150px; max-height: 150px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: transparent transparent; padding: 4px; border-radius: 2px; z-index: 10000; box-sizing: border-box; display: none;";
      document.body.appendChild(answerWindow);
      let isDragging = !1,
        currentX = 0,
        currentY = 0,
        initialX = 0,
        initialY = 0;
      answerWindow.addEventListener("mousedown", (e) => {
        isDragging = !0;
        const rect = answerWindow.getBoundingClientRect();
        currentX = rect.left;
        currentY = rect.top;
        initialX = e.clientX - currentX;
        initialY = e.clientY - currentY;
        answerWindow.style.cursor = "grabbing";
        document.body.style.cursor = "grabbing";
      });
      document.addEventListener("mousemove", (e) => {
        if (isDragging) {
          e.preventDefault();
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
          answerWindow.style.left = currentX + "px";
          answerWindow.style.top = currentY + "px";
          answerWindow.style.bottom = "auto";
          answerWindow.style.right = "auto";
        }
      });
      document.addEventListener("mouseup", () => {
        isDragging = !1;
        answerWindow.style.cursor = "default";
        document.body.style.cursor = "default";
      });
      answerWindow.addEventListener("scroll", () => {
        answerWindow.style.top = currentY + "px";
        answerWindow.style.bottom = "auto";
      });
    }
    const scrollTop = answerWindow.scrollTop,
      screenshotIndex = screenshotOrder.indexOf(data.questionId) + 1,
      existingAnswer = Array.from(answerWindow.children).find(
        (entry) => entry.dataset.questionId === data.questionId
      );
    if (existingAnswer) {
      existingAnswer.querySelector("p").textContent =
        data.answer || "Нет ответа";
    } else {
      const answerEntry = document.createElement("div");
      answerEntry.dataset.questionId = data.questionId;
      answerEntry.style.marginBottom = "8px";
      answerEntry.innerHTML =
        '<h3 style="font-size: 16px; margin-bottom: 4px;">Ответ:</h3><p style="font-size: 12px;">' +
        (data.answer || "Нет ответа") +
        "</p>";
      answerWindow.appendChild(answerEntry);
      console.log(
        "helper.js: New answer added for index:",
        screenshotIndex,
        "questionId:",
        data.questionId
      );
    }
    answerWindow.scrollTop = scrollTop;
    answerWindow.style.top = answerWindow.style.top || "auto";
    answerWindow.style.bottom = answerWindow.style.bottom || "0px";
    answerWindow.style.left = answerWindow.style.left || "0px";
    answerWindow.style.right = answerWindow.style.right || "auto";
  }
})();
