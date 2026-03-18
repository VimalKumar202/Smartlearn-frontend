// ===============================
// APP CONFIG
// ===============================
const API_BASE = window.APP_CONFIG.API_BASE;   // example: https://smartlearn-backend.onrender.com/api
const BASE_URL = window.APP_CONFIG.BASE_URL;   // example: https://smartlearn-backend.onrender.com

const token = localStorage.getItem("sl_token");
const ANNOUNCE_API = `${API_BASE}/announcements`;
const FILE_BASE = BASE_URL;

// ===============================
// HELPERS
// ===============================
function buildFileUrl(path = "") {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// ===============================
// AUTH + HEADER + NAV
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    alert("Session expired. Please login again.");
    window.location.replace("index.html");
    return;
  }

  function loadTeacherHeader() {
    const username = localStorage.getItem("sl_username");
    const role = localStorage.getItem("sl_role");
    const avatar = localStorage.getItem("sl_avatar");

    const topName = document.getElementById("Username");
    const topAvatar = document.getElementById("topAvatar");

    if (topName) {
      topName.textContent =
        role === "teacher"
          ? `Teacher ${username || ""}`
          : username || "Teacher";
    }

    if (topAvatar) {
      if (avatar) {
        topAvatar.style.backgroundImage = `url('${avatar}')`;
        topAvatar.style.backgroundSize = "cover";
        topAvatar.textContent = "";
      } else {
        topAvatar.textContent = username ? username[0].toUpperCase() : "T";
        topAvatar.style.background = "#6366f1";
        topAvatar.style.color = "white";
      }
    }
  }

  loadTeacherHeader();

  const navButtons = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".section");

  function showSection(id) {
    navButtons.forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.section === id)
    );
    sections.forEach((sec) => {
      sec.style.display = sec.id === id ? "" : "none";
    });
  }

  navButtons.forEach((btn) =>
    btn.addEventListener("click", () => showSection(btn.dataset.section))
  );

  showSection("home");

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.replace("index.html");
  });
});

// ===================================================
// AI PANEL
// ===================================================
const askAiBtn = document.getElementById("askAiBtn");
const askAiPanel = document.getElementById("askAiPanel");
const closeAskAi = document.getElementById("closeAskAi");
const aiInput = document.getElementById("aiInput");
const aiSend = document.getElementById("aiSend");
const aiChatBox = document.getElementById("aiChatBox");

askAiBtn?.addEventListener("click", () => {
  askAiPanel.classList.add("open");
  askAiPanel.setAttribute("aria-hidden", "false");
});

closeAskAi?.addEventListener("click", () => {
  askAiPanel.classList.remove("open");
  askAiPanel.setAttribute("aria-hidden", "true");

  aiChatBox.innerHTML =
    `<div class="msg ai">🤖 Hi! Ask me anything to get started.</div>`;

  aiInput.value = "";
});

function addMessage(sender, text) {
  const div = document.createElement("div");
  div.className = `msg ${sender}`;

  if (sender === "user") {
    div.textContent = `You: ${text}`;
  } else {
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");

    div.innerHTML = `🤖 ${formattedText}`;
  }

  aiChatBox.appendChild(div);
  aiChatBox.scrollTop = aiChatBox.scrollHeight;
}

async function callSmartLearn(prompt) {
  try {
    const res = await fetch(`${API_BASE}/ai/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    return data.reply || "No response";
  } catch {
    return "❌ AI Server Error";
  }
}

aiSend?.addEventListener("click", async () => {
  const text = aiInput.value.trim();
  if (!text) return;

  aiInput.value = "";
  addMessage("user", text);

  addMessage("ai", "⏳ Thinking...");
  const reply = await callSmartLearn(text);

  aiChatBox.lastChild?.remove();
  addMessage("ai", reply);
});

aiInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") aiSend.click();
});

// ===================================================
// LOAD STUDENTS
// ===================================================
async function loadStudents() {
  try {
    const res = await fetch(`${API_BASE}/teacher/students`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("sl_token"),
      },
    });

    if (!res.ok) throw new Error("Failed to load students");

    const students = await res.json();
    const list = document.getElementById("studentList");
    if (!list) return;

    list.innerHTML = "";

    if (!students.length) {
      list.innerHTML = "<li>No students found</li>";
      return;
    }

    students.forEach((stu) => {
      const li = document.createElement("li");
      li.textContent = `${stu.username} — ${stu.email}`;
      li.onclick = () => loadStudentDetails(stu._id);
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Student load error:", err);
  }
}

loadStudents();

// ===================================================
// STUDENT DETAILS + PERFORMANCE
// ===================================================
async function loadStudentDetails(id) {
  const details = document.getElementById("studentDetails");
  if (details) details.classList.add("show");

  const headers = {
    Authorization: "Bearer " + localStorage.getItem("sl_token"),
  };

  try {
    const profileRes = await fetch(`${API_BASE}/teacher/student/${id}`, {
      headers,
    });

    if (!profileRes.ok) throw new Error("Profile fetch failed");

    const profile = await profileRes.json();

    document.getElementById("studentNameTitle").textContent =
      profile.username || "N/A";
    document.getElementById("studentEmail").textContent =
      profile.email || "N/A";

    const perfRes = await fetch(`${API_BASE}/teacher/student/${id}/performance`, {
      headers,
    });

    const perf = perfRes.ok ? await perfRes.json() : {};

    const weakList = document.getElementById("studentWeakTopics");
    if (weakList) {
      weakList.innerHTML = "";

      if (perf.weakTopics?.length) {
        perf.weakTopics.forEach((t) => {
          const li = document.createElement("li");
          li.textContent = t;
          weakList.appendChild(li);
        });
      } else {
        weakList.innerHTML = "<li>No weak topics 🎉</li>";
      }
    }

    loadStudentChart(perf.subjects || []);
  } catch (err) {
    console.error("Student detail error:", err);
  }
}

document.getElementById("closeStudentDetails")?.addEventListener("click", () => {
  document.getElementById("studentDetails")?.classList.remove("show");
});

// ===================================================
// CHART
// ===================================================
let chart;

function loadStudentChart(subjects) {
  const ctx = document.getElementById("studentChart");
  if (!ctx) return;

  if (chart) chart.destroy();
  if (!subjects.length) return;

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: subjects.map((s) => s.name),
      datasets: [
        {
          data: subjects.map((s) => s.score),
          backgroundColor: "#7c3aed",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
    },
  });
}

// ===================================================
// UPLOAD VIDEO
// ===================================================
const videoTitle = document.getElementById("videoTitle");
const youtubeUrl = document.getElementById("youtubeUrl");
const videoSubject = document.getElementById("videoSubject");
const videoDescription = document.getElementById("videoDescription");
const uploadVideoBtn = document.getElementById("uploadVideoBtn");

uploadVideoBtn?.addEventListener("click", async () => {
  const payload = {
    title: videoTitle.value.trim(),
    youtubeUrl: youtubeUrl.value.trim(),
    subject: videoSubject.value,
    description: videoDescription.value.trim(),
  };

  if (!payload.title || !payload.youtubeUrl) {
    alert("❌ Title and YouTube URL are required");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/teacher/videos/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("sl_token"),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    alert("✅ Video uploaded successfully");

    videoTitle.value = "";
    youtubeUrl.value = "";
    videoSubject.value = "";
    videoDescription.value = "";

    loadMyVideos();
  } catch (err) {
    alert("❌ " + err.message);
  }
});

// ===================================================
// LOAD MY VIDEOS
// ===================================================
let allMyVideos = [];

async function loadMyVideos() {
  try {
    const token = localStorage.getItem("sl_token");

    const res = await fetch(`${API_BASE}/teacher/videos/my-videos`, {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!res.ok) throw new Error("Failed to load videos");

    allMyVideos = await res.json();
    renderMyVideos(allMyVideos);
    populateSubjectFilter(allMyVideos);
  } catch (err) {
    console.error("Error loading videos", err);
  }
}

function renderMyVideos(videos) {
  const container = document.getElementById("myUploadedVideos");
  if (!container) return;

  container.innerHTML = "";

  if (!videos.length) {
    container.innerHTML = "<p>No videos uploaded yet.</p>";
    return;
  }

  videos.forEach((video) => {
    const videoId = getYouTubeId(video.youtubeUrl);

    container.innerHTML += `
      <div class="video-card">
        <iframe
          src="https://www.youtube.com/embed/${videoId}"
          allowfullscreen>
        </iframe>

        <h4><b>Title:</b> ${video.title}</h4>
        <p><b>Subject:</b> ${video.subject || "-"}</p>
        <p><b>Description:</b> ${video.description || ""}</p>

        <button class="delete-btn"
          onclick="deleteVideo('${video._id}')">
          🗑 Delete
        </button>
      </div>
    `;
  });
}

function getYouTubeId(url) {
  if (!url) return "";

  if (url.includes("youtu.be/")) {
    return url.split("youtu.be/")[1].split("?")[0];
  }

  if (url.includes("watch?v=")) {
    return url.split("v=")[1].split("&")[0];
  }

  if (url.includes("/embed/")) {
    return url.split("/embed/")[1].split("?")[0];
  }

  return "";
}

async function deleteVideo(videoId) {
  if (!confirm("Are you sure you want to delete this video?")) return;

  try {
    const res = await fetch(`${API_BASE}/teacher/videos/${videoId}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("sl_token"),
      },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    alert("✅ Video deleted");
    loadMyVideos();
  } catch (err) {
    alert("❌ " + err.message);
  }
}

loadMyVideos();

// ===================================================
// VIDEO SEARCH + FILTER
// ===================================================
document.getElementById("videoSearchInput")?.addEventListener("input", () => {
  applyFilters();
});

document.getElementById("subjectFilter")?.addEventListener("change", () => {
  applyFilters();
});

function applyFilters() {
  const searchText = document
    .getElementById("videoSearchInput")
    ?.value.toLowerCase() || "";

  const subject = document.getElementById("subjectFilter")?.value || "";

  const filtered = allMyVideos.filter((video) => {
    const matchesSearch =
      video.title.toLowerCase().includes(searchText) ||
      (video.description || "").toLowerCase().includes(searchText);

    const matchesSubject = !subject || video.subject === subject;

    return matchesSearch && matchesSubject;
  });

  renderMyVideos(filtered);
}

function populateSubjectFilter(videos) {
  const subjectFilter = document.getElementById("subjectFilter");
  if (!subjectFilter) return;

  subjectFilter.innerHTML = `<option value="">All Subjects</option>`;

  const subjects = [...new Set(videos.map((v) => v.subject).filter(Boolean))];

  subjects.forEach((sub) => {
    const option = document.createElement("option");
    option.value = sub;
    option.textContent = sub;
    subjectFilter.appendChild(option);
  });
}

// ===================================================
// DOUBTS
// ===================================================
async function replyDoubt(doubtId, answer) {
  await fetch(`${API_BASE}/doubts/${doubtId}/reply`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("sl_token"),
    },
    body: JSON.stringify({ answer }),
  });

  loadAllDoubts?.();
}

async function loadTeacherDoubts() {
  const res = await fetch(`${API_BASE}/doubts/teacher/pending`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("sl_token"),
    },
  });

  const doubts = await res.json();

  const container = document.getElementById("teacherDoubts");
  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(doubts) || doubts.length === 0) {
    container.innerHTML = "<p>No pending doubts 🎉</p>";
    return;
  }

  doubts.forEach((d) => {
    container.innerHTML += `
      <div class="doubt-card">
        <div class="doubt-header">
          <div>
            <strong>👨‍🎓 ${d.student.username}</strong>
            <span class="time">
              ${new Date(d.createdAt).toLocaleString()}
            </span>
          </div>
          <span class="badge pending">Pending</span>
        </div>

        <p class="doubt-question">${d.question}</p>

        <textarea
          id="reply-${d._id}"
          class="reply-input"
          placeholder="Reply to the student..."
        ></textarea>

        <button class="btn success full" onclick="sendReply('${d._id}')">
          Send Reply
        </button>
      </div>
    `;
  });
}

loadTeacherDoubts();

async function sendReply(id) {
  const answer = document.getElementById(`reply-${id}`).value;

  if (!answer) return alert("Write reply");

  await fetch(`${API_BASE}/doubts/${id}/reply`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("sl_token"),
    },
    body: JSON.stringify({ answer }),
  });

  loadTeacherDoubts();
}

// ===================================================
// ANNOUNCEMENTS
// ===================================================
const announcementText = document.getElementById("announcementText");
const announcementFile = document.getElementById("announcementFile");
const fileName = document.getElementById("fileName");
const postBtn = document.getElementById("postAnnouncementBtn");
const myAnnouncementsBox = document.getElementById("myAnnouncements");

announcementFile?.addEventListener("change", () => {
  fileName.textContent =
    announcementFile.files[0]?.name || "No file selected";
});

postBtn?.addEventListener("click", async () => {
  if (!announcementText.value.trim()) {
    alert("❌ Announcement message is required");
    return;
  }

  const formData = new FormData();
  formData.append("message", announcementText.value);

  if (announcementFile.files[0]) {
    formData.append("attachment", announcementFile.files[0]);
  }

  try {
    const res = await fetch(ANNOUNCE_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
      },
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to post announcement");
      return;
    }

    alert("✅ Announcement posted");

    announcementText.value = "";
    announcementFile.value = "";
    fileName.textContent = "No file selected";

    loadMyAnnouncements();
  } catch (err) {
    console.error("Announcement error:", err);
    alert("❌ Server error");
  }
});

async function loadMyAnnouncements() {
  try {
    if (!myAnnouncementsBox) return;

    const res = await fetch(ANNOUNCE_API, {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    const announcements = await res.json();

    if (!announcements.length) {
      myAnnouncementsBox.innerHTML =
        "<p class='muted'>No announcements posted yet.</p>";
      return;
    }

    myAnnouncementsBox.innerHTML = "";

    announcements.forEach((a) => {
      const div = document.createElement("div");
      div.className = "announcement-item";

      const attachmentUrl = a.attachment ? buildFileUrl(a.attachment) : "";

      div.innerHTML = `
        <div class="announcement-top">
          <p>${a.message}</p>
          <button class="delete-btn" data-id="${a._id}">🗑</button>
        </div>

        ${
          a.attachment
            ? `<a href="${attachmentUrl}" target="_blank" rel="noopener">📎 View Attachment</a>`
            : ""
        }

        <small class="muted">
          Expires on ${new Date(a.expiresAt).toLocaleDateString()}
        </small>
      `;

      myAnnouncementsBox.appendChild(div);
    });
  } catch (err) {
    console.error("Load announcements error:", err);
    if (myAnnouncementsBox) {
      myAnnouncementsBox.innerHTML =
        "<p class='error'>Failed to load announcements</p>";
    }
  }
}

loadMyAnnouncements();

myAnnouncementsBox?.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("delete-btn")) return;

  const id = e.target.dataset.id;

  if (!confirm("Delete this announcement?")) return;

  const res = await fetch(`${ANNOUNCE_API}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Delete failed");
    return;
  }

  loadMyAnnouncements();
});

// ===================================================
// CONTENT UPLOAD
// ===================================================
const uploadBtn = document.getElementById("uploadBtn");

uploadBtn?.addEventListener("click", async () => {
  const title = document.getElementById("uploadTitle").value;
  const contentType = document.getElementById("contentType").value;
  const subject = document.getElementById("uploadSubject").value;
  const file = document.getElementById("uploadFile").files[0];

  if (!title || !contentType) {
    alert("All fields are required");
    return;
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("subject", subject);
  formData.append("contentType", contentType);
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/content/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message);
    return;
  }

  alert("Content uploaded successfully");
  loadMyContent();
});

const contentContainer = document.getElementById("myContent");

async function loadMyContent() {
  try {
    const token = localStorage.getItem("sl_token");

    const res = await fetch(`${API_BASE}/content/my`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!contentContainer) return;

    contentContainer.innerHTML = "";

    if (!data.length) {
      contentContainer.innerHTML = "<p>No content uploaded yet</p>";
      return;
    }

    data.forEach((item) => {
      contentContainer.innerHTML += `
        <div class="content-card" id="card-${item._id}">
          <div class="view-mode">
            <div class="content-info">
              <h3>${item.title}</h3>
              <span>${item.subject || "No Subject"} • ${item.contentType}</span>
            </div>

            <div class="content-actions">
              <button class="edit-btn" onclick="enableEdit('${item._id}')">✏️</button>
              <button class="delete-btn" onclick="deleteContent('${item._id}')">🗑️</button>
              <a href="${buildFileUrl(item.fileUrl)}" target="_blank">
                View / Download
              </a>
            </div>
          </div>

          <div class="edit-mode" style="display:none;">
            <input type="text" id="title-${item._id}" value="${item.title}" />
            <input type="text" id="subject-${item._id}" value="${item.subject || ""}" />

            <select id="type-${item._id}">
              <option value="Note" ${item.contentType === "Note" ? "selected" : ""}>Note</option>
              <option value="Assignment" ${item.contentType === "Assignment" ? "selected" : ""}>Assignment</option>
            </select>

            <input type="file" id="file-${item._id}" />

            <div class="content-actions">
              <button onclick="updateContent('${item._id}')">✅ Update</button>
              <button onclick="cancelEdit('${item._id}')">❌ Cancel</button>
            </div>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error("Error loading content", err);
  }
}

function enableEdit(id) {
  document.querySelector(`#card-${id} .view-mode`).style.display = "none";
  document.querySelector(`#card-${id} .edit-mode`).style.display = "block";
}

function cancelEdit(id) {
  document.querySelector(`#card-${id} .edit-mode`).style.display = "none";
  document.querySelector(`#card-${id} .view-mode`).style.display = "block";
}

async function updateContent(id) {
  const title = document.getElementById(`title-${id}`).value;
  const subject = document.getElementById(`subject-${id}`).value;
  const contentType = document.getElementById(`type-${id}`).value;
  const file = document.getElementById(`file-${id}`).files[0];

  const formData = new FormData();
  formData.append("title", title);
  formData.append("subject", subject);
  formData.append("contentType", contentType);

  if (file) {
    formData.append("file", file);
  }

  const res = await fetch(`${API_BASE}/content/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message);
    return;
  }

  alert("Content updated successfully");
  loadMyContent();
}

async function deleteContent(id) {
  if (!confirm("Are you sure you want to delete this content?")) return;

  const res = await fetch(`${API_BASE}/content/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message);
    return;
  }

  alert("Content deleted successfully");
  loadMyContent();
}

loadMyContent();

// ===================================================
// DASHBOARD
// ===================================================
async function loadTeacherDashboard() {
  try {
    const res = await fetch(`${API_BASE}/teacher/dashboard`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
      },
    });

    const data = await res.json();
    console.log("Dashboard Data:", data);

    document.getElementById("totalStudents").innerText =
      data.stats.totalStudents;

    document.getElementById("pendingDoubts").innerText =
      data.stats.pendingDoubts;

    document.getElementById("notesThisWeek").innerText =
      data.stats.notesThisWeek;

    document.getElementById("totalAssignments").innerText =
      data.stats.totalAssignments;

    const doubtsContainer = document.querySelector("#home .card");
    if (doubtsContainer) {
      doubtsContainer.innerHTML = `<h3>❓ Latest Student Pending Doubts</h3>`;

      data.latestDoubts.forEach((doubt) => {
        doubtsContainer.innerHTML += `
          <div class="doubt-card">
            <div>
              <h4>${doubt.student.username}</h4>
              <p class="preview">${doubt.question}</p>
            </div>
          </div>
        `;
      });
    }
  } catch (err) {
    console.error("Dashboard load failed:", err);
  }
}

loadTeacherDashboard();