const adminTokenInput = document.getElementById('adminToken');
const loadPendingButton = document.getElementById('loadPendingButton');
const loadApprovedButton = document.getElementById('loadApprovedButton');
const loadAllButton = document.getElementById('loadAllButton');
const loadRankingButton = document.getElementById('loadRankingButton');
const adminContent = document.getElementById('adminContent');
const adminMessage = document.getElementById('adminMessage');
const uploadTitle = document.getElementById('uploadTitle');
const uploadFirstName = document.getElementById('uploadFirstName');
const uploadLastName = document.getElementById('uploadLastName');
const uploadCategory = document.getElementById('uploadCategory');
const uploadYear = document.getElementById('uploadYear');
const uploadMedium = document.getElementById('uploadMedium');
const uploadDescription = document.getElementById('uploadDescription');
const uploadImageUrl = document.getElementById('uploadImageUrl');
const uploadFile = document.getElementById('uploadFile');
const uploadButton = document.getElementById('uploadButton');

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
    let errorText;
    try {
      const errorData = await response.json();
      errorText = errorData.error || errorData.details || JSON.stringify(errorData);
    } catch (parseError) {
      errorText = await response.text();
    }
    throw new Error(errorText || `Error administrativo (${response.status})`);
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
          <button onclick="approveArtwork('${item.id}')">Aprobar</button>
          <button onclick="rejectArtwork('${item.id}')">Rechazar</button>
          <button onclick="deleteArtwork('${item.id}')">Eliminar</button>
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
        <div class="admin-actions">
          <button onclick="deleteArtwork('${item.id}')">Eliminar</button>
        </div>
      </div>
    `)
    .join('');
}

function renderApproved(artworks) {
  adminContent.innerHTML = artworks
    .map((item) => `
      <div class="admin-card">
        <h3>${item.title}</h3>
        <p><strong>Autor:</strong> ${item.author} · <strong>Categoría:</strong> ${item.category}</p>
        <p>${item.description}</p>
        <div class="admin-actions">
          <button onclick="deleteArtwork('${item.id}')">Eliminar</button>
        </div>
      </div>
    `)
    .join('');
}

window.deleteArtwork = async (artworkId) => {
  try {
    await fetchAdmin('delete', {
      method: 'POST',
      body: JSON.stringify({ artworkId }),
    });
    showMessage('Obra eliminada.');
    loadPending();
    loadRanking();
    loadApproved();
  } catch (error) {
    showMessage(error.message, 'error');
  }
};

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

async function loadApproved() {
  try {
    const data = await fetchAdmin('approved');
    renderApproved(data);
    showMessage('Obras subidas cargadas.');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function loadAllArtworks() {
  try {
    const data = await fetchAdmin('all');
    renderApproved(data);
    showMessage('Todas las obras cargadas.');
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

async function uploadArtwork(event) {
  event.preventDefault();
  const token = adminTokenInput.value.trim();
  if (!token) {
    showMessage('Ingresa el token administrativo para subir la obra.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('title', uploadTitle.value.trim());
  formData.append('authorFirstName', uploadFirstName.value.trim());
  formData.append('authorLastName', uploadLastName.value.trim());
  formData.append('category', uploadCategory.value.trim());
  formData.append('year', uploadYear.value.trim());
  formData.append('medium', uploadMedium.value.trim());
  formData.append('description', uploadDescription.value.trim());
  if (uploadImageUrl.value.trim()) {
    formData.append('imageUrl', uploadImageUrl.value.trim());
  }
  if (uploadFile.files.length > 0) {
    formData.append('image', uploadFile.files[0]);
  }

  try {
    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'x-admin-token': token,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo subir la obra.');
    }

    showMessage(data.message || 'Obra subida correctamente.');
    uploadTitle.value = '';
    uploadFirstName.value = '';
    uploadLastName.value = '';
    uploadCategory.value = '';
    uploadYear.value = '';
    uploadMedium.value = '';
    uploadDescription.value = '';
    uploadImageUrl.value = '';
    uploadFile.value = '';
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

uploadButton.addEventListener('click', uploadArtwork);

loadPendingButton.addEventListener('click', loadPending);
loadApprovedButton.addEventListener('click', loadApproved);
loadAllButton.addEventListener('click', loadAllArtworks);
loadRankingButton.addEventListener('click', loadRanking);
