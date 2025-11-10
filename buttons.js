'use strict';

class Buttons {
  // Accepts an engine reference so controls can manipulate game state
  constructor(engine = null) {
    this.engine = engine;
    this.restartButton = null;
    this.undoButton = null;
    this.redoButton = null;
    this.sidebar = null;
    this.historyContainer = null;
    this.historyList = null;
    this.confirmOverlay = null;
    this.movesHistory = [];
    this.futureMoves = [];
    this.isApplyingRedo = false;
    this.statusListener = this.handleStatus.bind(this);
  }

  // Ensures the component sets up only after the DOM is fully ready
  init() {
    const start = () => this.setup();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }

  // Injects DOM hooks, panel scaffolding, and event subscriptions
  setup() {
    this.cacheDom();
    this.setupHistoryPanel();
    this.bindButtons();
    this.attachEngineEvents();
    this.renderHistory();
  }

  // Allows wiring the engine reference after construction if needed
  setEngine(engine) {
    this.engine = engine;
    this.attachEngineEvents();
  }

  // Locates key DOM nodes for buttons and sidebar display
  cacheDom() {
    const buttonNodes = document.querySelectorAll('.buttons button');
    this.restartButton =
      document.querySelector('.buttons .restart') || buttonNodes[0] || null;
    this.undoButton = buttonNodes[1] || null;
    this.redoButton = buttonNodes[2] || null;
    this.sidebar = document.querySelector('.sidebar');
  }

  // Creates the move-history UI inside the sidebar
  setupHistoryPanel() {
    if (!this.sidebar || this.historyContainer) {
      return;
    }
    const container = document.createElement('div');
    container.classList.add('move-history');
    container.style.overflowY = 'auto';
    const title = document.createElement('h2');
    title.textContent = 'Move History';
    const list = document.createElement('ol');
    list.classList.add('move-history__list');
    container.appendChild(title);
    container.appendChild(list);
    this.sidebar.appendChild(container);
    this.historyContainer = container;
    this.historyList = list;
  }

  // Registers click handlers for restart, undo, and redo buttons
  bindButtons() {
    this.restartButton?.addEventListener('click', () =>
      this.showRestartConfirmation()
    );
    this.undoButton?.addEventListener('click', () => this.handleUndo());
    this.redoButton?.addEventListener('click', () => this.handleRedo());
  }

  // Subscribes to engine status events so move history stays in sync
  attachEngineEvents() {
    if (!this.engine || !this.engine.boardElement) {
      return;
    }
    this.engine.boardElement.removeEventListener(
      'chess:status',
      this.statusListener
    );
    this.engine.boardElement.addEventListener(
      'chess:status',
      this.statusListener
    );
    this.syncHistoryFromEngine();
  }

  // Processes the status event to capture newly made moves
  handleStatus() {
    this.syncHistoryFromEngine();
  }

  // Copies unseen history entries from the engine into the sidebar list
  syncHistoryFromEngine() {
    if (!this.engine || !Array.isArray(this.engine.history)) {
      return;
    }
    const engineHistory = this.engine.history;
    if (engineHistory.length > this.movesHistory.length) {
      for (let i = this.movesHistory.length; i < engineHistory.length; i += 1) {
        const entry = this.mapEngineMove(engineHistory[i]);
        if (entry) {
          this.movesHistory.push(entry);
        }
      }
      if (!this.isApplyingRedo) {
        this.futureMoves = [];
      }
      this.renderHistory();
    } else if (engineHistory.length < this.movesHistory.length) {
      this.movesHistory = this.movesHistory.slice(0, engineHistory.length);
      this.renderHistory();
    }
  }

  // Converts an engine move object into sidebar-friendly data
  mapEngineMove(move) {
    if (!move || !move.from || !move.to) {
      return null;
    }
    const color =
      move.piece?.color === 'black' || move.piece?.color === 'b'
        ? 'Black'
        : 'White';
    return {
      color,
      fromSquare: this.squareToNotation(move.from),
      toSquare: this.squareToNotation(move.to),
      raw: move
    };
  }

  // Turns board coordinates into standard algebraic notation
  squareToNotation(square) {
    if (!square) {
      return '--';
    }
    const rawCol =
      square.col ?? square.column ?? square.x ?? square.file ?? square.c ?? 0;
    const numericCol = Number(rawCol);
    const safeCol = Number.isFinite(numericCol) && numericCol > 0 ? numericCol : 8;
    const fileIndex = Math.min(8, Math.max(1, 9 - safeCol));
    const file = String.fromCharCode(96 + fileIndex);
    return `${file}${square.row}`;
  }

  // Handles undo logic, maintaining history and stacks
  handleUndo() {
    if (
      !this.engine ||
      typeof this.engine.undoLastMove !== 'function' ||
      !Array.isArray(this.engine.history) ||
      !this.engine.history.length
    ) {
      return;
    }
    const lastMove = this.engine.history[this.engine.history.length - 1];
    this.futureMoves.push(lastMove);
    this.engine.undoLastMove();
    if (this.movesHistory.length) {
      this.movesHistory.pop();
    }
    this.renderHistory();
    this.deferSync();
  }

  // Handles redo logic using the stored futureMoves stack
  handleRedo() {
    if (
      !this.engine ||
      typeof this.engine.applyMove !== 'function' ||
      !this.futureMoves.length
    ) {
      return;
    }
    const move = this.futureMoves.pop();
    this.isApplyingRedo = true;
    this.engine.applyMove(move);
    this.deferSync(() => {
      this.isApplyingRedo = false;
    });
  }

  // Schedules a sync after undo/redo so stacks realign with engine state
  deferSync(callback) {
    if (!this.engine) {
      if (callback) {
        callback();
      }
      return;
    }
    requestAnimationFrame(() => {
      this.syncHistoryFromEngine();
      if (callback) {
        callback();
      }
    });
  }

  // Renders the move list with algebraic numbering and automatic scrolling
  renderHistory() {
    if (!this.historyList) {
      return;
    }
    this.historyList.innerHTML = '';
    if (!this.movesHistory.length) {
      const empty = document.createElement('li');
      empty.classList.add('move-history__empty');
      empty.textContent = 'No moves yet.';
      this.historyList.appendChild(empty);
      return;
    }
    for (let i = 0; i < this.movesHistory.length; i += 2) {
      const whiteMove = this.movesHistory[i];
      const blackMove = this.movesHistory[i + 1];
      const item = document.createElement('li');
      const turn = i / 2 + 1;
      if (whiteMove && blackMove) {
        item.textContent = `${turn}. ${whiteMove.toSquare} ${blackMove.toSquare}`;
      } else if (whiteMove) {
        item.textContent = `${whiteMove.color}: ${whiteMove.fromSquare} → ${whiteMove.toSquare}`;
      } else if (blackMove) {
        item.textContent = `${blackMove.color}: ${blackMove.fromSquare} → ${blackMove.toSquare}`;
      }
      this.historyList.appendChild(item);
    }
    if (this.historyContainer) {
      this.historyContainer.scrollTop = this.historyContainer.scrollHeight;
    }
  }

  // Builds and displays the restart confirmation dialog
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
    yesButton.addEventListener('click', () => window.location.reload());

    const noButton = document.createElement('button');
    noButton.textContent = 'No';
    noButton.classList.add('btn-cancel');
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

  // Removes the restart confirmation overlay from the DOM
  closeConfirmation() {
    if (!this.confirmOverlay) {
      return;
    }
    this.confirmOverlay.remove();
    this.confirmOverlay = null;
  }
}

export { Buttons };
