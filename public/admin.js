const adminTokenInput = document.getElementById('adminToken');
const loadPendingButton = document.getElementById('loadPendingButton');
const loadRankingButton = document.getElementById('loadRankingButton');
const adminContent = document.getElementById('adminContent');
const adminMessage = document.getElementById('adminMessage');

function showMessage(message, type = 'info') {
  adminMessage.textContent = message;
  adminMessage.style.color = type === 'error' ? '#a33' : '#3b2a20';
}

async function fetchAdmin(path, options = {}) {
  const token = adminTokenInput.value.trim();
  if (!token) {
    showMessage('Ingresa el token administrativo.', 'error');
    throw new Error('admin token missing');
  }
  const response = await fetch(`/api/admin/${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
    },
    ...options,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error administrativo');
  }
  return response.json();
}

function renderPending(artworks) {
  adminContent.innerHTML = artworks
    .map((item) => `
      <div class="admin-card">
        <h3>${item.title}</h3>
        <p><strong>Autor:</strong> ${item.author} · <strong>Categoría:</strong> ${item.category}</p>
        <p>${item.description}</p>
        <div class="admin-actions">
          <button onclick="approveArtwork(${item.id})">Aprobar</button>
          <button onclick="rejectArtwork(${item.id})">Rechazar</button>
        </div>
      </div>
    `)
    .join('');
}

function renderRanking(artworks) {
  adminContent.innerHTML = artworks
    .map((item) => `
      <div class="admin-card">
        <h3>${item.title}</h3>
        <p><strong>Autor:</strong> ${item.author} · <strong>Votos:</strong> ${item.votes}</p>
      </div>
    `)
    .join('');
}

window.approveArtwork = async (artworkId) => {
  try {
    await fetchAdmin('approve', {
      method: 'POST',
      body: JSON.stringify({ artworkId }),
    });
    showMessage('Obra aprobada.');
    loadPending();
  } catch (error) {
    showMessage(error.message, 'error');
  }
};

window.rejectArtwork = async (artworkId) => {
  try {
    await fetchAdmin('reject', {
      method: 'POST',
      body: JSON.stringify({ artworkId }),
    });
    showMessage('Obra rechazada.');
    loadPending();
  } catch (error) {
    showMessage(error.message, 'error');
  }
};

async function loadPending() {
  try {
    const data = await fetchAdmin('pending');
    renderPending(data);
    showMessage('Pendientes cargadas.');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function loadRanking() {
  try {
    const data = await fetchAdmin('ranking');
    renderRanking(data);
    showMessage('Ranking cargado.');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

loadPendingButton.addEventListener('click', loadPending);
loadRankingButton.addEventListener('click', loadRanking);
