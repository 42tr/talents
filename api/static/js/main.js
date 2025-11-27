// Global variables
let talentsData = [];
let talentModal;
let uploadModal;
let recalculateModal;
let pdfCache = new Map(); // PDF缓存
let currentPdfUrl = null; // 当前PDF URL
let pdfDoc = null; // PDF文档对象
let pageNum = 1; // 当前页码
let pageRendering = false; // 是否正在渲染
let pageNumPending = null; // 待渲染页码
let scale = 1.0; // 缩放比例
let renderedPages = new Map(); // 已渲染的页面缓存
let visiblePages = new Set(); // 当前可见的页面
let currentPage = 1; // 当前滚动到的页面

// Auto-save interview record with debouncing
function setupAutoSaveInterviewRecord(talent) {
  const textarea = document.getElementById("interviewRecordText");
  const statusElement = document.getElementById("interviewRecordStatus");

  if (!textarea || !statusElement) return;

  let saveTimeout = null;
  let isSaving = false;
  let lastSavedContent = textarea.value;
  let pendingSave = false;

  // Function to update status display
  function updateStatus(message, type = "muted") {
    statusElement.innerHTML = message;
    statusElement.className = `small mt-1 ${type === "success" ? "text-success" :
      type === "warning" ? "text-warning" :
      type === "danger" ? "text-danger" : "text-muted"}`;
  }

  // Function to save interview record
  function saveInterviewRecord() {
    if (isSaving) {
      pendingSave = true;
      return;
    }

    const currentContent = textarea.value;

    // Check if content actually changed
    if (currentContent === lastSavedContent) {
      updateStatus('<i class="bi bi-check-circle"></i> 已保存');
      return;
    }

    // Validate input length
    if (currentContent.length > 10000) {
      updateStatus('<i class="bi bi-exclamation-triangle"></i> 内容过长（超过10000字）', 'danger');
      return;
    }

    isSaving = true;
    pendingSave = false;
    updateStatus('<i class="bi bi-arrow-repeat spinning"></i> 保存中...', 'warning');

    // Call API to save interview record with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    fetch(`/talent/${talent.phone}/interview-record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ interviewRecord: currentContent }),
      signal: controller.signal,
    })
      .then((response) => {
        clearTimeout(timeoutId);

        if (!response.ok) {
          // Different error handling based on status code
          if (response.status === 404) {
            throw new Error("找不到该人才信息");
          } else if (response.status === 400) {
            throw new Error("请求数据无效");
          } else if (response.status === 500) {
            throw new Error("服务器错误，请稍后再试");
          } else {
            throw new Error(`保存失败 (${response.status})`);
          }
        }
        return response.json();
      })
      .then((data) => {
        console.log("自动保存成功:", data);

        // Update local talentsData to reflect the saved interview record
        if (talentsData && Array.isArray(talentsData)) {
          const talentIndex = talentsData.findIndex(
            (t) => t.phone == talent.phone,
          );
          if (talentIndex !== -1) {
            talentsData[talentIndex].interviewRecord = currentContent;
            console.log("本地数据已更新:", talentsData[talentIndex]);
          }
        }

        lastSavedContent = currentContent;
        updateStatus('<i class="bi bi-check-circle"></i> 已保存', 'success');

        // Check if there's a pending save
        if (pendingSave) {
          setTimeout(() => saveInterviewRecord(), 100);
        }
      })
      .catch((error) => {
        // Handle different error types
        let errorMsg = "保存失败";

        if (error.name === "AbortError") {
          errorMsg = "请求超时";
        } else if (error.message) {
          errorMsg = error.message;
        }

        console.error("自动保存面试记录错误:", error);
        updateStatus(`<i class="bi bi-exclamation-triangle"></i> ${errorMsg}`, 'danger');
      })
      .finally(() => {
        isSaving = false;
      });
  }

  // Debounced save function
  function debouncedSave() {
    clearTimeout(saveTimeout);
    updateStatus('<i class="bi bi-clock"></i> 等待保存...', 'muted');

    saveTimeout = setTimeout(() => {
      saveInterviewRecord();
    }, 2000); // Wait 2 seconds after user stops typing
  }

  // Listen for input changes
  textarea.addEventListener("input", function() {
    debouncedSave();
  });

  // Listen for paste events
  textarea.addEventListener("paste", function() {
    setTimeout(() => debouncedSave(), 100);
  });

  // Initial status
  updateStatus('<i class="bi bi-check-circle"></i> 已保存');
}

// Initialize the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Initialize PDF.js
  if (typeof pdfjsLib !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  // Initialize Bootstrap modals
  talentModal = new bootstrap.Modal(document.getElementById("talentModal"));
  uploadModal = new bootstrap.Modal(document.getElementById("uploadModal"));
  recalculateModal = new bootstrap.Modal(
    document.getElementById("recalculateModal"),
  );

  // Add event listener for modal shown event to resize textarea
  document
    .getElementById("talentModal")
    .addEventListener("shown.bs.modal", function () {
      // Add a short delay to ensure the modal is fully rendered
      setTimeout(function () {
        const textarea = document.getElementById("interviewRecordText");
        if (textarea) {
          // Reset height to auto to get the correct scrollHeight
          textarea.style.height = "auto";

          // Check if content exceeds max-height
          const maxHeight = parseInt(
            window.getComputedStyle(textarea).maxHeight,
          );
          const scrollHeight = textarea.scrollHeight;

          // Set the height to match content plus a little extra space
          textarea.style.height = scrollHeight + 2 + "px";

          // Add scrollable class if content is too long
          if (scrollHeight > maxHeight) {
            textarea.classList.add("scrollable");
          } else {
            textarea.classList.remove("scrollable");
          }
        }
      }, 50); // 50ms delay to ensure proper rendering
    });

  // Set up event listeners
  document
    .getElementById("submitUpload")
    .addEventListener("click", handleResumeUpload);
  document
    .getElementById("recalculateButton")
    .addEventListener("click", function () {
      // Reset the recalculate modal state
      document
        .getElementById("recalculateConfirmArea")
        .classList.remove("d-none");
      document.getElementById("recalculateResultsArea").classList.add("d-none");
      document.getElementById("recalculateStatus").innerHTML = "";
      document.getElementById("confirmRecalculate").disabled = false;
      document.getElementById("confirmRecalculate").textContent =
        "确认重新计算";
      recalculateModal.show();
    });
  document
    .getElementById("confirmRecalculate")
    .addEventListener("click", handleScoreRecalculation);
  // Toggle score changes table
  document
    .getElementById("toggleScoreTable")
    .addEventListener("click", function () {
      const tableWrapper = document.getElementById("scoreChangesTableWrapper");
      const isHidden = tableWrapper.classList.contains("d-none");

      if (isHidden) {
        tableWrapper.classList.remove("d-none");
        this.textContent = "隐藏详情";
      } else {
        tableWrapper.classList.add("d-none");
        this.textContent = "显示详情";
      }
    });
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
      // Set icon color to match score
      const expItem = card
        .querySelector(".experience-score")
        .closest(".score-item");
      const expIcon = expItem.querySelector(".score-icon");
      if (expIcon) expIcon.style.color = scoreColor;
      // Add border color
      expItem.style.borderColor = scoreColor;
    } else {
      card.querySelector(".experience-score").textContent = "-";
    }

    if (talent.educationScore) {
      card.querySelector(".education-score").textContent =
        talent.educationScore.toFixed(1);
      card.querySelector(".education-score").style.color = scoreColor;
      // Set icon color to match score
      const eduItem = card
        .querySelector(".education-score")
        .closest(".score-item");
      const eduIcon = eduItem.querySelector(".score-icon");
      if (eduIcon) eduIcon.style.color = scoreColor;
      // Add border color
      eduItem.style.borderColor = scoreColor;
    } else {
      card.querySelector(".education-score").textContent = "-";
    }

    if (talent.technicalScore) {
      card.querySelector(".technical-score").textContent =
        talent.technicalScore.toFixed(1);
      card.querySelector(".technical-score").style.color = scoreColor;
      // Set icon color to match score
      const techItem = card
        .querySelector(".technical-score")
        .closest(".score-item");
      const techIcon = techItem.querySelector(".score-icon");
      if (techIcon) techIcon.style.color = scoreColor;
      // Add border color
      techItem.style.borderColor = scoreColor;
    } else {
      card.querySelector(".technical-score").textContent = "-";
    }

    // if (talent.intentScore) {
    //   card.querySelector(".intent-score").textContent =
    //     talent.intentScore.toFixed(1);
    //   card.querySelector(".intent-score").style.color = scoreColor;
    // } else {
    //   card.querySelector(".intent-score").textContent = "-";
    // }

    // Set total score
    const totalScoreElement = card.querySelector(".total-score");
    totalScoreElement.textContent = talent.averageScore
      ? talent.averageScore.toFixed(1)
      : "-";
    totalScoreElement.style.color = scoreColor;
    totalScoreElement.style.background = `conic-gradient(
      ${scoreColor},
      var(--cyber-purple),
      ${scoreColor},
      var(--cyber-blue),
      ${scoreColor}
    )`;

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
      // Find the latest talent data from talentsData to ensure we have the most recent interview record
      const latestTalent = talentsData.find((t) => t.phone === talent.phone);
      showTalentDetails(latestTalent || talent);
    });

    talentGrid.appendChild(card);
  });
}

// Get color based on score
function getScoreColor(score) {
  if (!score) return "#999";
  if (score >= 7) return "#52c41a"; // 优秀 - 绿色
  if (score >= 6) return "#1890ff"; // 良好 - 蓝色
  if (score >= 5) return "#faad14"; // 及格 - 黄色
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
  // const phoneStr = phone.toString();
  // if (phoneStr.length !== 11) return phoneStr;
  // return `${phoneStr.substring(0, 3)}****${phoneStr.substring(7)}`;
  return phone;
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
  const pdfViewer = document.getElementById("pdfViewer");
  const pdfContainer = document.getElementById("pdfViewerContainer");
  const noPdfOverlay = document.getElementById("noPdfOverlay");

  // Reset any previous event handlers
  if (pdfViewer) {
    pdfViewer.onload = null;
    pdfViewer.onerror = null;
  }
  const scoreColor = getScoreColor(talent.averageScore);

  console.log("找到的元素:", {
    detailsContainer: detailsContainer,
    modalTitle: modalTitle,
    pdfViewer: pdfViewer,
    pdfContainer: pdfContainer,
    noPdfOverlay: noPdfOverlay,
    talentModal: talentModal,
  });

  // Ensure detail container keeps layout classes and theme styles
  detailsContainer.classList.add("talent-details-container", "cyber-theme");

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
        <div class="cyber-panel">
            <div class="cyber-panel-header">
                <span class="cyber-panel-title">基本档案信息</span>
                <div class="cyber-panel-line"></div>
            </div>
            <div class="cyber-panel-body">
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">应聘岗位</div>
                            <div class="detail-value">${jobPositionHtml}</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">姓名</div>
                            <div class="detail-value" style="color: ${scoreColor}">${escapeHtml(talent.name || "-")}</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">年龄</div>
                            <div class="detail-value">${talent.age || "-"} 岁</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">电话</div>
                            <div class="detail-value">${talent.phone || "-"}</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">邮箱</div>
                            <div class="detail-value">${escapeHtml(talent.email || "-")}</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">籍贯</div>
                            <div class="detail-value">${escapeHtml(talent.native || "-")}</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">期望城市</div>
                            <div class="detail-value">${expectCitiesHtml}</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">期望薪资</div>
                            <div class="detail-value">${talent.expectSalary ? `${talent.expectSalary}元/月` : "-"}</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">学历</div>
                            <div class="detail-value">${escapeHtml(talent.education || "-")}</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">专业</div>
                            <div class="detail-value">${escapeHtml(talent.major || "-")}</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">毕业院校</div>
                            <div class="detail-value">${universitiesHtml}</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">工作年限</div>
                            <div class="detail-value">${talent.years || "-"} 年</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">工作过的公司</div>
                            <div class="detail-value">${companiesHtml}</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">博客地址</div>
                            <div class="detail-value">${talent.blog ? `<a href="${escapeHtml(talent.blog)}" target="_blank" class="cyber-link">${escapeHtml(talent.blog)}</a>` : "-"}</div>
                        </div>
                        <div class="detail-row cyber-detail">
                            <div class="detail-label">Github</div>
                            <div class="detail-value">${talent.github ? `<a href="${escapeHtml(talent.github)}" target="_blank" class="cyber-link">${escapeHtml(talent.github)}</a>` : "-"}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="cyber-panel mb-4">
            <div class="cyber-panel-header">
                <span class="cyber-panel-title">技能矩阵</span>
                <div class="cyber-panel-line"></div>
            </div>
            <div class="cyber-panel-body">
                <div class="skills-container cyber-skills">${skillsHtml}</div>
            </div>
        </div>

        <div class="cyber-panel mb-4">
            <div class="cyber-panel-header">
                <span class="cyber-panel-title">能力评估</span>
                <div class="cyber-panel-line"></div>
            </div>
            <div class="cyber-panel-body">
                <div class="score-metrics">
                    <div class="score-metric">
                        <div class="score-label">经验</div>
                        <div class="cyber-score-circle" style="--score-color: ${scoreColor}">
                            <span class="score-value">${talent.experienceScore?.toFixed(1) || "-"}</span>
                        </div>
                    </div>
                    <div class="score-metric">
                        <div class="score-label">学历</div>
                        <div class="cyber-score-circle" style="--score-color: ${scoreColor}">
                            <span class="score-value">${talent.educationScore?.toFixed(1) || "-"}</span>
                        </div>
                    </div>
                    <div class="score-metric">
                        <div class="score-label">技术</div>
                        <div class="cyber-score-circle" style="--score-color: ${scoreColor}">
                            <span class="score-value">${talent.technicalScore?.toFixed(1) || "-"}</span>
                        </div>
                    </div>
                    <div class="score-metric">
                        <div class="score-label">平均</div>
                        <div class="cyber-score-circle average" style="--score-color: ${scoreColor}">
                            <span class="score-value">${talent.averageScore?.toFixed(1) || "-"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>



         <div class="cyber-panel">
             <div class="cyber-panel-header">
                 <span class="cyber-panel-title">面试记录</span>
                 <div class="cyber-panel-line"></div>
             </div>
              <div class="cyber-panel-body">
                  <div class="interview-record-container cyber-input-container">
                      <textarea id="interviewRecordText" class="form-control cyber-textarea mb-2 auto-resize" style="min-height: 100px; height: auto;" placeholder="请输入面试记录...">${escapeHtml(talent.interviewRecord || "")}</textarea>
                      <div id="interviewRecordStatus" class="text-muted small mt-1" style="font-size: 0.8rem;">
                          <i class="bi bi-check-circle text-success"></i> 已保存
                      </div>
                  </div>
              </div>
         </div>
    `;

  // Auto-resize interview record textarea
  const textarea = document.getElementById("interviewRecordText");
  if (textarea) {
    // Define auto-resize function
    function autoResizeTextarea(element) {
      // Reset height to auto to get the correct scrollHeight
      element.style.height = "auto";

      // Force browser reflow to get accurate scrollHeight
      void element.offsetHeight;

      // Check if content exceeds max-height
      const maxHeight = parseInt(window.getComputedStyle(element).maxHeight);
      const scrollHeight = element.scrollHeight;

      // Set the height to match content plus a little extra space
      element.style.height = scrollHeight + 2 + "px";

      // Add or remove scrollable class based on content height
      if (scrollHeight > maxHeight) {
        element.classList.add("scrollable");
      } else {
        element.classList.remove("scrollable");
      }
    }

    // Apply resize on initial load with a small delay
    setTimeout(() => autoResizeTextarea(textarea), 10);

    // Add event listener for input changes
    textarea.addEventListener("input", function () {
      autoResizeTextarea(this);
    });

    // Handle paste events which might contain a lot of text
    textarea.addEventListener("paste", function () {
      // Use setTimeout to ensure content is pasted before resizing
      setTimeout(() => autoResizeTextarea(this), 10);
    });

    // Handle focus to ensure proper scrolling
    textarea.addEventListener("focus", function () {
      autoResizeTextarea(this);
    });

    // Also handle window resize events which might affect layout
    window.addEventListener("resize", function () {
      setTimeout(() => autoResizeTextarea(textarea), 100);
    });
  }

  // Set resume link and PDF viewer
  if (talent.resumePath) {
    const resumeUrl = `/${talent.resumePath}`;

    // Check if we need to load a different PDF
    if (currentPdfUrl !== resumeUrl) {
      currentPdfUrl = resumeUrl;
      loadPDF(resumeUrl);
    } else {
      // PDF is already loaded, just show it
      const pdfViewer = document.getElementById("pdfViewer");
      const pdfIframe = document.getElementById("pdfIframe");
      const noPdfOverlay = document.getElementById("noPdfOverlay");
      pdfViewer.style.display = "flex";
      pdfIframe.style.display = "block";
      noPdfOverlay.classList.add("d-none");
    }

    // Add class to indicate PDF is loaded
    pdfContainer.classList.add("pdf-loaded");
    pdfContainer.classList.remove("pdf-not-available");
  } else {
    // Show "No PDF available" message
    resetPDFViewer();
    currentPdfUrl = null;
    const pdfViewer = document.getElementById("pdfViewer");
    const pdfIframe = document.getElementById("pdfIframe");
    const noPdfOverlay = document.getElementById("noPdfOverlay");
    pdfViewer.style.display = "none";
    pdfIframe.style.display = "none";
    noPdfOverlay.innerHTML = `
      <div class="no-pdf-message">
        <i class="bi bi-file-earmark-x"></i>
        <p>暂无档案文件</p>
      </div>
    `;
    noPdfOverlay.classList.remove("d-none");

    // Add class to indicate PDF is not available
    pdfContainer.classList.add("pdf-not-available");
    pdfContainer.classList.remove("pdf-loaded");
  }

  // Show the modal
  console.log("准备显示模态框");
  try {
    talentModal.show();
    console.log("模态框显示成功");

     // Set up auto-save for interview record
     setupAutoSaveInterviewRecord(talent);

     // Set up reparse resume button
     const reparseResumeBtn = document.getElementById("reparseResumeBtn");
     if (reparseResumeBtn) {
       reparseResumeBtn.setAttribute("data-phone", talent.phone);
       reparseResumeBtn.addEventListener("click", function () {
         const phone = this.getAttribute("data-phone");

         // Confirm action
         if (!confirm("确定要重新解析该人才的简历吗？这将覆盖当前的所有信息。")) {
           return;
         }

         // Show loading state
         this.disabled = true;
         this.innerHTML =
           '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 解析中...';

         // Call API to reparse resume with timeout
         const controller = new AbortController();
         const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for parsing

         fetch(`/talent/${phone}/reparse-resume`, {
           method: "POST",
           signal: controller.signal,
         })
           .then((response) => {
             clearTimeout(timeoutId);

             if (!response.ok) {
               // Different error handling based on status code
               if (response.status === 404) {
                 throw new Error("找不到该人才信息");
               } else if (response.status === 400) {
                 throw new Error("该人才没有简历文件");
               } else if (response.status === 500) {
                 throw new Error("服务器错误，请稍后再试");
               } else {
                 throw new Error(`解析失败 (${response.status})`);
               }
             }
             return response.json();
           })
           .then((data) => {
             console.log("重新解析成功:", data);

             // Update local talentsData
             if (talentsData && Array.isArray(talentsData)) {
               const talentIndex = talentsData.findIndex(
                 (t) => t.phone == phone,
               );
               if (talentIndex !== -1) {
                 talentsData[talentIndex] = data.talent;
                 console.log("本地数据已更新:", talentsData[talentIndex]);
               }
             }

             // Show success message
             showAlert("success", "简历重新解析完成");

             // Refresh the talent details modal
             showTalentDetails(data.talent);

             // Reset button state
             this.disabled = false;
             this.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> 重新解析简历';
           })
           .catch((error) => {
             // Handle different error types
             let errorMsg = "解析失败";

             if (error.name === "AbortError") {
               errorMsg = "请求超时，请检查网络连接";
             } else if (error.message) {
               errorMsg = error.message;
             }

             console.error("重新解析简历错误:", error);
             showAlert("danger", errorMsg);

             // Reset button state
             this.disabled = false;
             this.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> 重新解析简历';
           });
       });
     }
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

  // Use the appropriate endpoint based on number of files
  let url = "/talent/upload-resumes";

  if (files.length === 1) {
    // For single file upload
    formData.append("resume", files[0]);
    url = "/talent/upload-resume";
  } else {
    // For multiple files upload
    for (let i = 0; i < files.length; i++) {
      formData.append("resumes[]", files[i]);
    }
  }

  fetch(url, {
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
      // Normalize response data for single file uploads
      if (!data.results && !data.duplicates && (data.talent || data.file)) {
        // Convert single file response to batch format
        data = {
          total: 1,
          successful: data.talent ? 1 : 0,
          duplicate_count:
            data.message && data.message.includes("已存在") ? 1 : 0,
          failed: 0,
          results: data.talent
            ? [{ filename: "档案", talent: data.talent, file: data.file }]
            : [],
          duplicates:
            data.message && data.message.includes("已存在")
              ? [
                  {
                    filename: "档案",
                    existing_talent: data.talent,
                    existing_file: data.file,
                  },
                ]
              : [],
        };
      }

      const successCount = data.successful || 0;
      const failedCount = data.failed || 0;
      const duplicateCount = data.duplicate_count || 0;
      const totalCount = data.total || 0;

      let statusMessage = `[ 处理完成 ] 共${totalCount}个档案: ${successCount}个成功, ${duplicateCount}个已存在, ${failedCount}个失败`;
      let statusType = "success";

      if (failedCount > 0 && (successCount > 0 || duplicateCount > 0)) {
        statusType = "warning";
      } else if (
        failedCount > 0 &&
        successCount === 0 &&
        duplicateCount === 0
      ) {
        statusType = "danger";
      } else if (
        duplicateCount > 0 &&
        successCount === 0 &&
        failedCount === 0
      ) {
        statusType = "info";
        statusMessage = `[ 提示 ] 档案已存在系统中，无需重复上传`;
      }

      showAlert(statusMessage, statusType, uploadStatus);

      // Show detailed results
      showBatchUploadResults(data, uploadStatus);

      if (successCount > 0 || duplicateCount > 0) {
        // Reset form and reload talents after a short delay
        setTimeout(() => {
          document.getElementById("resumeUploadForm").reset();

          // Hide the upload modal if there were successes or duplicates
          if (successCount > 0 || duplicateCount > 0) {
            uploadModal.hide();
          }

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
          // If only one duplicate was found, show its details
          else if (
            duplicateCount === 1 &&
            data.duplicates &&
            data.duplicates[0] &&
            data.duplicates[0].existing_talent
          ) {
            setTimeout(() => {
              showTalentDetails(data.duplicates[0].existing_talent);
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

// Handle score recalculation
function handleScoreRecalculation() {
  const recalculateStatus = document.getElementById("recalculateStatus");
  const confirmArea = document.getElementById("recalculateConfirmArea");
  const resultsArea = document.getElementById("recalculateResultsArea");

  // Hide results area and show confirm area initially
  confirmArea.classList.remove("d-none");
  resultsArea.classList.add("d-none");

  // Show loading state
  showAlert(
    "[ 计算中 ] 正在根据最新评分标准重新计算所有应聘者分数...",
    "info",
    recalculateStatus,
  );

  // Disable the confirm button during processing
  document.getElementById("confirmRecalculate").disabled = true;
  document.getElementById("confirmRecalculate").textContent = "正在计算...";

  // Call the API to recalculate scores
  fetch("/talents/recalculate-scores", {
    method: "POST",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      const totalCount = data.total_count || 0;
      const updatedCount = data.updated_count || 0;
      const noChangeCount = data.no_change_count || 0;
      const averageChange = data.average_change || 0;
      const maximumChange = data.maximum_change || 0;
      const scoreChanges = data.score_changes || [];
      const maximumTalent = data.maximum_talent || null;

      // Sort score changes by the magnitude of change (largest first)
      scoreChanges.sort((a, b) => {
        const aDiff = Math.abs(a.new_avg_score - a.old_avg_score);
        const bDiff = Math.abs(b.new_avg_score - b.old_avg_score);
        return bDiff - aDiff; // Descending order
      });

      // Hide confirmation area
      confirmArea.classList.add("d-none");

      // Display summary message
      let statusMessage = `[ 计算完成 ] 共${totalCount}个档案，${updatedCount}个已更新，${noChangeCount}个无变化`;
      let statusType = "success";
      showAlert(statusMessage, statusType, recalculateStatus);

      // Update summary statistics
      document.getElementById("totalCount").textContent = totalCount;
      document.getElementById("updatedCount").textContent = updatedCount;
      document.getElementById("noChangeCount").textContent = noChangeCount;
      document.getElementById("avgChange").textContent =
        averageChange.toFixed(2);

      // Display max change if available
      if (maximumTalent) {
        document.getElementById("maxChangeName").textContent =
          maximumTalent.name;
        document.getElementById("maxChangeDetails").textContent =
          `${maximumTalent.education} · ${maximumTalent.universities[0] || ""}`;
        document.getElementById("maxChangeOldScore").textContent = (
          maximumTalent.averageScore - maximumChange
        ).toFixed(1);
        document.getElementById("maxChangeNewScore").textContent =
          maximumTalent.averageScore.toFixed(1);

        const diffElem = document.getElementById("maxChangeDiff");
        const isPositive = maximumChange > 0;
        diffElem.textContent = `${isPositive ? "+" : ""}${maximumChange.toFixed(1)}`;
        diffElem.style.color = isPositive ? "#00ff9d" : "#ff5555";
      } else {
        document.getElementById("maxChangeArea").classList.add("d-none");
      }

      // Populate score changes table
      if (scoreChanges.length > 0) {
        const tableBody = document.getElementById("scoreChangesTableBody");
        tableBody.innerHTML = "";

        // Add table info about sort order
        const infoRow = document.createElement("tr");
        infoRow.innerHTML = `<td colspan="4" class="text-center text-muted"><small>按分数变化幅度从大到小排序</small></td>`;
        tableBody.appendChild(infoRow);

        scoreChanges.forEach((change) => {
          const row = document.createElement("tr");

          // Calculate score difference for display
          const diff = change.new_avg_score - change.old_avg_score;
          const diffText = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
          const diffColor = diff > 0 ? "#00ff9d" : "#ff5555";

          row.innerHTML = `
            <td>${change.talent.name}</td>
            <td>${change.old_avg_score.toFixed(1)}</td>
            <td>${change.new_avg_score.toFixed(1)}</td>
            <td style="color: ${diffColor};">${diffText}</td>
          `;

          // Add event listener to show talent details when clicked
          row.style.cursor = "pointer";
          row.addEventListener("click", () => {
            showTalentDetails(change.talent);
          });

          tableBody.appendChild(row);
        });
      }

      // Show results area
      resultsArea.classList.remove("d-none");

      // Re-enable the confirm button and change its text
      document.getElementById("confirmRecalculate").disabled = false;
      document.getElementById("confirmRecalculate").textContent = "重新计算";

      // Reload talent list in the background
      loadTalents();
    })
    .catch((error) => {
      console.error("Error recalculating scores:", error);
      showAlert(
        "[ 操作失败 ] 网络异常或服务器错误",
        "danger",
        recalculateStatus,
      );

      // Re-enable the confirm button
      document.getElementById("confirmRecalculate").disabled = false;
      document.getElementById("confirmRecalculate").textContent = "重新计算";
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

  const { results = [], errors = [], duplicates = [] } = data;

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

  // Add duplicates section if there are duplicate files
  if (duplicates.length > 0) {
    detailsHTML += '<div class="upload-duplicates mb-2">';
    detailsHTML += '<h6 class="text-info">档案已存在:</h6>';
    detailsHTML += '<ul class="list-group">';

    duplicates.forEach((duplicate) => {
      const filename = escapeHtml(duplicate.filename);
      const talentName =
        duplicate.existing_talent && duplicate.existing_talent.name
          ? escapeHtml(duplicate.existing_talent.name)
          : "未知姓名";

      detailsHTML += `<li class="list-group-item list-group-item-info">
        <small>${filename}</small>
        <div><strong>${talentName}</strong> 档案已在系统中存在</div>
        <div><button class="btn btn-sm btn-outline-primary mt-1 view-duplicate-details"
          data-phone="${duplicate.existing_talent ? duplicate.existing_talent.phone : ""}">
          查看已存在档案</button></div>
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

  // Add event listeners to view duplicate details buttons
  const viewDuplicateButtons = resultsElement.querySelectorAll(
    ".view-duplicate-details",
  );
  viewDuplicateButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const phone = this.getAttribute("data-phone");
      if (phone) {
        // Find the talent in the current data
        const duplicate = duplicates.find(
          (d) => d.existing_talent && d.existing_talent.phone == phone,
        );

        if (duplicate && duplicate.existing_talent) {
          showTalentDetails(duplicate.existing_talent);
        }
      }
    });
  });
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
    // if (type === "success" || type === "info") {
    //   setTimeout(() => {
    //     if (container.contains(alert)) {
    //       container.removeChild(alert);
    //     }
    //   }, 5000);
    // }
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

// PDF.js高性能渲染函数
function loadPDF(url) {
  const noPdfOverlay = document.getElementById("noPdfOverlay");
  const pdfViewer = document.getElementById("pdfViewer");
  const pdfIframe = document.getElementById("pdfIframe");
  const pdfContainer = document.getElementById("pdfContainer");
  const pdfControls = document.getElementById("pdfControls");

  // 显示加载状态
  noPdfOverlay.innerHTML = `
    <div class="no-pdf-message loading-pdf">
      <i class="bi bi-hourglass-split"></i>
      <p>档案加载中...</p>
    </div>
  `;
  noPdfOverlay.classList.remove("d-none");
  pdfViewer.style.display = "none";

  // 使用iframe加载PDF
  pdfIframe.src = url;
  pdfIframe.onload = function () {
    // 隐藏加载状态，显示PDF iframe
    noPdfOverlay.classList.add("d-none");
    pdfViewer.style.display = "flex";
    pdfIframe.style.display = "block";

    // 隐藏旧的canvas容器和控件
    pdfContainer.style.display = "none";
    pdfControls.style.display = "none";

    console.log("PDF loaded successfully in iframe");
  };

  pdfIframe.onerror = function () {
    console.error("Error loading PDF in iframe");
    noPdfOverlay.innerHTML = `
      <div class="no-pdf-message">
        <i class="bi bi-exclamation-triangle"></i>
        <p>档案加载失败</p>
      </div>
    `;
    noPdfOverlay.classList.remove("d-none");
    pdfViewer.style.display = "none";
    pdfIframe.style.display = "none";
  };
}

function renderAllPages() {
  const container = document.getElementById("pdfContainer");
  container.innerHTML = "";

  // 为每一页创建容器
  for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
    const pageWrapper = document.createElement("div");
    pageWrapper.className = "pdf-page-wrapper";
    pageWrapper.id = `page-wrapper-${pageNumber}`;

    const pageNumberLabel = document.createElement("div");
    pageNumberLabel.className = "pdf-page-number";
    pageNumberLabel.textContent = `${pageNumber} / ${pdfDoc.numPages}`;

    pageWrapper.appendChild(pageNumberLabel);
    container.appendChild(pageWrapper);

    // 渲染页面
    renderPage(pageNumber, pageWrapper);
  }

  // 设置滚动监听
  setupScrollListener();
}

function renderPage(pageNumber, container) {
  if (renderedPages.has(pageNumber)) {
    return; // 已经渲染过
  }

  pdfDoc.getPage(pageNumber).then(function (page) {
    // 创建canvas
    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    canvas.id = `page-${pageNumber}`;

    const ctx = canvas.getContext("2d");

    // 获取设备像素比以提高清晰度（限制最大值避免过度渲染）
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    // 计算缩放和视口
    const containerWidth =
      document.getElementById("pdfContainer").clientWidth - 40; // 减去padding
    let viewport = page.getViewport({ scale: 1.0 });

    // 自动适应宽度
    if (
      document.getElementById("scaleSelect").value === "page-width" ||
      document.getElementById("scaleSelect").value === "auto"
    ) {
      scale = containerWidth / viewport.width;
    } else {
      scale = parseFloat(document.getElementById("scaleSelect").value) || 1.0;
    }

    // 计算最终视口
    viewport = page.getViewport({ scale: scale });

    // 设置canvas尺寸（应用设备像素比提高清晰度）
    const canvasWidth = Math.floor(viewport.width * devicePixelRatio);
    const canvasHeight = Math.floor(viewport.height * devicePixelRatio);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // 设置canvas显示尺寸
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height = Math.floor(viewport.height) + "px";

    // 设置高质量渲染上下文
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) {
      ctx.imageSmoothingQuality = "high";
    }

    // 缩放上下文以匹配设备像素比
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // 渲染参数
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    // 渲染页面
    const renderTask = page.render(renderContext);
    renderTask.promise
      .then(function () {
        container.appendChild(canvas);
        renderedPages.set(pageNumber, canvas);

        // 如果是第一页，标记为当前页
        if (pageNumber === 1) {
          canvas.classList.add("current-page");
        }

        console.log(`Page ${pageNumber} rendered`);
      })
      .catch(function (error) {
        console.error(`Error rendering page ${pageNumber}:`, error);
      });
  });
}

function setupScrollListener() {
  const container = document.getElementById("pdfContainer");
  let ticking = false;

  function updateCurrentPage() {
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestPage = 1;
    let closestDistance = Infinity;

    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
      const pageElement = document.getElementById(`page-${pageNumber}`);
      if (pageElement) {
        const pageRect = pageElement.getBoundingClientRect();
        const pageCenter = pageRect.top + pageRect.height / 2;
        const distance = Math.abs(pageCenter - containerCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = pageNumber;
        }
      }
    }

    if (closestPage !== currentPage) {
      // 移除旧页面的高亮
      const oldPage = document.getElementById(`page-${currentPage}`);
      if (oldPage) {
        oldPage.classList.remove("current-page");
      }

      // 添加新页面的高亮
      const newPage = document.getElementById(`page-${closestPage}`);
      if (newPage) {
        newPage.classList.add("current-page");
      }

      currentPage = closestPage;
      document.getElementById("pageInfo").textContent =
        `${currentPage} / ${pdfDoc.numPages}`;
      updateNavButtons();
    }

    ticking = false;
  }

  container.addEventListener("scroll", function () {
    if (!ticking) {
      requestAnimationFrame(updateCurrentPage);
      ticking = true;
    }
  });
}

function setupPDFControls() {
  // 上一页 - 滚动到上一页
  document.getElementById("prevPage").onclick = function () {
    if (currentPage <= 1) return;
    scrollToPage(currentPage - 1);
  };

  // 下一页 - 滚动到下一页
  document.getElementById("nextPage").onclick = function () {
    if (currentPage >= pdfDoc.numPages) return;
    scrollToPage(currentPage + 1);
  };

  // 缩放控制 - 重新渲染所有页面
  document.getElementById("scaleSelect").onchange = function () {
    const container = document.getElementById("pdfContainer");
    const scrollTop = container.scrollTop;
    const scrollRatio = scrollTop / container.scrollHeight;

    // 清除缓存并重新渲染
    renderedPages.clear();
    renderAllPages();

    // 尝试保持滚动位置
    setTimeout(() => {
      container.scrollTop = container.scrollHeight * scrollRatio;
    }, 100);
  };

  // 键盘导航
  document.addEventListener("keydown", function (e) {
    if (document.getElementById("talentModal").classList.contains("show")) {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (currentPage > 1) {
          scrollToPage(currentPage - 1);
        }
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (currentPage < pdfDoc.numPages) {
          scrollToPage(currentPage + 1);
        }
        e.preventDefault();
      } else if (e.key === "Home") {
        scrollToPage(1);
        e.preventDefault();
      } else if (e.key === "End") {
        scrollToPage(pdfDoc.numPages);
        e.preventDefault();
      }
    }
  });

  updateNavButtons();
}

function scrollToPage(pageNumber) {
  const pageElement = document.getElementById(`page-${pageNumber}`);
  if (pageElement) {
    pageElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function updateNavButtons() {
  document.getElementById("prevPage").disabled = currentPage <= 1;
  document.getElementById("nextPage").disabled = currentPage >= pdfDoc.numPages;
}

function resetPDFViewer() {
  pdfDoc = null;
  pageNum = 1;
  pageRendering = false;
  pageNumPending = null;
  scale = 1.0;
  renderedPages.clear();
  visiblePages.clear();
  currentPage = 1;

  const container = document.getElementById("pdfContainer");
  const pdfIframe = document.getElementById("pdfIframe");

  if (container) {
    container.innerHTML = "";
  }

  if (pdfIframe) {
    pdfIframe.src = "";
  }
}

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

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
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
