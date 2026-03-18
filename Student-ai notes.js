(() => {
  console.log("✅ AI Notes Section Loaded");

  const API_BASE = window.APP_CONFIG.API_BASE;

  const section = document.getElementById("ai-notes");
  if (!section) return;

  const fileInput = section.querySelector("#aiFileInput");
  const outputBox = section.querySelector(".output-box");
  const buttons = section.querySelectorAll(".ai-btn");
  const downloadBtn = section.querySelector(".download-btn");

  let uploadedFile = null;
  let generatedText = "";

  const API_URL = `${API_BASE}/ai-notes/generate-notes`;

  section.addEventListener("click", (e) => e.stopPropagation());

  fileInput.addEventListener("change", () => {
    uploadedFile = fileInput.files[0];

    if (!uploadedFile) return;

    outputBox.innerHTML = `
      <p>📄 <b>${uploadedFile.name}</b> uploaded successfully</p>
      <p class="muted">Choose what you want to generate 👇</p>
    `;
  });

  buttons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!uploadedFile) {
        alert("Please upload a document first");
        return;
      }

      const type = btn.dataset.type;

      outputBox.innerHTML = `<p>⏳ Generating ${type}...</p>`;
      buttons.forEach((b) => (b.disabled = true));

      try {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("type", type);

        const res = await fetch(API_URL, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "AI failed");
        }

        generatedText = data.notes;

        outputBox.innerHTML = `
          <pre style="white-space:pre-wrap;line-height:1.7;">${generatedText}</pre>
        `;
      } catch (err) {
        console.error("AI Notes Error:", err);
        outputBox.innerHTML =
          `<p style="color:red;">❌ Failed to generate AI notes</p>`;
      } finally {
        buttons.forEach((b) => (b.disabled = false));
      }
    });
  });

  downloadBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!generatedText) {
      alert("Generate notes first");
      return;
    }

    html2pdf()
      .set({
        filename: "SmartLearn_AI_Notes.pdf",
        margin: 0.5,
        html2canvas: { scale: 2 },
        jsPDF: { format: "a4", orientation: "portrait" },
      })
      .from(outputBox)
      .save();
  });
})();