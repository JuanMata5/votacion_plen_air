const galleryGrid = document.getElementById('galleryGrid');
const emptyMessage = document.getElementById('emptyMessage');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const artistFilter = document.getElementById('artistFilter');
const rankingButton = document.getElementById('rankingButton');
const voteEmailForm = document.getElementById('voteEmailForm');
const voteEmailInput = document.getElementById('voteEmail');
const emailSavedMessage = document.getElementById('emailSavedMessage');

const STORAGE_KEY = 'art_gallery_visitor_id';
const STORAGE_EMAIL = 'art_gallery_vote_email';
let visitorId = localStorage.getItem(STORAGE_KEY);
let verifiedEmail = localStorage.getItem(STORAGE_EMAIL);

if (!visitorId) {
  visitorId = crypto.randomUUID?.() || generateUUID();
  localStorage.setItem(STORAGE_KEY, visitorId);
}

if (verifiedEmail) {
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

function updateEmailSavedMessage() {
  if (verifiedEmail) {
    emailSavedMessage.textContent = `Correo guardado: ${verifiedEmail}`;
    emailSavedMessage.style.color = '#3b2a20';
  } else {
    emailSavedMessage.textContent = 'Debes guardar tu correo antes de votar.';
    emailSavedMessage.style.color = '#7b5a3b';
  }
}

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
    emailSavedMessage.textContent = error.message;
    emailSavedMessage.style.color = '#a33';
  }
});

updateEmailSavedMessage();
fetchArtworks();
