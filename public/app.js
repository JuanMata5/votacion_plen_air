const galleryGrid = document.getElementById('galleryGrid');
const emptyMessage = document.getElementById('emptyMessage');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const artistFilter = document.getElementById('artistFilter');
const rankingButton = document.getElementById('rankingButton');
const voteEmailForm = document.getElementById('voteEmailForm');
const voteEmailInput = document.getElementById('voteEmail');
const emailSavedMessage = document.getElementById('emailSavedMessage');

const submissionEmailForm = document.getElementById('submissionEmailForm');
const submissionVerifyForm = document.getElementById('submissionVerifyForm');
const submissionEmailInput = document.getElementById('submissionEmail');
const requestCodeButton = document.getElementById('requestCodeButton');
const submissionCodeInput = document.getElementById('submissionCode');
const verifyCodeButton = document.getElementById('verifyCodeButton');
const submissionForm = document.getElementById('submissionForm');
const submissionTitle = document.getElementById('submissionTitle');
const submissionAuthor = document.getElementById('submissionAuthor');
const submissionCategory = document.getElementById('submissionCategory');
const submissionDescription = document.getElementById('submissionDescription');
const submissionImage = document.getElementById('submissionImage');
const submitArtworkButton = document.getElementById('submitArtworkButton');
const submissionMessage = document.getElementById('submissionMessage');

const STORAGE_KEY = 'art_gallery_visitor_id';
const STORAGE_EMAIL = 'art_gallery_vote_email';
const STORAGE_SUBMISSION_EMAIL = 'art_gallery_submission_email';
let visitorId = localStorage.getItem(STORAGE_KEY);
let verifiedEmail = localStorage.getItem(STORAGE_EMAIL);
let submissionEmail = localStorage.getItem(STORAGE_SUBMISSION_EMAIL);
let submissionVerified = false;

if (!visitorId) {
  visitorId = crypto.randomUUID?.() || generateUUID();
  localStorage.setItem(STORAGE_KEY, visitorId);
}

if (verifiedEmail && voteEmailInput) {
  voteEmailInput.value = verifiedEmail;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function fetchArtworks() {
  if (!galleryGrid || !emptyMessage || !searchInput || !categoryFilter || !artistFilter) {
    return;
  }

  const params = new URLSearchParams();
  const category = categoryFilter.value;
  const search = searchInput.value.trim();
  const artist = artistFilter.value.trim();

  if (category) params.set('category', category);
  if (search) params.set('search', search);
  if (artist) params.set('artist', artist);
  if (visitorId) params.set('visitorId', visitorId);

  const response = await fetch(`/api/artworks?${params.toString()}`);
  if (!response.ok) {
    galleryGrid.innerHTML = '<p class="empty-message">Error al cargar obras.</p>';
    return;
  }

  const artworks = await response.json();
  renderGallery(artworks);
}

function renderGallery(artworks) {
  if (!galleryGrid || !emptyMessage) {
    return;
  }

  if (!artworks.length) {
    galleryGrid.innerHTML = '';
    emptyMessage.textContent = 'No hay obras para mostrar con esos filtros.';
    return;
  }

  emptyMessage.textContent = '';
  galleryGrid.innerHTML = artworks
    .map((artwork) => {
      const disabled = artwork.voted || !verifiedEmail;
      const label = artwork.voted ? 'Ya votaste' : verifiedEmail ? 'Votar ahora' : 'Guarda tu correo para votar';
      return `
      <article class="card">
        <img src="${artwork.image_url}" alt="${artwork.title}" />
        <div class="card-body">
          <span class="badge">${artwork.category}</span>
          <h3 class="card-title">${artwork.title}</h3>
          <p class="card-text">${artwork.description}</p>
          <div class="meta-row">
            <span>By ${artwork.author}</span>
            <span>${artwork.votes} votos</span>
          </div>
          <button class="vote-button" ${disabled ? 'disabled' : ''} data-id="${artwork.id}">
            ${label}
          </button>
        </div>
      </article>
    `;
    })
    .join('');

  document.querySelectorAll('.vote-button').forEach((button) => {
    button.addEventListener('click', handleVote);
  });
}

async function handleVote(event) {
  const button = event.currentTarget;
  const artworkId = button.dataset.id;

  if (!verifiedEmail) {
    alert('Guarda tu correo antes de votar.');
    return;
  }

  button.disabled = true;
  button.textContent = 'Procesando...';

  try {
    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artwork_id: artworkId, visitor_id: visitorId, email: verifiedEmail }),
    });

    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || 'No se pudo votar.');
    }

    button.textContent = 'Ya votaste';
    button.classList.add('voted');
    await fetchArtworks();
  } catch (error) {
    button.disabled = false;
    button.textContent = verifiedEmail ? 'Votar ahora' : 'Guarda tu correo para votar';
    alert(error.message);
  }
}

if (searchInput && categoryFilter && artistFilter && rankingButton) {
  searchInput.addEventListener('input', debounce(fetchArtworks, 300));
  categoryFilter.addEventListener('change', fetchArtworks);
  artistFilter.addEventListener('input', debounce(fetchArtworks, 300));
  rankingButton.addEventListener('click', () => {
    categoryFilter.value = '';
    artistFilter.value = '';
    searchInput.value = '';
    fetchArtworks();
  });
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function updateEmailSavedMessage() {
  if (!emailSavedMessage) {
    return;
  }

  if (verifiedEmail) {
    emailSavedMessage.textContent = `Correo guardado: ${verifiedEmail}`;
    emailSavedMessage.style.color = '#3b2a20';
  } else {
    emailSavedMessage.textContent = 'Debes guardar tu correo antes de votar.';
    emailSavedMessage.style.color = '#7b5a3b';
  }
}

if (voteEmailForm && voteEmailInput) {
  voteEmailForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = voteEmailInput.value.trim();

  try {
    const response = await fetch('/api/voters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, email }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo guardar el correo.');

    verifiedEmail = email;
    localStorage.setItem(STORAGE_EMAIL, email);
    voteEmailInput.value = '';
    updateEmailSavedMessage();
    await fetchArtworks();
    } catch (error) {
      if (emailSavedMessage) {
        emailSavedMessage.textContent = error.message;
        emailSavedMessage.style.color = '#a33';
      }
    }
  });
}

if (emailSavedMessage) {
  updateEmailSavedMessage();
}
if (galleryGrid) {
  fetchArtworks();
}

// Manejo del flujo de envío público: solicitar código, verificar y subir obra
if (submissionEmailInput && requestCodeButton) {
  if (submissionEmail) submissionEmailInput.value = submissionEmail;

  requestCodeButton.addEventListener('click', async () => {
    const email = submissionEmailInput.value.trim();
    if (!email) {
      submissionMessage.textContent = 'Ingresa un correo válido.';
      submissionMessage.style.color = '#a33';
      return;
    }

    try {
      const res = await fetch('/api/submissions/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'No se pudo solicitar código.');

      submissionMessage.textContent = body.message || 'Código solicitado.';
      submissionMessage.style.color = '#3b2a20';
      submissionEmail = email;
      localStorage.setItem(STORAGE_SUBMISSION_EMAIL, email);
      submissionEmailInput.value = '';
      submissionVerifyForm.classList.remove('hidden');
      submissionEmailForm.classList.add('hidden');
      if (body.code) {
        submissionCodeInput.value = body.code;
        verifyCodeButton.click();
      }
    } catch (err) {
      submissionMessage.textContent = err.message;
      submissionMessage.style.color = '#a33';
    }
  });
}

if (submissionVerifyForm && verifyCodeButton) {
  verifyCodeButton.addEventListener('click', async () => {
    const code = submissionCodeInput.value.trim();
    const email = localStorage.getItem(STORAGE_SUBMISSION_EMAIL);
    if (!email || !code) {
      submissionMessage.textContent = 'Email o código faltante.';
      submissionMessage.style.color = '#a33';
      return;
    }

    try {
      const res = await fetch('/api/submissions/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'No se pudo verificar.');

      submissionMessage.textContent = body.message || 'Verificado.';
      submissionMessage.style.color = '#3b2a20';
      submissionVerified = true;
      submissionVerifyForm.classList.add('hidden');
      submissionForm.classList.remove('hidden');
      submitArtworkButton.disabled = false;
    } catch (err) {
      submissionMessage.textContent = err.message;
      submissionMessage.style.color = '#a33';
    }
  });
}

if (submissionForm && submitArtworkButton) {
  submitArtworkButton.addEventListener('click', async () => {
    if (!submissionVerified) {
      submissionMessage.textContent = 'Debe verificar el correo antes de subir.';
      submissionMessage.style.color = '#a33';
      return;
    }

    const title = submissionTitle.value.trim();
    const author = submissionAuthor.value.trim();
    const category = submissionCategory.value.trim();
    const description = submissionDescription.value.trim();
    const file = submissionImage.files[0];
    const email = localStorage.getItem(STORAGE_SUBMISSION_EMAIL);
    const code = submissionCodeInput.value.trim();

    if (!title || !author || !category || !description || !file) {
      submissionMessage.textContent = 'Completa todos los campos.';
      submissionMessage.style.color = '#a33';
      return;
    }

    const form = new FormData();
    form.append('title', title);
    form.append('description', description);
    form.append('category', category);
    form.append('author', author);
    form.append('email', email);
    form.append('code', code);
    form.append('image', file);

    submitArtworkButton.disabled = true;
    submitArtworkButton.textContent = 'Enviando...';

    try {
      const res = await fetch('/api/submissions/upload', {
        method: 'POST',
        body: form,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error al enviar la obra.');

      submissionMessage.textContent = body.message || 'Obra enviada.';
      submissionMessage.style.color = '#3b2a20';
      submissionForm.reset();
      submissionVerified = false;
      localStorage.removeItem(STORAGE_SUBMISSION_EMAIL);
      submissionCodeInput.value = '';
      submitArtworkButton.disabled = true;
      submitArtworkButton.textContent = 'Enviar obra';
      await fetchArtworks();
    } catch (err) {
      submissionMessage.textContent = err.message;
      submissionMessage.style.color = '#a33';
      submitArtworkButton.disabled = false;
      submitArtworkButton.textContent = 'Enviar obra';
    }
  });
}
