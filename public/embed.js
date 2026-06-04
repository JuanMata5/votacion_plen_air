(function () {
  const scriptTag = document.currentScript || document.querySelector('script[src*="embed.js"]');
  const apiBase = scriptTag?.dataset.apiBase || window.ArtGalleryEmbedConfig?.apiBase || '';
  const containerId = scriptTag?.dataset.container || window.ArtGalleryEmbedConfig?.container || 'art-gallery-embed';
  const showSubmission = scriptTag?.dataset.showSubmission === 'true' || window.ArtGalleryEmbedConfig?.showSubmission;
  const visitorKey = 'art_gallery_embed_visitor_id';
  const emailKey = 'art_gallery_embed_email';

  if (!apiBase) {
    console.error('ArtGalleryEmbed: apiBase no está definido. Usa data-api-base o ArtGalleryEmbedConfig.apiBase');
    return;
  }

  const root = createRoot(containerId);
  injectStyles();

  let visitorId = localStorage.getItem(visitorKey);
  let verifiedEmail = localStorage.getItem(emailKey);
  let verifiedCode = null;

  if (!visitorId) {
    visitorId = generateUUID();
    localStorage.setItem(visitorKey, visitorId);
  }

  async function fetchArtworks() {
    const params = new URLSearchParams({ visitorId });
    const response = await fetch(`${apiBase}/api/artworks?${params.toString()}`);
    if (!response.ok) {
      root.innerHTML = `<div class="art-gallery-embed__error">Error al cargar obras.</div>`;
      return [];
    }
    return response.json();
  }

  async function voteArtwork(artworkId, button) {
    button.disabled = true;
    button.textContent = 'Procesando...';

    try {
      const response = await fetch(`${apiBase}/api/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artwork_id: artworkId, visitor_id: visitorId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo votar.');
      await render();
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.textContent = 'Votar ahora';
    }
  }

  function createRoot(id) {
    let container = document.getElementById(id);
    if (!container) {
      container = document.createElement('div');
      container.id = id;
      document.body.appendChild(container);
    }
    container.classList.add('art-gallery-embed');
    return container;
  }

  function injectStyles() {
    if (document.getElementById('art-gallery-embed-styles')) return;
    const style = document.createElement('style');
    style.id = 'art-gallery-embed-styles';
    style.textContent = `
      .art-gallery-embed { font-family: Arial, sans-serif; color: #3b2a20; background: #fffdfa; border: 1px solid #f1e4d3; border-radius: 24px; padding: 18px; box-shadow: 0 20px 45px rgba(214, 115, 26, 0.12); max-width: 100%; }
      .art-gallery-embed__header { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
      .art-gallery-embed__header .eyebrow { margin: 0; color: #d6731a; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.18em; }
      .art-gallery-embed__header h2 { margin: 0; font-size: 1.6rem; }
      .art-gallery-embed__grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
      .art-gallery-embed__card { background: #fff; border-radius: 22px; overflow: hidden; box-shadow: 0 18px 35px rgba(214, 115, 26, 0.12); display: flex; flex-direction: column; }
      .art-gallery-embed__card img { width: 100%; height: 190px; object-fit: cover; }
      .art-gallery-embed__body { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
      .art-gallery-embed__badge { display: inline-flex; align-items: center; justify-content: center; padding: 0.35rem 0.75rem; border-radius: 999px; background: #f9b26b; color: #ffffff; font-size: 0.8rem; font-weight: 700; }
      .art-gallery-embed__body h3 { margin: 0; font-size: 1.05rem; line-height: 1.3; }
      .art-gallery-embed__body p { margin: 0; color: #6e5947; font-size: 0.95rem; line-height: 1.5; }
      .art-gallery-embed__meta { display: flex; justify-content: space-between; gap: 0.75rem; font-size: 0.9rem; color: #7b5a3b; }
      .art-gallery-embed__button { border: none; border-radius: 18px; padding: 0.95rem 1rem; background: linear-gradient(135deg, #e87916, #ffa640); color: #fff; font-weight: 700; cursor: pointer; }
      .art-gallery-embed__button[disabled] { background: #d9d1c5; cursor: not-allowed; }
      .art-gallery-embed__loading, .art-gallery-embed__error, .art-gallery-embed__empty { color: #7b5a3b; padding: 1rem; text-align: center; }
      @media (max-width: 540px) { .art-gallery-embed__grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function renderCard(artwork) {
    return `
      <article class="art-gallery-embed__card">
        <img src="${artwork.image_url}" alt="${escapeHtml(artwork.title)}" />
        <div class="art-gallery-embed__body">
          <span class="art-gallery-embed__badge">${escapeHtml(artwork.category)}</span>
          <h3>${escapeHtml(artwork.title)}</h3>
          <p>${escapeHtml(artwork.description)}</p>
          <div class="art-gallery-embed__meta">
            <span>${escapeHtml(artwork.author)}</span>
            <span>${artwork.votes} votos</span>
          </div>
          <button class="art-gallery-embed__button" data-id="${artwork.id}" ${artwork.voted ? 'disabled' : ''}>
            ${artwork.voted ? 'Ya votaste' : 'Votar ahora'}
          </button>
        </div>
      </article>
    `;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, (tag) => {
      const chars = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return chars[tag] || tag;
    });
  }

  async function render() {
    const artworks = await fetchArtworks();
    root.innerHTML = `
      <div class="art-gallery-embed__header">
        <div>
          <p class="eyebrow">Galería de Arte</p>
          <h2>Vota por tu obra favorita</h2>
        </div>
      </div>
      <div class="art-gallery-embed__grid">
        ${artworks.length ? artworks.map(renderCard).join('') : '<p class="art-gallery-embed__empty">No hay obras disponibles.</p>'}
      </div>
    `;

    root.querySelectorAll('.art-gallery-embed__button').forEach((button) => {
      button.addEventListener('click', () => voteArtwork(button.dataset.id, button));
    });
  }

  async function start() {
    root.innerHTML = '<div class="art-gallery-embed__loading">Cargando galería...</div>';
    await render();
  }

  start();
})();
