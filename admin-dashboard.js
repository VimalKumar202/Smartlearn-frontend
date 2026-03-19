(function () {
  const API_BASE = `${window.APP_CONFIG.API_BASE}/admin`;
  const ROOT_API = window.APP_CONFIG.API_BASE;
  const BASE_URL = window.APP_CONFIG.BASE_URL;
  const ADMIN_VIDEO_API = `${ROOT_API}/admin/videos`;
  const SETTINGS_API = `${ROOT_API}/admin-settings`;

  const token = localStorage.getItem("sl_token") || "";

  if (!token) {
    alert("Admin not logged in");
    window.location.href = "index.html";
    return;
  }

  // DOM
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".section");
  const sidebar = document.getElementById("sidebar");
  const hamburger = document.getElementById("hamburger");

  const searchInput = document.getElementById("searchInput");
  const roleFilter = document.getElementById("roleFilter");
  const refreshBtn = document.getElementById("refreshBtn");

  const userTableBody = document.getElementById("userTableBody");
  const approvalTableBody = document.getElementById("approvalTableBody");
  const moderationBody = document.getElementById("moderationBody");

  const statTotal = document.getElementById("statTotal");
  const statStudents = document.getElementById("statStudents");
  const statTeachers = document.getElementById("statTeachers");
  const statPending = document.getElementById("statPending");

  const editModal = document.getElementById("editModal");
  const editId = document.getElementById("editId");
  const editUsername = document.getElementById("editUsername");
  const editEmail = document.getElementById("editEmail");
  const editRole = document.getElementById("editRole");
  const editStatus = document.getElementById("editStatus");
  const saveEdit = document.getElementById("saveEdit");
  const cancelEdit = document.getElementById("cancelEdit");

  const lecturesGrid = document.querySelector(".lectures-grid");
  const lectureSearchInput = document.getElementById("lectureSearchInput");
  const statusFilter = document.getElementById("lectureStatusFilter");
  const refreshLecturesBtn = document.getElementById("refreshLecturesBtn");

  let roleChart = null;
  let approvalChart = null;
  let userGrowthChart = null;
  let usageChart = null;

  // -------------------
  // Helpers
  // -------------------
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "%22");
  }

  function showSection(id) {
    navItems.forEach((b) => b.classList.toggle("active", b.dataset.section === id));
    sections.forEach((s) => s.classList.toggle("active-section", s.id === id));
  }

  function closeSidebarOnMobile() {
    if (window.innerWidth <= 1000) {
      sidebar?.classList.remove("open");
      sidebar?.classList.add("closed");
    }
  }

  function initSidebarState() {
    if (!sidebar) return;

    if (window.innerWidth <= 1000) {
      sidebar.classList.add("closed");
      sidebar.classList.remove("open");
    } else {
      sidebar.classList.remove("closed");
      sidebar.classList.remove("open");
    }
  }

  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      showSection(btn.dataset.section);
      closeSidebarOnMobile();

      if (btn.dataset.section === "teacher-lectures") loadTeacherLectures();
      if (btn.dataset.section === "moderation") loadAdminAnnouncements();
    });
  });

  hamburger?.addEventListener("click", () => {
    if (!sidebar || window.innerWidth > 1000) return;

    const isOpen = sidebar.classList.contains("open");
    if (isOpen) {
      sidebar.classList.remove("open");
      sidebar.classList.add("closed");
    } else {
      sidebar.classList.remove("closed");
      sidebar.classList.add("open");
    }
  });

  document.addEventListener("click", (e) => {
    if (
      window.innerWidth <= 1000 &&
      sidebar?.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      !hamburger?.contains(e.target)
    ) {
      sidebar.classList.remove("open");
      sidebar.classList.add("closed");
    }
  });

  window.addEventListener("resize", initSidebarState);
  initSidebarState();
  showSection("users");

  // -------------------
  // Fetch wrapper
  // -------------------
  async function authFetch(url, opts = {}) {
    opts.headers = opts.headers || {};
    opts.headers["Authorization"] = `Bearer ${token}`;
    opts.headers["Accept"] = "application/json";

    try {
      const res = await fetch(url, opts);
      if (!res.ok) {
        let msg = await res.text();
        try {
          msg = JSON.parse(msg).message;
        } catch {}
        throw new Error(msg || "Request failed");
      }
      if (res.status === 204) return null;
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  // -------------------
  // Users
  // -------------------
  async function loadAll() {
    try {
      const users = await authFetch(`${API_BASE}/`);
      renderUsers(users || []);
      renderStats(users || []);
      renderCharts(users || []);
    } catch (e) {
      console.error(e);
      alert("Failed loading users");
    }
  }

  function renderUsers(users) {
    const q = (searchInput?.value || "").toLowerCase();
    const role = roleFilter?.value || "";

    const filtered = users.filter((u) => {
      if (role && u.role !== role) return false;

      if (
        q &&
        !(
          String(u.username || "").toLowerCase().includes(q) ||
          String(u.email || "").toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });

    if (!userTableBody) return;

    userTableBody.innerHTML = "";
    filtered.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.role)}</td>
        <td>${escapeHtml(
          u.status || (u.approved ? "approved" : u.rejected ? "rejected" : "pending")
        )}</td>
        <td>
          <button class="btn" data-id="${u._id}" data-action="edit">Edit</button>
          <button class="btn delete" data-id="${u._id}" data-action="delete">Delete</button>
        </td>
      `;
      userTableBody.appendChild(tr);
    });

    userTableBody.querySelectorAll("[data-action='edit']").forEach((btn) =>
      btn.addEventListener("click", () => openEdit(btn.dataset.id))
    );

    userTableBody.querySelectorAll("[data-action='delete']").forEach((btn) =>
      btn.addEventListener("click", () => deleteUser(btn.dataset.id))
    );
  }

  async function loadPending() {
    try {
      const users = await authFetch(`${API_BASE}/`);
      const pending = users.filter(
        (u) =>
          u.role === "teacher" &&
          (u.status === "pending" || (!u.approved && !u.rejected))
      );

      if (!approvalTableBody) return;

      approvalTableBody.innerHTML = "";

      pending.forEach((t) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(t.username)}</td>
          <td>${escapeHtml(t.email)}</td>
          <td>
            ${
              t.idProof
                ? `<button class="view-link" data-file="${escapeAttr(t.idProof)}">View ID Proof</button>`
                : "No Document"
            }
          </td>
          <td>
            <button class="approve" data-id="${t._id}">Approve</button>
            <button class="reject" data-id="${t._id}">Reject</button>
          </td>
        `;
        approvalTableBody.appendChild(tr);
      });

      approvalTableBody.querySelectorAll(".view-link").forEach((btn) => {
        btn.addEventListener("click", () => previewIdProof(btn.dataset.file));
      });

      approvalTableBody.querySelectorAll(".approve").forEach((btn) =>
        btn.addEventListener("click", () => approveTeacher(btn.dataset.id))
      );

      approvalTableBody.querySelectorAll(".reject").forEach((btn) =>
        btn.addEventListener("click", () => rejectTeacher(btn.dataset.id))
      );
    } catch (e) {
      console.error("ERROR: loadPending()", e);
    }
  }

  function renderStats(users) {
    if (statTotal) statTotal.textContent = users.length;
    if (statStudents) statStudents.textContent = users.filter((u) => u.role === "student").length;
    if (statTeachers) statTeachers.textContent = users.filter((u) => u.role === "teacher").length;
    if (statPending) {
      statPending.textContent = users.filter(
        (u) =>
          u.role === "teacher" &&
          (u.status === "pending" || (!u.approved && !u.rejected))
      ).length;
    }
  }

  function renderCharts(users) {
    const students = users.filter((u) => u.role === "student").length;
    const teachers = users.filter((u) => u.role === "teacher").length;
    const admins = users.filter((u) => u.role === "admin").length;

    const pending = users.filter(
      (u) => u.status === "pending" || (u.role === "teacher" && !u.approved)
    ).length;
    const approved = users.filter((u) => u.approved).length;
    const rejected = users.filter((u) => u.rejected).length;

    try {
      const ctxR = document.getElementById("roleChart")?.getContext("2d");
      if (ctxR) {
        if (roleChart) roleChart.destroy();
        roleChart = new Chart(ctxR, {
          type: "pie",
          data: {
            labels: ["Students", "Teachers", "Admins"],
            datasets: [{ data: [students, teachers, admins] }],
          },
        });
      }
    } catch {}

    try {
      const ctxA = document.getElementById("approvalChart")?.getContext("2d");
      if (ctxA) {
        if (approvalChart) approvalChart.destroy();
        approvalChart = new Chart(ctxA, {
          type: "bar",
          data: {
            labels: ["Pending", "Approved", "Rejected"],
            datasets: [{ label: "Count", data: [pending, approved, rejected] }],
          },
        });
      }
    } catch {}
  }

  async function approveTeacher(id) {
    try {
      const res = await fetch(`${API_BASE}/approve/${id}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.ok) {
        alert("Teacher approved successfully!");
        loadPending();
        loadAll();
      } else {
        alert("Approve failed: " + data.message);
      }
    } catch {
      alert("Approve failed: Server error");
    }
  }

  async function rejectTeacher(id) {
    try {
      const res = await fetch(`${API_BASE}/reject/${id}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.ok) {
        alert("Teacher rejected successfully!");
        loadPending();
        loadAll();
      } else {
        alert("Reject failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Reject failed: Server error");
    }
  }

  async function previewIdProof(fileName) {
    const res = await fetch(`${API_BASE}/id-proof/${fileName}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Failed to load ID Proof");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async function deleteUser(id) {
    if (!confirm("Delete user?")) return;
    try {
      await authFetch(`${API_BASE}/${id}`, { method: "DELETE" });
      alert("User deleted");
      loadAll();
      loadPending();
    } catch (e) {
      alert("Delete failed");
      console.error(e);
    }
  }

  async function openEdit(id) {
    try {
      const u = await authFetch(`${API_BASE}/${id}`);

      editId.value = u._id;
      editUsername.value = u.username;
      editEmail.value = u.email;
      editRole.value = u.role;
      editStatus.value =
        u.status || (u.approved ? "approved" : u.rejected ? "rejected" : "pending");

      editModal?.classList.add("active");
    } catch (e) {
      alert("Failed loading user");
      console.error(e);
    }
  }

  saveEdit?.addEventListener("click", async () => {
    const id = editId.value;

    const payload = {
      username: editUsername.value,
      email: editEmail.value,
      role: editRole.value,
      status: editStatus.value,
    };

    try {
      await authFetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      alert("User updated");
      editModal?.classList.remove("active");
      loadAll();
      loadPending();
    } catch (e) {
      alert("Update failed");
      console.error(e);
    }
  });

  cancelEdit?.addEventListener("click", () => editModal?.classList.remove("active"));

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("sl_token");
    localStorage.removeItem("sl_username");
    window.location.replace("index.html");
  });

  // -------------------
  // Teacher Lectures
  // -------------------
  async function loadTeacherLectures() {
    if (!lecturesGrid) return;
    lecturesGrid.innerHTML = "⏳ Loading teacher lectures...";

    try {
      const res = await fetch(ADMIN_VIDEO_API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const videos = await res.json();
      renderTeacherLectures(videos);
    } catch (err) {
      console.error(err);
      lecturesGrid.innerHTML = "❌ Failed to load lectures";
    }
  }

  function renderTeacherLectures(videos) {
    if (!lecturesGrid) return;

    if (!videos.length) {
      lecturesGrid.innerHTML = "🚫 No teacher lectures found";
      return;
    }

    lecturesGrid.innerHTML = videos
      .map((v) => {
        const videoId = extractVideoId(v.youtubeUrl);
        const isBlocked = v.status === "draft";

        return `
          <div class="lecture-card ${isBlocked ? "blocked" : ""}">
            <div class="video-frame">
              <iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>
              <span class="status ${isBlocked ? "blocked" : "active"}">
                ${isBlocked ? "Blocked" : "Published"}
              </span>
            </div>

            <div class="lecture-content">
              <h3>${escapeHtml(v.title)}</h3>

              <p class="teacher-name">
                👨‍🏫 ${escapeHtml(v.teacherId?.username || "Unknown Teacher")}
                <span>${escapeHtml(v.teacherId?.email || "")}</span>
              </p>

              <div class="lecture-actions">
                <button class="btn edit" onclick="window.editLecture('${v._id}')">Edit</button>

                <button class="btn ${isBlocked ? "unblock" : "block"}"
                  onclick="window.toggleLecture('${v._id}', ${!isBlocked})">
                  ${isBlocked ? "Unblock" : "Block"}
                </button>

                <button class="btn delete" onclick="window.deleteLecture('${v._id}')">
                  Delete
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  async function toggleLecture(id, block) {
    if (!confirm(`Are you sure you want to ${block ? "block" : "unblock"} this lecture?`)) return;

    try {
      await fetch(`${ADMIN_VIDEO_API}/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ block }),
      });

      loadTeacherLectures();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update lecture status");
    }
  }

  async function deleteLecture(id) {
    if (!confirm("⚠️ Delete this lecture permanently?")) return;

    try {
      await fetch(`${ADMIN_VIDEO_API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      loadTeacherLectures();
    } catch {
      alert("❌ Failed to delete lecture");
    }
  }

  async function filterLectures() {
    const query = lectureSearchInput?.value.trim().toLowerCase() || "";
    const status = statusFilter?.value || "";

    try {
      const res = await fetch(ADMIN_VIDEO_API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let videos = await res.json();

      videos = videos.filter((v) => {
        const title = v.title?.toLowerCase() || "";
        const teacherName = v.teacherId?.username?.toLowerCase() || "";
        const teacherEmail = v.teacherId?.email?.toLowerCase() || "";

        const matchesSearch =
          title.includes(query) ||
          teacherName.includes(query) ||
          teacherEmail.includes(query);

        const matchesStatus =
          status === "All" ||
          status === "" ||
          (status === "Active" && v.status === "published") ||
          (status === "Blocked" && v.status === "draft");

        return matchesSearch && matchesStatus;
      });

      renderTeacherLectures(videos);
    } catch (err) {
      console.error("Search failed:", err);
    }
  }

  function editLecture(id) {
    alert("✏️ Edit lecture modal coming next");
  }

  function extractVideoId(url) {
    const reg =
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url?.match(reg);
    return match ? match[1] : "";
  }

  window.toggleLecture = toggleLecture;
  window.deleteLecture = deleteLecture;
  window.editLecture = editLecture;

  lectureSearchInput?.addEventListener("input", filterLectures);
  statusFilter?.addEventListener("change", filterLectures);
  refreshLecturesBtn?.addEventListener("click", loadTeacherLectures);

  // -------------------
  // Moderation
  // -------------------
  async function loadAdminAnnouncements() {
    try {
      const res = await fetch(`${ROOT_API}/announcements/admin/all`, {
        headers: { Authorization: "Bearer " + token },
      });

      const announcements = await res.json();

      if (!moderationBody) return;
      moderationBody.innerHTML = "";

      if (!announcements.length) {
        moderationBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align:center;">No announcements found</td>
          </tr>
        `;
        return;
      }

      announcements.forEach((a) => {
        moderationBody.innerHTML += `
          <tr>
            <td>${escapeHtml(a.message)}</td>
            <td>${escapeHtml(a.postedBy?.username || "Deleted User")}</td>
            <td>Announcement</td>
            <td>
              <button class="btn delete" onclick="window.deleteAnnouncement('${a._id}')">🗑 Delete</button>
            </td>
          </tr>
        `;
      });
    } catch (err) {
      console.error("Failed to load announcements", err);
    }
  }

  async function deleteAnnouncement(id) {
    if (!confirm("Delete this announcement?")) return;

    await fetch(`${ROOT_API}/announcements/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    });

    loadAdminAnnouncements();
  }

  window.deleteAnnouncement = deleteAnnouncement;

  // -------------------
  // Doubts
  // -------------------
  async function loadDoubtAnalytics() {
    const res = await fetch(`${ROOT_API}/admin/doubts/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    document.getElementById("totalDoubts").innerText = data.total || 0;
    document.getElementById("pendingDoubts").innerText = data.pending || 0;
    document.getElementById("answeredDoubts").innerText = data.answered || 0;
    document.getElementById("avgTime").innerText =
      data.avgResponseTime ? `${data.avgResponseTime} min` : "0 min";
  }

  async function loadAdminDoubts() {
    const res = await fetch(`${ROOT_API}/admin/doubts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("Failed to load admin doubts");
      return;
    }

    const doubts = await res.json();

    const tbody = document.getElementById("doubtAnalyticsBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    doubts.forEach((d) => {
      tbody.innerHTML += `
        <tr>
          <td>${escapeHtml(d.student?.username || "Unknown")}</td>
          <td>${escapeHtml(d.question)}</td>
          <td>${d.isAnswered ? "Answered" : "Pending"}</td>
          <td>${new Date(d.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="btn delete" onclick="window.deleteDoubt('${d._id}')">🗑</button>
          </td>
        </tr>
      `;
    });
  }

  async function deleteDoubt(id) {
    if (!confirm("Delete this doubt?")) return;

    const res = await fetch(`${ROOT_API}/admin/doubts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadAdminDoubts();
      loadDoubtAnalytics();
    } else {
      console.error("Failed to delete doubt");
    }
  }

  window.deleteDoubt = deleteDoubt;

  // -------------------
  // Settings
  // -------------------
  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  async function loadSettings() {
    const res = await fetch(SETTINGS_API, { headers: headers() });
    const s = await res.json();

    document.getElementById("platformName").value = s.platformName || "SmartLearn";
    document.getElementById("supportEmail").value =
      s.supportEmail || "smartlearn526@gmail.com";

    document.getElementById("maintenanceMode").checked = !!s.maintenanceMode;
    document.getElementById("enableSignup").checked = !!s.allowNewSignups;

    document.getElementById("emailVerification").checked =
      !!s.requireEmailVerification;
    document.getElementById("sessionTimeout").value =
      s.sessionTimeoutMinutes ?? 60;
    document.getElementById("maxAttempts").value = s.maxLoginAttempts ?? 5;

    document.getElementById("maxUpload").value = String(s.maxUploadMB ?? 10);
    document.getElementById("allowedTypes").value = s.allowedTypes || "pdf";
    document.getElementById("autoCleanup").checked = !!s.autoCleanup;
  }

  async function saveAllSettings(payload) {
    const res = await fetch(SETTINGS_API, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Save failed");
    alert("Saved ✅");
  }

  document.getElementById("savePlatform")?.addEventListener("click", () => {
    saveAllSettings({
      platformName: document.getElementById("platformName").value.trim(),
      supportEmail: document.getElementById("supportEmail").value.trim(),
      maintenanceMode: document.getElementById("maintenanceMode").checked,
      allowNewSignups: document.getElementById("enableSignup").checked,
    });
  });

  document.getElementById("saveSecurity")?.addEventListener("click", () => {
    saveAllSettings({
      requireEmailVerification: document.getElementById("emailVerification").checked,
      sessionTimeoutMinutes: Number(
        document.getElementById("sessionTimeout").value || 60
      ),
      maxLoginAttempts: Number(document.getElementById("maxAttempts").value || 5),
    });
  });

  document.getElementById("saveUploads")?.addEventListener("click", () => {
    saveAllSettings({
      maxUploadMB: Number(document.getElementById("maxUpload").value || 10),
      allowedTypes: document.getElementById("allowedTypes").value,
      autoCleanup: document.getElementById("autoCleanup").checked,
    });
  });

  // initial
  loadAll();
  loadPending();
  loadDoubtAnalytics();
  loadAdminDoubts();
  loadSettings();

  searchInput?.addEventListener("input", loadAll);
  roleFilter?.addEventListener("change", loadAll);
  refreshBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (roleFilter) roleFilter.value = "";
    loadAll();
  });
})();
