const DB_NAME = "LollaLabsDB";
const DB_VERSION = 2;
const STORE_NAME = "modelos";
const MAX_PORTFOLIO_SIZE = 10 * 1024 * 1024;

const state = {
    db: null,
    portfolioFile: null,
    bookFiles: []
};

const profileSection = document.getElementById("profile-section");
const uploadSection = document.getElementById("upload-section");
const successScreen = document.getElementById("success-screen");
const nextButton = document.getElementById("next-button");
const backButton = document.getElementById("back-button");
const submitButton = document.getElementById("submit-button");
const restartButton = document.getElementById("restart-button");
const dropZone = document.getElementById("drop-zone");
const inputFiles = document.getElementById("files");
const portfolioInput = document.getElementById("portfolio-file");
const previewContainer = document.getElementById("preview-container");
const portfolioPreview = document.getElementById("portfolio-preview");
const portfolioSummary = document.getElementById("portfolio-summary");
const bookSummary = document.getElementById("book-summary");
const dbStatus = document.getElementById("db-status");
const successMessage = document.getElementById("success-message");

const textFields = ["name", "email", "phone", "social", "height", "age"].map((id) => document.getElementById(id));

const dbReady = openDatabase();

if (nextButton) {
    nextButton.addEventListener("click", showUploadScreen);
}

if (backButton) {
    backButton.addEventListener("click", () => setActiveScreen(profileSection));
}

if (submitButton) {
    submitButton.addEventListener("click", finalizarCadastro);
}

if (restartButton) {
    restartButton.addEventListener("click", resetForm);
}

textFields.forEach((field) => {
    field?.addEventListener("input", () => field.classList.remove("field-error"));
});

if (portfolioInput) {
    portfolioInput.addEventListener("change", (event) => {
        const [file] = event.target.files || [];

        if (!file) {
            state.portfolioFile = null;
            renderPortfolioInfo();
            return;
        }

        if (file.size > MAX_PORTFOLIO_SIZE) {
            alert("O portfolio digital precisa ter ate 10 MB.");
            portfolioInput.value = "";
            state.portfolioFile = null;
            renderPortfolioInfo();
            return;
        }

        state.portfolioFile = file;
        renderPortfolioInfo();
    });
}

if (dropZone && inputFiles) {
    dropZone.addEventListener("click", () => inputFiles.click());

    ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.add("drop-zone--over");
        });
    });

    ["dragleave", "dragend", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.remove("drop-zone--over");
        });
    });

    dropZone.addEventListener("drop", (event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        handleBookFiles(files);
    });

    inputFiles.addEventListener("change", (event) => {
        const files = Array.from(event.target.files || []);
        handleBookFiles(files);
        inputFiles.value = "";
    });
}

renderPortfolioInfo();
renderBookSummary();

function openDatabase() {
    return new Promise((resolve, reject) => {
        if (!("indexedDB" in window)) {
            updateDbStatus("IndexedDB indisponivel neste navegador.");
            reject(new Error("IndexedDB indisponivel."));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "email" });
            }
        };

        request.onsuccess = (event) => {
            state.db = event.target.result;
            updateDbStatus("Banco local pronto para receber cadastros.");
            resolve(state.db);
        };

        request.onerror = (event) => {
            updateDbStatus("Erro ao conectar o banco local.");
            reject(event.target.error);
        };
    });
}

function updateDbStatus(message) {
    if (dbStatus) {
        dbStatus.textContent = message;
    }
}

function setActiveScreen(activeSection, previousSection) {
    [profileSection, uploadSection, successScreen].forEach((section) => {
        section?.classList.remove("active-screen");
    });

    if (previousSection) {
        previousSection.classList.remove("active-screen");
    }

    activeSection?.classList.add("active-screen");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showUploadScreen() {
    const isValid = validateProfileForm();

    if (!isValid) {
        alert("Preencha todos os dados e envie o portfolio digital para continuar.");
        return;
    }

    setActiveScreen(uploadSection, profileSection);
}

function validateProfileForm() {
    let allValid = true;

    textFields.forEach((field) => {
        if (!field) {
            return;
        }

        const isEmpty = field.value.trim() === "";
        field.classList.toggle("field-error", isEmpty);
        allValid = allValid && !isEmpty;
    });

    if (!state.portfolioFile) {
        portfolioPreview?.classList.add("field-error");
        allValid = false;
    } else {
        portfolioPreview?.classList.remove("field-error");
    }

    return allValid;
}

function handleBookFiles(files) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (!imageFiles.length) {
        return;
    }

    imageFiles.forEach((file) => {
        const alreadyExists = state.bookFiles.some(
            (item) =>
                item.file.name === file.name &&
                item.file.size === file.size &&
                item.file.lastModified === file.lastModified
        );

        if (!alreadyExists) {
            state.bookFiles.push({
                file,
                previewUrl: URL.createObjectURL(file)
            });
        }
    });

    renderBookPreviews();
    renderBookSummary();
}

function renderPortfolioInfo() {
    if (!portfolioPreview || !portfolioSummary) {
        return;
    }

    portfolioPreview.classList.remove("field-error");

    if (!state.portfolioFile) {
        portfolioPreview.innerHTML = "Nenhum portfolio selecionado.";
        portfolioPreview.classList.add("empty-state");
        portfolioSummary.textContent = "Arquivo ainda nao enviado.";
        return;
    }

    portfolioPreview.classList.remove("empty-state");
    portfolioPreview.innerHTML = `
        <strong>${escapeHtml(state.portfolioFile.name)}</strong>
        <small>${formatFileSize(state.portfolioFile.size)} - ${escapeHtml(state.portfolioFile.type || "arquivo")}</small>
    `;
    portfolioSummary.textContent = `${state.portfolioFile.name} (${formatFileSize(state.portfolioFile.size)})`;
}

function renderBookPreviews() {
    if (!previewContainer) {
        return;
    }

    previewContainer.innerHTML = "";

    state.bookFiles.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "preview-container-item";

        const image = document.createElement("img");
        image.className = "preview-img";
        image.src = item.previewUrl;
        image.alt = `Foto ${index + 1} do book`;

        const tag = document.createElement("span");
        tag.className = "preview-tag";
        tag.textContent = `Foto ${index + 1}`;

        card.appendChild(image);
        card.appendChild(tag);
        previewContainer.appendChild(card);
    });
}

function renderBookSummary() {
    if (!bookSummary) {
        return;
    }

    if (!state.bookFiles.length) {
        bookSummary.textContent = "Nenhuma foto adicionada.";
        return;
    }

    const label = state.bookFiles.length === 1 ? "foto pronta" : "fotos prontas";
    bookSummary.textContent = `${state.bookFiles.length} ${label} para envio.`;
}

async function finalizarCadastro() {
    if (!validateProfileForm()) {
        alert("Revise os dados do perfil antes de salvar o casting.");
        setActiveScreen(profileSection, uploadSection);
        return;
    }

    if (!state.bookFiles.length) {
        alert("Adicione pelo menos uma foto ao book antes de finalizar.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Salvando casting...";

    try {
        const db = await dbReady;
        const fichaModelo = await buildCastingRecord();

        await saveCastingRecord(db, fichaModelo);

        successMessage.textContent = `Cadastro salvo para ${fichaModelo.nome}. O material esta pronto no IndexedDB local.`;
        setActiveScreen(successScreen, uploadSection);
    } catch (error) {
        if (error?.name === "ConstraintError") {
            alert("Este e-mail ja possui um casting salvo neste dispositivo.");
        } else {
            console.error("Erro ao salvar casting", error);
            alert("Nao foi possivel salvar o casting no banco local.");
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Finalizar e salvar casting";
    }
}

async function buildCastingRecord() {
    const [portfolioDigital, book] = await Promise.all([
        serializeFile(state.portfolioFile),
        Promise.all(state.bookFiles.map((item) => serializeFile(item.file)))
    ]);

    return {
        nome: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim().toLowerCase(),
        contato: {
            whatsapp: document.getElementById("phone").value.trim(),
            instagram: document.getElementById("social").value.trim()
        },
        caracteristicas: {
            altura: document.getElementById("height").value.trim(),
            idade: document.getElementById("age").value.trim()
        },
        portfolioDigital,
        book,
        data_envio: new Date().toISOString()
    };
}

function saveCastingRecord(db, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const addRequest = store.add(data);

        addRequest.onsuccess = () => resolve();
        addRequest.onerror = (event) => reject(event.target.error);
    });
}

function serializeFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve({
                nome: file.name,
                tipo: file.type || "application/octet-stream",
                tamanho: file.size,
                ultima_atualizacao: file.lastModified,
                conteudo: reader.result
            });
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function resetForm() {
    textFields.forEach((field) => {
        if (!field) {
            return;
        }

        field.value = "";
        field.classList.remove("field-error");
    });

    if (portfolioInput) {
        portfolioInput.value = "";
    }

    if (inputFiles) {
        inputFiles.value = "";
    }

    state.portfolioFile = null;
    state.bookFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    state.bookFiles = [];

    renderPortfolioInfo();
    renderBookPreviews();
    renderBookSummary();
    setActiveScreen(profileSection, successScreen);
}

function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./sw.js")
            .then((registration) => registration.update())
            .catch((error) => console.log("PWA: erro ao registrar SW", error));
    });
}
