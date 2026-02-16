import { API_BASE } from "./config.js";

document.getElementById("resetBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const msg = document.getElementById("msg");
  const btn = document.getElementById("resetBtn");

  msg.textContent = "";
  msg.className = "msg";

  if (!email) {
    msg.textContent = "Please enter your email.";
    msg.classList.add("error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    // If server returns non-JSON error
    let data = {};
    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      msg.textContent = data.message || "Failed to send reset link.";
      msg.classList.add("error");
      return;
    }

    msg.textContent = data.message || "Check your email for reset link!";
    msg.classList.add(data.success ? "success" : "success");
  } catch (err) {
    msg.textContent = "Something went wrong. Try again later.";
    msg.classList.add("error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Send Reset Link";
  }
});
