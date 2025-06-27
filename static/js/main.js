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
      if (e.target.classList.contains("with-hover")) {
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

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      talentsData = data;
      renderTalentList(data);
    })
    .catch((error) => {
      console.error("Error loading talents:", error);
      showAlert("加载人才数据失败，请稍后重试。", "danger");
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

    // Set talent data in the card
    card.querySelector(".talent-name").textContent = talent.name || "-";
    card.querySelector(".talent-name").style.color = scoreColor;

    const jobPositionElement = card.querySelector(".job-position");
    jobPositionElement.textContent = talent.jobPosition || "未指定岗位";
    jobPositionElement.style.color = scoreColor;

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

    // Set total score
    const totalScoreElement = card.querySelector(".total-score");
    totalScoreElement.textContent = talent.averageScore
      ? talent.averageScore.toFixed(1)
      : "-";
    totalScoreElement.style.color = scoreColor;

    // Set basic info
    card.querySelector(".phone-text").textContent = formatPhone(talent.phone);
    card.querySelector(".email-text").textContent = talent.email || "-";
    card.querySelector(".education-text").textContent = talent.education || "-";
    card.querySelector(".major-text").textContent = talent.major || "-";
    card.querySelector(".years-text").textContent = talent.years
      ? `${talent.years} 年`
      : "-";
    card.querySelector(".salary-text").textContent = talent.expectSalary
      ? `${talent.expectSalary}K`
      : "-";
    card.querySelector(".native-text").textContent = talent.native || "-";

    // Set array-based info
    card.querySelector(".cities-text").textContent =
      Array.isArray(talent.expectCities) && talent.expectCities.length
        ? talent.expectCities.join(", ")
        : "暂无";

    card.querySelector(".skills-text").textContent =
      Array.isArray(talent.skills) && talent.skills.length
        ? talent.skills.join(", ")
        : "暂无";

    card.querySelector(".companies-text").textContent =
      Array.isArray(talent.companies) && talent.companies.length
        ? talent.companies.join(", ")
        : "暂无";

    card.querySelector(".universities-text").textContent =
      Array.isArray(talent.universities) && talent.universities.length
        ? talent.universities.join(", ")
        : "暂无";

    // Set card border color based on score
    const cardElement = card.querySelector(".card");
    cardElement.style.borderLeft = `4px solid ${scoreColor}`;

    // Set up event listeners

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
  // Use bootstrap tooltip
  const tooltip = new bootstrap.Tooltip(element, {
    title: text,
    placement: "top",
    trigger: "hover",
  });

  // Dispose tooltip when mouse leaves
  element.addEventListener(
    "mouseleave",
    function () {
      tooltip.dispose();
    },
    { once: true },
  );
}

// Format phone number for display
function formatPhone(phone) {
  if (!phone) return "-";
  const phoneStr = phone.toString();
  if (phoneStr.length !== 11) return phoneStr;
  return `${phoneStr.substring(0, 3)}****${phoneStr.substring(7)}`;
}

// Show talent details in the modal
function showTalentDetails(phone) {
  const talent = talentsData.find(
    (t) => t.phone.toString() === phone.toString(),
  );
  if (!talent) return;

  const detailsContainer = document.getElementById("talentDetails");
  const modalTitle = document.getElementById("talentModalLabel");
  const resumeBtn = document.getElementById("viewResumeBtn");
  const scoreColor = getScoreColor(talent.averageScore);

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
  const jobPositionHtml = `<span class="job-position" style="color: ${scoreColor}">${escapeHtml(talent.jobPosition || "未指定")}</span>`;

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
  talentModal.show();
}

// Handle resume upload
function handleResumeUpload() {
  const fileInput = document.getElementById("resumeFile");
  const uploadStatus = document.getElementById("uploadStatus");

  if (!fileInput.files.length) {
    showAlert("请选择要上传的PDF简历文件。", "danger", uploadStatus);
    return;
  }

  const file = fileInput.files[0];
  if (file.type !== "application/pdf") {
    showAlert("只支持上传PDF格式的简历。", "danger", uploadStatus);
    return;
  }

  // Show loading state
  showAlert("正在上传并解析简历，请稍候...", "info", uploadStatus);

  // Create form data
  const formData = new FormData();
  formData.append("resume", file);

  // Upload the resume
  fetch("/talent/upload-resume", {
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
      showAlert("简历上传并解析成功!", "success", uploadStatus);
      document.getElementById("resumeUploadForm").reset();

      // Hide the upload modal
      uploadModal.hide();

      // Reload the talent list
      loadTalents();

      // Show the talent details
      setTimeout(() => {
        if (data.talent && data.talent.phone) {
          showTalentDetails(data.talent.phone);
        }
      }, 500);
    })
    .catch((error) => {
      console.error("Error uploading resume:", error);
      showAlert("简历上传失败，请稍后重试。", "danger", uploadStatus);
    });
}

// Handle search
function handleSearch() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput.value.trim();

  loadTalents(query);
}

// Show alert message
function showAlert(message, type, container = null) {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;

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
