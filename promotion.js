'use strict';

const PROMOTION_TYPES = [
  { type: 'queen', label: 'Queen' },
  { type: 'rook', label: 'Rook' },
  { type: 'bishop', label: 'Bishop' },
  { type: 'knight', label: 'Knight' }
];

const CODE_BY_TYPE = {
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n'
};

let overlay = null;
let titleEl = null;
let buttonsWrapper = null;
let pendingResolver = null;
let currentColor = 'white';
let currentImageFolder = './images';
let previouslyFocused = null;

function initPromotionUI() {
  if (overlay) {
    return;
  }
  overlay = document.createElement('div');
  overlay.className = 'promotion-popup';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('inert', '');
  const container = document.createElement('div');
  container.className = 'promotion-popup__dialog';

  titleEl = document.createElement('p');
  titleEl.className = 'promotion-popup__title';
  titleEl.textContent = 'Pawn Promotion';

  buttonsWrapper = document.createElement('div');
  buttonsWrapper.className = 'promotion-popup__options';

  PROMOTION_TYPES.forEach(info => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'promotion-popup__option';
    button.dataset.type = info.type;

    const img = document.createElement('img');
    img.alt = info.label;
    img.className = 'promotion-popup__image';
    button.appendChild(img);

    const label = document.createElement('span');
    label.textContent = info.label;
    label.className = 'promotion-popup__label';
    button.appendChild(label);

    button.addEventListener('click', () => promotePawn(info.type));
    buttonsWrapper.appendChild(button);
  });

  container.appendChild(titleEl);
  container.appendChild(buttonsWrapper);
  overlay.appendChild(container);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      // force the user to choose; do nothing on backdrop click
      event.preventDefault();
      event.stopPropagation();
    }
  });

  document.body.appendChild(overlay);
}

function updateButtonImages() {
  const prefix = currentColor === 'white' ? 'w' : 'b';
  overlay
    .querySelectorAll('.promotion-popup__option')
    .forEach(button => {
      const type = button.dataset.type;
      const img = button.querySelector('.promotion-popup__image');
      const code = CODE_BY_TYPE[type];
      img.src = `${currentImageFolder}/${prefix}${code}.svg`;
    });
}

export function showPromotionChoices(color, position = {}) {
  return new Promise(resolve => {
    if (typeof document === 'undefined') {
      resolve('queen');
      return;
    }
    currentColor = color === 'black' ? 'black' : 'white';
    currentImageFolder = position.imageFolder || currentImageFolder;
    pendingResolver = resolve;
    initPromotionUI();
    updateButtonImages();
    previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    overlay.classList.add('promotion-popup--visible');
    overlay.removeAttribute('inert');
    overlay.setAttribute('aria-hidden', 'false');
    const firstButton = overlay.querySelector('.promotion-popup__option');
    firstButton?.focus();
    const { row, col } = position;
    const sideLabel = currentColor === 'white' ? 'White' : 'Black';
    if (typeof row === 'number' && typeof col === 'number') {
      titleEl.textContent = `${sideLabel} pawn promotion (row ${row}, col ${col})`;
    } else {
      titleEl.textContent = `${sideLabel} pawn promotion`;
    }
  });
}

export function promotePawn(newPieceType) {
  if (!pendingResolver) {
    return;
  }
  const resolver = pendingResolver;
  pendingResolver = null;
  overlay.classList.remove('promotion-popup--visible');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('inert', '');
  if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
    previouslyFocused.focus();
  }
  previouslyFocused = null;
  resolver(newPieceType || 'queen');
}

document.addEventListener('DOMContentLoaded', () => {
  initPromotionUI();
});
