class Buttons {
  // Caches the restart button and overlay reference
  constructor() {
    this.restartButton = document.querySelector('.restart');
    this.confirmOverlay = null;
  }

  // Wires the restart button click to show confirmation
  init() {
    if (!this.restartButton) {
      return;
    }
    this.restartButton.addEventListener('click', () =>
      this.showRestartConfirmation()
    );
  }

  // Builds and displays the confirmation overlay with actions
  showRestartConfirmation() {
    if (this.confirmOverlay) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.classList.add('restart-overlay');

    const dialog = document.createElement('div');
    dialog.classList.add('restart-dialog');

    const message = document.createElement('p');
    message.textContent = 'Restart the game?';

    const controls = document.createElement('div');
    controls.classList.add('restart-controls');

    const yesButton = document.createElement('button');
    yesButton.textContent = 'Yes';
    yesButton.classList.add('btn-confirm');

    const noButton = document.createElement('button');
    noButton.textContent = 'NO';
    noButton.classList.add('btn-cancel');

    yesButton.addEventListener('click', () => window.location.reload());
    noButton.addEventListener('click', () => this.closeConfirmation());
    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        this.closeConfirmation();
      }
    });

    controls.appendChild(yesButton);
    controls.appendChild(noButton);
    dialog.appendChild(message);
    dialog.appendChild(controls);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    this.confirmOverlay = overlay;
  }

  // Removes the confirmation overlay and resets state
  closeConfirmation() {
    if (!this.confirmOverlay) {
      return;
    }
    this.confirmOverlay.remove();
    this.confirmOverlay = null;
  }
}

export { Buttons };
