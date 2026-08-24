// JARVISS Road Vision AI Web App Frontend

let currentResult = null;
let currentView = "annotated"; // 'annotated', 'mask', 'raw'

document.addEventListener("DOMContentLoaded", () => {
    initControls();
    initDropzone();
    initSamples();
    fetchSystemInfo();
});

function initControls() {
    const confSlider = document.getElementById("conf-slider");
    const confVal = document.getElementById("conf-val");
    confSlider.addEventListener("input", (e) => {
        confVal.textContent = parseFloat(e.target.value).toFixed(2);
    });

    const iouSlider = document.getElementById("iou-slider");
    const iouVal = document.getElementById("iou-val");
    iouSlider.addEventListener("input", (e) => {
        iouVal.textContent = parseFloat(e.target.value).toFixed(2);
    });

    // View tab buttons
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentView = btn.dataset.view;
            updateDisplayedImage();
        });
    });

    // Export report button
    document.getElementById("download-json-btn").addEventListener("click", () => {
        if (!currentResult) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentResult, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `road_damage_report_${Date.now()}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    });
}

function initDropzone() {
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("file-input");
    const browseBtn = document.getElementById("browse-btn");

    browseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

function initSamples() {
    const sampleBtns = document.querySelectorAll(".sample-btn");
    sampleBtns.forEach(btn => {
        btn.addEventListener("click", async () => {
            const imgPath = btn.dataset.img;
            try {
                const response = await fetch(imgPath);
                const blob = await response.blob();
                const file = new File([blob], imgPath.split('/').pop(), { type: blob.type });
                handleFile(file);
            } catch (err) {
                console.error("Failed to load sample image:", err);
            }
        });
    });
}

async function fetchSystemInfo() {
    try {
        const res = await fetch("/api/system-info");
        const data = await res.json();
        if (data.cuda_available) {
            document.getElementById("gpu-status-text").textContent = `GPU: ${data.gpu_model} (CUDA Active)`;
        } else {
            document.getElementById("gpu-status-text").textContent = "Running on CPU (CUDA unavailable)";
        }
    } catch (e) {
        console.warn("Could not fetch system info", e);
    }
}

async function handleFile(file) {
    if (!file.type.startsWith("image/")) {
        alert("Please upload a valid image file.");
        return;
    }

    const promptWrap = document.getElementById("dropzone-prompt");
    const spinner = document.getElementById("loading-spinner");
    promptWrap.style.display = "none";
    spinner.style.display = "flex";

    const conf = parseFloat(document.getElementById("conf-slider").value);
    const iou = parseFloat(document.getElementById("iou-slider").value);
    const imgsz = parseInt(document.getElementById("imgsz-select").value);
    const use_roi = document.getElementById("roi-toggle").checked;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("conf", conf);
    formData.append("iou", iou);
    formData.append("imgsz", imgsz);
    formData.append("use_roi", use_roi);

    try {
        const response = await fetch("/api/predict/image", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server returned error: ${response.statusText}`);
        }

        const data = await response.json();
        currentResult = data;
        renderResults(data);
    } catch (err) {
        alert("Inference failed: " + err.message);
    } finally {
        spinner.style.display = "none";
        promptWrap.style.display = "block";
    }
}

function renderResults(data) {
    // 1. Update metric cards
    const sev = data.severity;
    const badge = document.getElementById("severity-badge");
    badge.style.color = sev.color;
    badge.style.borderColor = sev.color;
    document.getElementById("severity-text").textContent = sev.label;
    document.getElementById("severity-desc").textContent = sev.desc;

    document.getElementById("potholes-count").textContent = data.potholes_count;
    document.getElementById("damage-ratio").textContent = `${data.damage_ratio_percent}%`;
    document.getElementById("speed-fps").textContent = `${data.latency_ms} ms`;
    document.getElementById("fps-label").textContent = `~${data.fps_estimate} FPS`;

    // 2. Show Viewer
    document.getElementById("viewer-section").style.display = "block";
    updateDisplayedImage();

    // 3. Populate Table
    const tbody = document.getElementById("boxes-tbody");
    tbody.innerHTML = "";

    if (data.boxes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No potholes detected in this frame.</td></tr>`;
    } else {
        data.boxes.forEach((box, i) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>#${i + 1}</strong></td>
                <td><span class="badge" style="color: var(--accent-cyan)">${(box.confidence * 100).toFixed(1)}%</span></td>
                <td>[${box.bbox.join(", ")}]</td>
                <td>${box.width_px}px × ${box.height_px}px</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Smooth scroll to results
    document.getElementById("metrics-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function updateDisplayedImage() {
    if (!currentResult) return;
    const imgEl = document.getElementById("main-display-img");
    if (currentView === "annotated") {
        imgEl.src = currentResult.image_annotated;
    } else if (currentView === "mask") {
        imgEl.src = currentResult.image_mask;
    } else {
        imgEl.src = currentResult.image_raw;
    }
}
