(function () {
  const scriptTag = document.currentScript || document.querySelector('script[src*="embed.js"]');
  const apiBase = scriptTag?.dataset.apiBase || window.ArtGalleryEmbedConfig?.apiBase || window.location.origin;
  const containerId = scriptTag?.dataset.container || window.ArtGalleryEmbedConfig?.container || 'art-gallery-embed';
  const showSubmission = scriptTag?.dataset.showSubmission !== 'false' && window.ArtGalleryEmbedConfig?.showSubmission !== false;
  const visitorKey = 'art_gallery_embed_visitor_id';
  const emailKey = 'art_gallery_embed_email';
  const submissionEmailKey = 'art_gallery_embed_submission_email';
  const submissionVerifiedKey = 'art_gallery_embed_submission_verified';

  if (!apiBase) {
    console.error('ArtGalleryEmbed: apiBase no está definido. Usa data-api-base o ArtGalleryEmbedConfig.apiBase');
    return;
  }

  const root = createRoot(containerId);
  injectStyles();

  let visitorId = localStorage.getItem(visitorKey);
  let verifiedEmail = localStorage.getItem(emailKey);
  let submissionEmail = localStorage.getItem(submissionEmailKey);
  let submissionVerified = localStorage.getItem(submissionVerifiedKey) === 'true';
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
    if (!verifiedEmail) {
      alert('Guarda tu correo antes de votar.');
      return;
    }

    button.disabled = true;
    button.textContent = 'Procesando...';

    try {
      const response = await fetch(`${apiBase}/api/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artwork_id: artworkId, visitor_id: visitorId, email: verifiedEmail }),
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
      const parent = document.body || document.head?.parentNode || document.documentElement;
      parent.appendChild(container);
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
      .art-gallery-embed__card { background: #fff; border-radius: 22px; overflow: hidden; box-shadow: 0 18px 35px rgba(214, 115, 26, 0.12); display: flex; flex-direction: column; transition: transform 0.25s ease, box-shadow 0.25s ease; }
      .art-gallery-embed__card:hover { transform: translateY(-2px); box-shadow: 0 22px 45px rgba(214, 115, 26, 0.18); }
      .art-gallery-embed__card img { width: 100%; height: 320px; object-fit: cover; object-position: center center; display: block; cursor: zoom-in; }
      .art-gallery-embed__body { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
      .art-gallery-embed__badge { display: inline-flex; align-items: center; justify-content: center; padding: 0.35rem 0.75rem; border-radius: 999px; background: #f9b26b; color: #ffffff; font-size: 0.8rem; font-weight: 700; }
      .art-gallery-embed__body h3 { margin: 0; font-size: 1.05rem; line-height: 1.3; }
      .art-gallery-embed__body p { margin: 0; color: #6e5947; font-size: 0.95rem; line-height: 1.5; }
      .art-gallery-embed__meta { display: flex; justify-content: space-between; gap: 0.75rem; font-size: 0.9rem; color: #7b5a3b; }
      .art-gallery-embed__button { border: none; border-radius: 18px; padding: 0.95rem 1rem; background: linear-gradient(135deg, #e87916, #ffa640); color: #fff; font-weight: 700; cursor: pointer; }
      .art-gallery-embed__button[disabled] { background: #d9d1c5; cursor: not-allowed; }
      .art-gallery-embed__loading, .art-gallery-embed__error, .art-gallery-embed__empty { color: #7b5a3b; padding: 1rem; text-align: center; }
      .art-gallery-embed__email-section { margin-bottom: 1rem; padding: 1rem; border-radius: 20px; background: #fff7ed; border: 1px solid #f3d1b0; }
      .art-gallery-embed__email-label { margin: 0 0 0.5rem; color: #865320; font-weight: 700; }
      .art-gallery-embed__email-row { display: grid; grid-template-columns: 1fr auto; gap: 0.75rem; }
      .art-gallery-embed__email-row input { width: 100%; padding: 0.85rem 1rem; border: 1px solid #d8c4b5; border-radius: 18px; font-size: 0.95rem; }
      .art-gallery-embed__email-note { margin: 0.75rem 0 0; color: #7b5a3b; font-size: 0.88rem; }
      .art-gallery-embed__submission-section { margin-top: 1.25rem; padding: 1rem; border-radius: 20px; background: #fff7ed; border: 1px solid #f3d1b0; }
      .art-gallery-embed__submission-section h3 { margin: 0 0 0.75rem; font-size: 1.1rem; }
      .hidden { display: none; }
      .art-gallery-embed__submission-row { display: grid; gap: 0.75rem; }
      .art-gallery-embed__submission-row input,
      .art-gallery-embed__submission-row textarea { width: 100%; padding: 0.85rem 1rem; border: 1px solid #d8c4b5; border-radius: 18px; font-size: 0.95rem; }
      .art-gallery-embed__submission-row textarea { resize: vertical; min-height: 110px; }
      .art-gallery-embed__submission-buttons { display: grid; gap: 0.75rem; grid-template-columns: 1fr auto; margin-top: 0.75rem; }
      .art-gallery-embed__submission-buttons button { width: 100%; }
      .art-gallery-embed__submission-message { color: #7b5a3b; font-size: 0.9rem; margin-top: 0.5rem; }
      .art-gallery-embed__lightbox { position: fixed; inset: 0; z-index: 9999; display: none; align-items: center; justify-content: center; padding: 1.5rem; backdrop-filter: blur(8px); background: rgba(15, 12, 9, 0.55); }
      .art-gallery-embed__lightbox.active { display: flex; }
      .art-gallery-embed__lightbox-panel { width: min(100%, 960px); max-height: 90vh; background: #fff; border-radius: 22px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.25); display: grid; grid-template-rows: auto 1fr auto; }
      .art-gallery-embed__lightbox-panel img { width: 100%; max-height: 72vh; object-fit: contain; background: #000; }
      .art-gallery-embed__lightbox-caption { padding: 1rem 1.25rem; color: #3b2a20; }
      .art-gallery-embed__lightbox-footer { padding: 1rem 1.25rem; display: flex; justify-content: flex-end; gap: 0.75rem; }
      .art-gallery-embed__lightbox-close { background: #e87916; }
      @media (max-width: 720px) { .art-gallery-embed__lightbox-panel { width: 100%; } .art-gallery-embed__lightbox-footer { justify-content: center; } }
      @media (max-width: 540px) { .art-gallery-embed__grid { grid-template-columns: 1fr; } .art-gallery-embed__email-row, .art-gallery-embed__submission-buttons { grid-template-columns: 1fr; } }
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
          <button class="art-gallery-embed__button" data-id="${artwork.id}" ${artwork.voted || !verifiedEmail ? 'disabled' : ''}>
            ${artwork.voted ? 'Ya votaste' : verifiedEmail ? 'Votar ahora' : 'Guarda tu correo'}
          </button>
        </div>
      </article>
    `;
  }

  function renderEmailSection() {
    return `
      <div class="art-gallery-embed__email-section">
        <p class="art-gallery-embed__email-label">Ingresa tu correo para poder votar</p>
        <div class="art-gallery-embed__email-row">
          <input id="art-gallery-embed-email" type="email" placeholder="tu@email.com" value="${verifiedEmail || ''}" />
          <button id="art-gallery-embed-save-email" class="art-gallery-embed__button">${verifiedEmail ? 'Actualizar correo' : 'Guardar correo'}</button>
        </div>
        <p class="art-gallery-embed__email-note">El correo solo se usa para validar tu voto y no se muestra públicamente.</p>
      </div>
    `;
  }

  function renderSubmissionSection() {
    return `
      <div class="art-gallery-embed__submission-section">
        <h3>Enviar obra</h3>
        <div class="art-gallery-embed__submission-row">
          <input id="art-gallery-embed-submission-email" type="email" placeholder="Tu correo" value="${submissionEmail || ''}" />
          <div class="art-gallery-embed__submission-buttons">
            <button id="art-gallery-embed-request-code" class="art-gallery-embed__button">Solicitar código</button>
          </div>
          <input id="art-gallery-embed-submission-code" type="text" placeholder="Código de verificación" class="hidden" />
          <button id="art-gallery-embed-verify-code" class="art-gallery-embed__button hidden">Verificar código</button>
          <input id="art-gallery-embed-submission-title" type="text" placeholder="Título de la obra" />
          <input id="art-gallery-embed-submission-author" type="text" placeholder="Autor / grupo" />
          <input id="art-gallery-embed-submission-category" type="text" placeholder="Categoría" />
          <textarea id="art-gallery-embed-submission-description" placeholder="Descripción de la obra"></textarea>
          <input id="art-gallery-embed-submission-image" type="file" accept="image/*" />
          <button id="art-gallery-embed-submit-artwork" class="art-gallery-embed__button" disabled>Enviar obra</button>
          <p id="art-gallery-embed-submission-message" class="art-gallery-embed__submission-message"></p>
        </div>
      </div>
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
      ${renderEmailSection()}
      ${showSubmission ? renderSubmissionSection() : ''}
      <div class="art-gallery-embed__grid">
        ${artworks.length ? artworks.map(renderCard).join('') : '<p class="art-gallery-embed__empty">No hay obras disponibles.</p>'}
      </div>
      <div id="art-gallery-embed-lightbox" class="art-gallery-embed__lightbox">
        <div class="art-gallery-embed__lightbox-panel">
          <img id="art-gallery-embed-lightbox-image" src="" alt="" />
          <div class="art-gallery-embed__lightbox-caption"><p id="art-gallery-embed-lightbox-title"></p></div>
          <div class="art-gallery-embed__lightbox-footer">
            <button id="art-gallery-embed-lightbox-close" class="art-gallery-embed__button art-gallery-embed__lightbox-close">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    const emailInput = root.querySelector('#art-gallery-embed-email');
    const saveEmailButton = root.querySelector('#art-gallery-embed-save-email');
    if (saveEmailButton && emailInput) {
      saveEmailButton.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email) {
          alert('Ingresa un correo válido para poder votar.');
          return;
        }
        verifiedEmail = email;
        localStorage.setItem(emailKey, email);
        await render();
      });
    }

    if (showSubmission) {
      const submissionEmailInput = root.querySelector('#art-gallery-embed-submission-email');
      const requestCodeButton = root.querySelector('#art-gallery-embed-request-code');
      const submissionCodeInput = root.querySelector('#art-gallery-embed-submission-code');
      const verifyCodeButton = root.querySelector('#art-gallery-embed-verify-code');
      const titleInput = root.querySelector('#art-gallery-embed-submission-title');
      const authorInput = root.querySelector('#art-gallery-embed-submission-author');
      const categoryInput = root.querySelector('#art-gallery-embed-submission-category');
      const descriptionInput = root.querySelector('#art-gallery-embed-submission-description');
      const imageInput = root.querySelector('#art-gallery-embed-submission-image');
      const submitArtworkButton = root.querySelector('#art-gallery-embed-submit-artwork');
      const submissionMessage = root.querySelector('#art-gallery-embed-submission-message');

      const setSubmissionStatus = (message, error = false) => {
        if (submissionMessage) {
          submissionMessage.textContent = message;
          submissionMessage.style.color = error ? '#a33' : '#3b2a20';
        }
      };

      if (submissionEmailInput) {
        submissionEmailInput.value = submissionEmail || '';
      }

      if (requestCodeButton && submissionEmailInput) {
        requestCodeButton.addEventListener('click', async () => {
          const email = submissionEmailInput.value.trim();
          if (!email) {
            setSubmissionStatus('Ingresa un correo válido para subir.', true);
            return;
          }
          try {
            const res = await fetch(`${apiBase}/api/submissions/request-code`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'No se pudo solicitar código.');
            submissionEmail = email;
            localStorage.setItem(submissionEmailKey, email);
            if (submissionCodeInput) submissionCodeInput.classList.remove('hidden');
            if (verifyCodeButton) verifyCodeButton.classList.remove('hidden');
            setSubmissionStatus(body.message || 'Código enviado.');
            if (body.code && submissionCodeInput) {
              submissionCodeInput.value = body.code;
            }
          } catch (error) {
            setSubmissionStatus(error.message, true);
          }
        });
      }

      if (verifyCodeButton && submissionCodeInput) {
        verifyCodeButton.addEventListener('click', async () => {
          const code = submissionCodeInput.value.trim();
          const email = submissionEmail;
          if (!email || !code) {
            setSubmissionStatus('Completa correo y código.', true);
            return;
          }
          try {
            const res = await fetch(`${apiBase}/api/submissions/verify-code`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, code }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'No se pudo verificar el código.');
            submissionVerified = true;
            localStorage.setItem(submissionVerifiedKey, 'true');
            setSubmissionStatus(body.message || 'Correo verificado.');
            if (submitArtworkButton) submitArtworkButton.disabled = false;
          } catch (error) {
            setSubmissionStatus(error.message, true);
          }
        });
      }

      if (submitArtworkButton) {
        submitArtworkButton.addEventListener('click', async () => {
          const title = titleInput?.value.trim();
          const author = authorInput?.value.trim();
          const category = categoryInput?.value.trim();
          const description = descriptionInput?.value.trim();
          const file = imageInput?.files?.[0];
          const email = submissionEmail;
          const code = submissionCodeInput?.value.trim();

          if (!submissionVerified) {
            setSubmissionStatus('Verifica tu correo antes de subir.', true);
            return;
          }
          if (!title || !author || !category || !description || !file) {
            setSubmissionStatus('Completa todos los campos de la obra.', true);
            return;
          }

          try {
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

            const res = await fetch(`${apiBase}/api/submissions/upload`, {
              method: 'POST',
              body: form,
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Error al enviar la obra.');
            setSubmissionStatus(body.message || 'Obra enviada para revisión.');
            if (titleInput) titleInput.value = '';
            if (authorInput) authorInput.value = '';
            if (categoryInput) categoryInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
            if (imageInput) imageInput.value = '';
            submissionVerified = false;
            localStorage.removeItem(submissionVerifiedKey);
            submitArtworkButton.textContent = 'Enviar obra';
            submitArtworkButton.disabled = true;
          } catch (error) {
            setSubmissionStatus(error.message, true);
            if (submitArtworkButton) {
              submitArtworkButton.disabled = false;
              submitArtworkButton.textContent = 'Enviar obra';
            }
          }
        });
      }
    }

    root.querySelectorAll('.art-gallery-embed__button').forEach((button) => {
      const artworkId = button.dataset.id;
      if (!artworkId) return;
      button.addEventListener('click', () => voteArtwork(artworkId, button));
    });

    const lightbox = root.querySelector('#art-gallery-embed-lightbox');
    const lightboxImage = root.querySelector('#art-gallery-embed-lightbox-image');
    const lightboxTitle = root.querySelector('#art-gallery-embed-lightbox-title');
    const lightboxClose = root.querySelector('#art-gallery-embed-lightbox-close');
    const cards = root.querySelectorAll('.art-gallery-embed__card img');

    cards.forEach((img) => {
      img.addEventListener('click', () => {
        if (!lightbox || !lightboxImage || !lightboxTitle) return;
        lightboxImage.src = img.src;
        lightboxImage.alt = img.alt;
        lightboxTitle.textContent = img.alt || 'Obra';
        lightbox.classList.add('active');
      });
    });

    if (lightboxClose) {
      lightboxClose.addEventListener('click', () => {
        lightbox?.classList.remove('active');
      });
    }
    if (lightbox) {
      lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) lightbox.classList.remove('active');
      });
    }
  }

  async function start() {
    root.innerHTML = '<div class="art-gallery-embed__loading">Cargando galería...</div>';
    try {
      await render();
    } catch (error) {
      root.innerHTML = `<div class="art-gallery-embed__error">Error al iniciar el widget: ${escapeHtml(error.message)}</div>`;
      console.error('ArtGalleryEmbed startup error:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
