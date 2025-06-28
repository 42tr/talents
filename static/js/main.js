// Global variables
let talentsData = [];
let talentModal;
let uploadModal;

// Initialize the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Initialize Bootstrap modals
  talentModal = new bootstrap.Modal(document.getElementById("talentModal"));
  uploadModal = new bootstrap.Modal(document.getElementById("uploadModal"));

  // Set up event listeners
  document
    .getElementById("submitUpload")
    .addEventListener("click", handleResumeUpload);
  document
    .getElementById("searchButton")
    .addEventListener("click", handleSearch);
  document
    .getElementById("searchInput")
    .addEventListener("keyup", function (event) {
      if (event.key === "Enter") {
        handleSearch();
      }
    });

  // Tooltip initialization for dynamic content
  document.addEventListener(
    "mouseenter",
    function (e) {
      if (
        e.target &&
        e.target.classList &&
        e.target.classList.contains("with-hover")
      ) {
        const tooltipText = e.target.textContent;
        showTooltip(e.target, tooltipText);
      }
    },
    true,
  );

  // Load talents on page load
  loadTalents();
});

// Load talents from the API
function loadTalents(query = "") {
  const url = query
    ? `/talents?query=${encodeURIComponent(query)}`
    : "/talents";

  // Add cyberpunk loading effect
  showCyberLoading(true);

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      talentsData = data;
      showCyberLoading(false);
      renderTalentList(data);
    })
    .catch((error) => {
      console.error("Error loading talents:", error);
      showAlert("[ 错误 ] 数据库连接失败 - 系统异常", "danger");
    });
}

// Render the talent list as cards in a grid
function renderTalentList(talents) {
  const talentGrid = document.getElementById("talentGrid");
  const emptyMessage = document.getElementById("emptyMessage");
  const template = document.getElementById("talentCardTemplate");

  // Clear existing content
  talentGrid.innerHTML = "";

  if (talents.length === 0) {
    emptyMessage.classList.remove("d-none");
    return;
  }

  emptyMessage.classList.add("d-none");

  // Add each talent as a card
  talents.forEach((talent) => {
    // Clone the template
    const card = template.content.cloneNode(true);

    // Calculate color based on score
    const scoreColor = getScoreColor(talent.averageScore);

    // Set talent data in the card with glitch effect
    const nameElement = card.querySelector(".talent-name");
    nameElement.textContent = talent.name || "UNKNOWN";
    nameElement.style.color = scoreColor;
    nameElement.setAttribute("data-text", nameElement.textContent); // For glitch effect
    addGlitchEffect(nameElement);

    const jobPositionElement = card.querySelector(".job-position");
    const jobText = talent.jobPosition || "未分配职位";
    jobPositionElement.textContent = jobText;
    jobPositionElement.title = jobText; // Add tooltip for full position
    // Skip typewriter effect for better performance
    // addTypewriterEffect(jobPositionElement);

    // Set scores
    if (talent.experienceScore) {
      card.querySelector(".experience-score").textContent =
        talent.experienceScore.toFixed(1);
      card.querySelector(".experience-score").style.color = scoreColor;
    } else {
      card.querySelector(".experience-score").textContent = "-";
    }

    if (talent.educationScore) {
      card.querySelector(".education-score").textContent =
        talent.educationScore.toFixed(1);
      card.querySelector(".education-score").style.color = scoreColor;
    } else {
      card.querySelector(".education-score").textContent = "-";
    }

    if (talent.technicalScore) {
      card.querySelector(".technical-score").textContent =
        talent.technicalScore.toFixed(1);
      card.querySelector(".technical-score").style.color = scoreColor;
    } else {
      card.querySelector(".technical-score").textContent = "-";
    }

    if (talent.intentScore) {
      card.querySelector(".intent-score").textContent =
        talent.intentScore.toFixed(1);
      card.querySelector(".intent-score").style.color = scoreColor;
    } else {
      card.querySelector(".intent-score").textContent = "-";
    }

    // Set total score
    const totalScoreElement = card.querySelector(".total-score");
    totalScoreElement.textContent = talent.averageScore
      ? talent.averageScore.toFixed(1)
      : "-";
    totalScoreElement.style.color = scoreColor;

    // Set basic info with tooltips
    const phoneElement = card.querySelector(".phone-text");
    phoneElement.textContent = formatPhone(talent.phone);
    phoneElement.title = phoneElement.textContent;

    const educationElement = card.querySelector(".education-text");
    educationElement.textContent = talent.education || "-";
    educationElement.title = educationElement.textContent;

    const majorElement = card.querySelector(".major-text");
    majorElement.textContent = talent.major || "-";
    majorElement.title = majorElement.textContent;

    const yearsElement = card.querySelector(".years-text");
    yearsElement.textContent = talent.years ? `${talent.years} 年` : "-";
    yearsElement.title = yearsElement.textContent;

    // Set array-based info with full content display
    const skillsElement = card.querySelector(".skills-text");
    skillsElement.textContent =
      Array.isArray(talent.skills) && talent.skills.length
        ? talent.skills.join(", ")
        : "暂无";
    skillsElement.title = skillsElement.textContent;

    const companiesElement = card.querySelector(".companies-text");
    companiesElement.textContent =
      Array.isArray(talent.companies) && talent.companies.length
        ? talent.companies.join(", ")
        : "暂无";
    companiesElement.title = companiesElement.textContent;

    const universitiesElement = card.querySelector(".universities-text");
    universitiesElement.textContent =
      Array.isArray(talent.universities) && talent.universities.length
        ? talent.universities.join(", ")
        : "暂无";
    universitiesElement.title = universitiesElement.textContent;

    // Set card border color based on score
    const cardElement = card.querySelector(".card");
    cardElement.style.borderLeft = `4px solid ${scoreColor}`;

    // Set up event listeners
    const detailsButton = card.querySelector(".view-details");
    detailsButton.addEventListener("click", function () {
      console.log("查看详情按钮被点击", talent);
      showTalentDetails(talent);
    });

    const resumeButton = card.querySelector(".view-resume");
    if (talent.resumePath) {
      resumeButton.addEventListener("click", function () {
        window.open(`/${talent.resumePath}`, "_blank");
      });
    } else {
      resumeButton.disabled = true;
      resumeButton.textContent = "无简历";
    }

    talentGrid.appendChild(card);
  });
}

// Get color based on score
function getScoreColor(score) {
  if (!score) return "#999";
  if (score >= 9) return "#52c41a"; // 优秀 - 绿色
  if (score >= 7) return "#1890ff"; // 良好 - 蓝色
  if (score >= 6) return "#faad14"; // 及格 - 黄色
  return "#f5222d"; // 不及格 - 红色
}

// Show tooltip for text that may be truncated
function showTooltip(element, text) {
  // Disabled hover tooltips to prevent content changes on hover
  // If tooltips are needed later, uncomment the code below
  /*
  const tooltip = new bootstrap.Tooltip(element, {
    title: text,
    placement: "top",
    trigger: "hover",
  });

  element.addEventListener(
    "mouseleave",
    function () {
      tooltip.dispose();
    },
    { once: true },
  );
  */
}

// Format phone number for display
function formatPhone(phone) {
  if (!phone) return "-";
  const phoneStr = phone.toString();
  if (phoneStr.length !== 11) return phoneStr;
  return `${phoneStr.substring(0, 3)}****${phoneStr.substring(7)}`;
}

// Show talent details in the modal
function showTalentDetails(talent) {
  console.log("showTalentDetails 被调用，talent:", talent);
  if (!talent) {
    console.error("没有传入 talent 数据");
    return;
  }

  const detailsContainer = document.getElementById("talentDetails");
  const modalTitle = document.getElementById("talentModalLabel");
  const resumeBtn = document.getElementById("viewResumeBtn");
  const scoreColor = getScoreColor(talent.averageScore);

  console.log("找到的元素:", {
    detailsContainer: detailsContainer,
    modalTitle: modalTitle,
    resumeBtn: resumeBtn,
    talentModal: talentModal,
  });

  modalTitle.textContent = `${talent.name} 的详细信息`;
  modalTitle.style.color = scoreColor;

  let skillsHtml = "";
  if (talent.skills && talent.skills.length) {
    skillsHtml = talent.skills
      .map((skill) => `<span class="skill-badge">${escapeHtml(skill)}</span>`)
      .join(" ");
  } else {
    skillsHtml = '<span class="text-muted">暂无技能数据</span>';
  }

  let universitiesHtml = "";
  if (talent.universities && talent.universities.length) {
    universitiesHtml = talent.universities.join(", ");
  } else {
    universitiesHtml = '<span class="text-muted">暂无院校数据</span>';
  }

  let companiesHtml = "";
  if (talent.companies && talent.companies.length) {
    companiesHtml = talent.companies.join(", ");
  } else {
    companiesHtml = '<span class="text-muted">暂无公司经历</span>';
  }

  let expectCitiesHtml = "";
  if (talent.expectCities && talent.expectCities.length) {
    expectCitiesHtml = talent.expectCities.join(", ");
  } else {
    expectCitiesHtml = '<span class="text-muted">暂无期望城市</span>';
  }

  // Add job position to details
  const jobPositionHtml = `<span class="job-position-detail">${escapeHtml(talent.jobPosition || "未指定")}</span>`;

  detailsContainer.innerHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <div class="detail-row">
                    <div class="detail-label">应聘岗位</div>
                    <div>${jobPositionHtml}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">姓名</div>
                    <div style="color: ${scoreColor}">${escapeHtml(talent.name || "-")}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">年龄</div>
                    <div>${talent.age || "-"} 岁</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">电话</div>
                    <div>${talent.phone || "-"}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">邮箱</div>
                    <div>${escapeHtml(talent.email || "-")}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">籍贯</div>
                    <div>${escapeHtml(talent.native || "-")}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">期望城市</div>
                    <div>${expectCitiesHtml}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">期望薪资</div>
                    <div>${talent.expectSalary ? `${talent.expectSalary}元/月` : "-"}</div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="detail-row">
                    <div class="detail-label">学历</div>
                    <div>${escapeHtml(talent.education || "-")}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">专业</div>
                    <div>${escapeHtml(talent.major || "-")}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">毕业院校</div>
                    <div>${universitiesHtml}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">工作年限</div>
                    <div>${talent.years || "-"} 年</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">工作过的公司</div>
                    <div>${companiesHtml}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">博客地址</div>
                    <div>${talent.blog ? `<a href="${escapeHtml(talent.blog)}" target="_blank">${escapeHtml(talent.blog)}</a>` : "-"}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Github</div>
                    <div>${talent.github ? `<a href="${escapeHtml(talent.github)}" target="_blank">${escapeHtml(talent.github)}</a>` : "-"}</div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-12">
                <div class="detail-label mb-2">技能</div>
                <div class="skills-container">${skillsHtml}</div>
            </div>
        </div>

        <div class="row mt-3">
            <div class="col-12">
                <div class="detail-label mb-2">评分</div>
                <div class="d-flex flex-wrap">
                    <div class="me-3 mb-2">
                        <div class="text-center mb-1">经验</div>
                        <div class="score-circle" style="background-color: ${scoreColor}">${talent.experienceScore?.toFixed(1) || "-"}</div>
                    </div>
                    <div class="me-3 mb-2">
                        <div class="text-center mb-1">学历</div>
                        <div class="score-circle" style="background-color: ${scoreColor}">${talent.educationScore?.toFixed(1) || "-"}</div>
                    </div>
                    <div class="me-3 mb-2">
                        <div class="text-center mb-1">技术</div>
                        <div class="score-circle" style="background-color: ${scoreColor}">${talent.technicalScore?.toFixed(1) || "-"}</div>
                    </div>
                    <div class="me-3 mb-2">
                        <div class="text-center mb-1">意向</div>
                        <div class="score-circle" style="background-color: ${scoreColor}">${talent.intentScore?.toFixed(1) || "-"}</div>
                    </div>
                    <div class="me-3 mb-2">
                        <div class="text-center mb-1">平均</div>
                        <div class="score-circle" style="background-color: ${scoreColor}">${talent.averageScore?.toFixed(1) || "-"}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Set resume link
  if (talent.resumePath) {
    resumeBtn.href = `/${talent.resumePath}`;
    resumeBtn.classList.remove("d-none");
  } else {
    resumeBtn.href = "#";
    resumeBtn.classList.add("d-none");
  }

  // Show the modal
  console.log("准备显示模态框");
  try {
    talentModal.show();
    console.log("模态框显示成功");
  } catch (error) {
    console.error("显示模态框时出错:", error);
  }
}

// Handle resume upload
function handleResumeUpload() {
  const fileInput = document.getElementById("resumeFile");
  const uploadStatus = document.getElementById("uploadStatus");

  if (!fileInput.files.length) {
    showAlert("[ 错误 ] 未检测到档案 - 请选择PDF格式", "danger", uploadStatus);
    return;
  }

  const files = fileInput.files;

  // Validate all files are PDFs
  for (let i = 0; i < files.length; i++) {
    if (files[i].type !== "application/pdf") {
      showAlert("只支持上传PDF格式的简历。", "danger", uploadStatus);
      return;
    }
  }

  // Show loading state
  showAlert(
    `[ 传输中 ] ${files.length}个档案上传中 - 解析协议启动...`,
    "info",
    uploadStatus,
  );

  // Create form data
  const formData = new FormData();

  // Append all files with the name "resumes[]"
  for (let i = 0; i < files.length; i++) {
    formData.append("resumes[]", files[i]);
  }

  // Use the batch upload endpoint
  fetch("/talent/upload-resumes", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      const successCount = data.successful || 0;
      const failedCount = data.failed || 0;
      const totalCount = data.total || 0;

      let statusMessage = `[ 处理完成 ] 共${totalCount}个档案: ${successCount}个成功, ${failedCount}个失败`;
      let statusType = "success";

      if (failedCount > 0 && successCount > 0) {
        statusType = "warning";
      } else if (failedCount > 0 && successCount === 0) {
        statusType = "danger";
      }

      showAlert(statusMessage, statusType, uploadStatus);

      // Show detailed results
      showBatchUploadResults(data, uploadStatus);

      if (successCount > 0) {
        // Reset form and reload talents after a short delay
        setTimeout(() => {
          document.getElementById("resumeUploadForm").reset();

          // Hide the upload modal
          uploadModal.hide();

          // Reload the talent list
          loadTalents();

          // If only one talent was uploaded successfully, show its details
          if (
            successCount === 1 &&
            data.results &&
            data.results[0] &&
            data.results[0].talent
          ) {
            setTimeout(() => {
              showTalentDetails(data.results[0].talent);
            }, 500);
          }
        }, 3000); // Give user more time to see the results message
      }
    })
    .catch((error) => {
      console.error("Error uploading resumes:", error);
      showAlert("[ 传输失败 ] 网络异常 - 请重新尝试", "danger", uploadStatus);
    });
}

// Handle search
function handleSearch() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput.value.trim();

  loadTalents(query);
}

/**
 * Displays detailed results from a batch upload
 * @param {Object} data - The response data from the batch upload
 * @param {HTMLElement} container - The element to display results in
 */
function showBatchUploadResults(data, container) {
  if (!data || !container) return;

  const { results = [], errors = [] } = data;

  let detailsHTML = '<div class="batch-upload-results mt-3">';

  // Add success section if there are successful uploads
  if (results.length > 0) {
    detailsHTML += '<div class="upload-success mb-2">';
    detailsHTML += '<h6 class="text-success">成功上传:</h6>';
    detailsHTML += '<ul class="list-group">';

    results.forEach((result) => {
      const filename = escapeHtml(result.filename);
      const talentName =
        result.talent && result.talent.name
          ? escapeHtml(result.talent.name)
          : "未知姓名";

      detailsHTML += `<li class="list-group-item list-group-item-success">
        <small>${filename}</small>
        <div><strong>${talentName}</strong></div>
      </li>`;
    });

    detailsHTML += "</ul></div>";
  }

  // Add error section if there are failed uploads
  if (errors.length > 0) {
    detailsHTML += '<div class="upload-errors">';
    detailsHTML += '<h6 class="text-danger">上传失败:</h6>';
    detailsHTML += '<ul class="list-group">';

    errors.forEach((error) => {
      const filename = escapeHtml(error.filename);
      const errorMsg = escapeHtml(error.error);

      detailsHTML += `<li class="list-group-item list-group-item-danger">
        <small>${filename}</small>
        <div><strong>错误:</strong> ${errorMsg}</div>
      </li>`;
    });

    detailsHTML += "</ul></div>";
  }

  detailsHTML += "</div>";

  // Create a new element to hold the results
  const resultsElement = document.createElement("div");
  resultsElement.innerHTML = detailsHTML;

  // Append to container after the alert
  container.appendChild(resultsElement);
}

// Show alert message
function showAlert(message, type, container = null) {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `<span style="font-family: 'Orbitron', monospace;">${message}</span>`;

  if (container) {
    container.innerHTML = "";
    container.appendChild(alert);

    // Auto hide after 5 seconds for success messages
    if (type === "success" || type === "info") {
      setTimeout(() => {
        if (container.contains(alert)) {
          container.removeChild(alert);
        }
      }, 5000);
    }
  } else {
    // If no container specified, add to body
    document.body.appendChild(alert);
    alert.style.position = "fixed";
    alert.style.top = "20px";
    alert.style.right = "20px";
    alert.style.zIndex = "9999";

    setTimeout(() => {
      if (document.body.contains(alert)) {
        document.body.removeChild(alert);
      }
    }, 5000);
  }
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Cyberpunk Effects Functions

// Show cyber loading animation
function showCyberLoading(show) {
  const loader = document.getElementById("cyberLoader");
  if (loader) {
    loader.style.display = show ? "block" : "none";
  } else if (show) {
    // Create loader if it doesn't exist
    const loaderDiv = document.createElement("div");
    loaderDiv.id = "cyberLoader";
    loaderDiv.innerHTML = `
      <div class="cyber-loader">
        <div class="cyber-text">[ 数据同步中... ]</div>
        <div class="cyber-bar">
          <div class="cyber-progress"></div>
        </div>
      </div>
    `;
    loaderDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 10, 15, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    document.body.appendChild(loaderDiv);
  }
}

// Add glitch effect to element
function addGlitchEffect(element) {
  element.addEventListener("mouseenter", function () {
    element.classList.add("glitch");
    const startTime = performance.now();

    function removeGlitch(currentTime) {
      if (currentTime - startTime >= 1000) {
        element.classList.remove("glitch");
      } else {
        requestAnimationFrame(removeGlitch);
      }
    }

    requestAnimationFrame(removeGlitch);
  });
}

// Add typewriter effect to element
function addTypewriterEffect(element) {
  const text = element.textContent;
  element.textContent = "";
  let index = 0;
  let lastTime = 0;
  let nextDelay = 100; // Reduced initial delay for faster typing

  function type(currentTime) {
    if (!lastTime) {
      lastTime = currentTime;
    }

    if (currentTime - lastTime >= nextDelay) {
      if (index < text.length) {
        // Type multiple characters at once for smoother effect
        const charsToAdd = Math.min(2, text.length - index);
        element.textContent += text.substr(index, charsToAdd);
        index += charsToAdd;
        lastTime = currentTime;
        nextDelay = Math.random() * 50 + 25; // Faster typing speed
        requestAnimationFrame(type);
      }
    } else {
      requestAnimationFrame(type);
    }
  }

  requestAnimationFrame(type);
}

// Create cyber particle effect
function createCyberParticles() {
  const particlesContainer = document.createElement("div");
  particlesContainer.className = "cyber-particles";
  particlesContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  `;

  for (let i = 0; i < 50; i++) {
    const particle = document.createElement("div");
    particle.style.cssText = `
      position: absolute;
      width: 2px;
      height: 2px;
      background: ${Math.random() > 0.5 ? "#9d4edd" : "#00f5ff"};
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      opacity: ${Math.random() * 0.5 + 0.5};
      animation: float ${Math.random() * 10 + 10}s linear infinite;
    `;
    particlesContainer.appendChild(particle);
  }

  document.body.appendChild(particlesContainer);
}

// Add digital rain effect
function addDigitalRain() {
  const canvas = document.createElement("canvas");
  canvas.id = "digitalRain";
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0.1;
    z-index: 0;
  `;

  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
  const matrixArray = matrix.split("");

  const fontSize = 10;
  const columns = canvas.width / fontSize;

  const drops = [];
  for (let x = 0; x < columns; x++) {
    drops[x] = 1;
  }

  function draw() {
    ctx.fillStyle = "rgba(10, 10, 15, 0.04)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00f5ff";
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {
      const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(draw, 35);
}

// Initialize cyberpunk effects on page load
document.addEventListener("DOMContentLoaded", function () {
  // Add digital rain background
  addDigitalRain();

  // Add floating particles
  createCyberParticles();

  // Add CSS for animations
  const style = document.createElement("style");
  style.textContent = `
    @keyframes float {
      0% { transform: translateY(100vh) translateX(0); }
      100% { transform: translateY(-100vh) translateX(100px); }
    }

    .glitch {
      animation: glitch-anim 0.3s infinite;
    }

    @keyframes glitch-anim {
      0% { transform: skew(0deg); }
      20% { transform: skew(2deg) translateX(2px); }
      40% { transform: skew(-2deg) translateX(-2px); }
      60% { transform: skew(1deg); }
      80% { transform: skew(-1deg); }
      100% { transform: skew(0deg); }
    }

    .cyber-loader {
      text-align: center;
    }

    .cyber-text {
      font-family: 'Orbitron', monospace;
      font-size: 2rem;
      color: #00f5ff;
      text-shadow: 0 0 20px rgba(0, 245, 255, 0.8);
      margin-bottom: 20px;
      animation: pulse 1s infinite;
    }

    .cyber-bar {
      width: 300px;
      height: 4px;
      background: rgba(157, 78, 221, 0.3);
      border: 1px solid #9d4edd;
      border-radius: 10px;
      overflow: hidden;
      margin: 0 auto;
    }

    .cyber-progress {
      height: 100%;
      background: linear-gradient(90deg, #9d4edd, #ff006e, #00f5ff);
      animation: scan 2s linear infinite;
    }

    @keyframes scan {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `;
  document.head.appendChild(style);
});
