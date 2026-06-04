const galleryGrid = document.getElementById('galleryGrid');
const emptyMessage = document.getElementById('emptyMessage');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const artistFilter = document.getElementById('artistFilter');
const rankingButton = document.getElementById('rankingButton');
const requestCodeForm = document.getElementById('requestCodeForm');
const verifyCodeForm = document.getElementById('verifyCodeForm');
const uploadForm = document.getElementById('uploadForm');
const submitEmail = document.getElementById('submitEmail');
const verifyCode = document.getElementById('verifyCode');
const artworkTitle = document.getElementById('artworkTitle');
const artworkDescription = document.getElementById('artworkDescription');
const artworkAuthor = document.getElementById('artworkAuthor');
const artworkCategory = document.getElementById('artworkCategory');
const artworkImage = document.getElementById('artworkImage');
const submissionMessage = document.getElementById('submissionMessage');

const STORAGE_KEY = 'art_gallery_visitor_id';
const STORAGE_EMAIL = 'art_gallery_submission_email';
let visitorId = localStorage.getItem(STORAGE_KEY);
let verifiedEmail = null;
let verifiedCode = null;

if (!visitorId) {
  visitorId = crypto.randomUUID?.() || generateUUID();
  localStorage.setItem(STORAGE_KEY, visitorId);
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function fetchArtworks() {
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
  if (!artworks.length) {
    galleryGrid.innerHTML = '';
    emptyMessage.textContent = 'No hay obras para mostrar con esos filtros.';
    return;
  }

  emptyMessage.textContent = '';
  galleryGrid.innerHTML = artworks
    .map((artwork) => `
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
          <button class="vote-button" ${artwork.voted ? 'disabled' : ''} data-id="${artwork.id}">
            ${artwork.voted ? 'Ya votaste' : 'Votar ahora'}
          </button>
        </div>
      </article>
    `)
    .join('');

  document.querySelectorAll('.vote-button').forEach((button) => {
    button.addEventListener('click', handleVote);
  });
}

async function handleVote(event) {
  const button = event.currentTarget;
  const artworkId = button.dataset.id;
  button.disabled = true;
  button.textContent = 'Procesando...';

  try {
    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artwork_id: artworkId, visitor_id: visitorId }),
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
    button.textContent = 'Votar ahora';
    alert(error.message);
  }
}

searchInput.addEventListener('input', debounce(fetchArtworks, 300));
categoryFilter.addEventListener('change', fetchArtworks);
artistFilter.addEventListener('input', debounce(fetchArtworks, 300));
rankingButton.addEventListener('click', () => {
  categoryFilter.value = '';
  artistFilter.value = '';
  searchInput.value = '';
  fetchArtworks();
});

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

requestCodeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = submitEmail.value.trim();

  try {
    const response = await fetch('/api/submissions/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();

    if (!response.ok) throw new Error(result.error || 'No se pudo enviar el código.');

    verifiedEmail = email;
    localStorage.setItem(STORAGE_EMAIL, email);
    submissionMessage.textContent = result.message;
    if (result.code) {
      submissionMessage.innerHTML += `<br><strong>Código:</strong> ${result.code}`;
    }
    verifyCodeForm.classList.remove('hidden');
  } catch (error) {
    submissionMessage.textContent = error.message;
    submissionMessage.style.color = '#a33';
  }
});

verifyCodeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = verifyCode.value.trim();
  const email = localStorage.getItem(STORAGE_EMAIL);

  try {
    const response = await fetch('/api/submissions/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo verificar el código.');

    verifiedCode = code;
    submissionMessage.textContent = result.message;
    uploadForm.classList.remove('hidden');
  } catch (error) {
    submissionMessage.textContent = error.message;
    submissionMessage.style.color = '#a33';
  }
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = localStorage.getItem(STORAGE_EMAIL);
  const formData = new FormData();

  formData.append('title', artworkTitle.value.trim());
  formData.append('description', artworkDescription.value.trim());
  formData.append('author', artworkAuthor.value.trim());
  formData.append('category', artworkCategory.value);
  formData.append('email', email);
  formData.append('code', verifiedCode);
  formData.append('image', artworkImage.files[0]);

  try {
    const response = await fetch('/api/submissions/upload', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo subir la obra.');

    submissionMessage.textContent = result.message;
    uploadForm.reset();
    artworkCategory.value = 'Pintura';
  } catch (error) {
    submissionMessage.textContent = error.message;
    submissionMessage.style.color = '#a33';
  }
});

fetchArtworks();
