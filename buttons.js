'use strict';

class Buttons {
  // Accepts an engine reference so controls can manipulate game state
  constructor(engine = null) {
    this.engine = engine;
    this.restartButton = null;
    this.undoButton = null;
    this.redoButton = null;
    this.blackReadyButton = null;
    this.whiteReadyButton = null;
    this.blackTimerDisplay = null;
    this.whiteTimerDisplay = null;
    this.blackSurrenderButton = null;
    this.whiteSurrenderButton = null;
    this.blackDrawButton = null;
    this.whiteDrawButton = null;
    this.pendingDrawOffer = null;
    this.sidebar = null;
    this.topPanel = null;
    this.bottomPanel = null;
    this.boardElement = engine?.boardElement || null;
    this.historyContainer = null;
    this.historyList = null;
    this.confirmOverlay = null;
    this.movesHistory = [];
    this.futureMoves = [];
    this.isApplyingRedo = false;
    this.statusListener = this.handleStatus.bind(this);
    this.readyState = {
      black: false,
      white: false
    };
    this.remainingTime = {
      black: 300000,
      white: 300000
    };
    this.activeTimerColor = null;
    this.timerInterval = null;
    this.matchRunning = false;
    this.matchFinished = false;
    this.boardLocked = true;
    this.endModal = null;
    this.boardFrozen = false;
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
    this.setupReadyControls();
    this.setupHistoryPanel();
    this.bindButtons();
    this.bindReadyButtons();
    this.bindExtraControls();
    this.attachEngineEvents();
    this.applyBoardLockState();
    this.renderHistory();
  }

  // Allows wiring the engine reference after construction if needed
  setEngine(engine) {
    this.engine = engine;
    this.boardElement = engine?.boardElement || null;
    this.attachEngineEvents();
    this.applyBoardLockState();
  }

  // Locates key DOM nodes for buttons and sidebar display
  cacheDom() {
    const buttonNodes = document.querySelectorAll('.buttons button');
    this.restartButton =
      document.querySelector('.buttons .restart') || buttonNodes[0] || null;
    this.undoButton = buttonNodes[1] || null;
    this.redoButton = buttonNodes[2] || null;
    this.sidebar = document.querySelector('.sidebar');
    this.topPanel = document.querySelector('.top-panel');
    this.bottomPanel = document.querySelector('.bottom-panel');
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
    title.classList.add("MovesHistory")
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

  bindReadyButtons() {
    this.blackReadyButton?.addEventListener('click', () =>
      this.handleReady('black')
    );
    this.whiteReadyButton?.addEventListener('click', () =>
      this.handleReady('white')
    );
  }

  bindExtraControls() {
    this.blackSurrenderButton?.addEventListener('click', () =>
      this.handleSurrender('black')
    );
    this.whiteSurrenderButton?.addEventListener('click', () =>
      this.handleSurrender('white')
    );
    this.blackDrawButton?.addEventListener('click', () =>
      this.handleDrawClick('black')
    );
    this.whiteDrawButton?.addEventListener('click', () =>
      this.handleDrawClick('white')
    );
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
  handleStatus(event) {
    const detail = event?.detail;
    this.syncHistoryFromEngine();
    this.handleTimerUpdate(detail);
    this.evaluateGameEnd(detail);
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
    if (this.matchFinished) {
      return;
    }
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
    this.deferSync();
  }

  // Handles redo logic using the stored futureMoves stack
  async handleRedo() {
    if (this.matchFinished) {
      return;
    }
    if (
      !this.engine ||
      typeof this.engine.applyMove !== 'function' ||
      !this.futureMoves.length
    ) {
      return;
    }
    const move = this.futureMoves.pop();
    this.isApplyingRedo = true;
    try {
      await this.engine.applyMove(move);
    } finally {
      this.deferSync(() => {
        this.isApplyingRedo = false;
      });
    }
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
      item.classList.add("moveList");
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

  setupReadyControls() {
    if (this.blackReadyButton || this.whiteReadyButton) {
      return;
    }
    if (this.topPanel) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('ready-control', 'ready-control--black');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.classList.add('ready-button', 'ready-button--black');
      btn.textContent = 'Black Ready';
      const timer = document.createElement('span');
      timer.classList.add('ready-timer', 'ready-timer--black');
      timer.textContent = '05:00';
      wrapper.appendChild(btn);
      wrapper.appendChild(timer);
      const surrender = document.createElement('button');
      surrender.type = 'button';
      surrender.classList.add('ready-action', 'ready-action--black');
      surrender.textContent = 'Black Resign';
      const draw = document.createElement('button');
      draw.type = 'button';
      draw.classList.add('ready-action', 'ready-action--black');
      draw.textContent = 'Offer Draw';
      wrapper.appendChild(surrender);
      wrapper.appendChild(draw);
      this.topPanel.appendChild(wrapper);
      this.blackReadyButton = btn;
      this.blackTimerDisplay = timer;
      this.blackSurrenderButton = surrender;
      this.blackDrawButton = draw;
    }
    if (this.bottomPanel) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('ready-control', 'ready-control--white');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.classList.add('ready-button', 'ready-button--white');
      btn.textContent = 'White Ready';
      const timer = document.createElement('span');
      timer.classList.add('ready-timer', 'ready-timer--white');
      timer.textContent = '05:00';
      wrapper.appendChild(btn);
      wrapper.appendChild(timer);
      const surrender = document.createElement('button');
      surrender.type = 'button';
      surrender.classList.add('ready-action', 'ready-action--white');
      surrender.textContent = 'White Resign';
      const draw = document.createElement('button');
      draw.type = 'button';
      draw.classList.add('ready-action', 'ready-action--white');
      draw.textContent = 'Offer Draw';
      wrapper.appendChild(surrender);
      wrapper.appendChild(draw);
      this.bottomPanel.appendChild(wrapper);
      this.whiteReadyButton = btn;
      this.whiteTimerDisplay = timer;
      this.whiteSurrenderButton = surrender;
      this.whiteDrawButton = draw;
    }
    this.updateSurrenderButtons();
    this.updateDrawButtons();
  }

  handleReady(color) {
    if (this.readyState[color]) {
      return;
    }
    this.readyState[color] = true;
    const button =
      color === 'black' ? this.blackReadyButton : this.whiteReadyButton;
    if (button) {
      button.disabled = true;
      button.classList.add('ready-button--locked');
    }
    if (this.readyState.black && this.readyState.white && !this.matchRunning) {
      this.startMatch();
    }
  }

  handleSurrender(color) {
    if (!this.matchRunning || this.matchFinished) {
      return;
    }
    const winner = color === 'white' ? 'Black' : 'White';
    this.finishGame({
      type: 'resignation',
      winner
    });
  }

  handleDrawClick(color) {
    if (!this.matchRunning || this.matchFinished) {
      return;
    }
    if (!this.pendingDrawOffer) {
      this.pendingDrawOffer = color;
      this.updateDrawButtons();
      return;
    }
    if (this.pendingDrawOffer === color) {
      this.pendingDrawOffer = null;
      this.updateDrawButtons();
      return;
    }
    this.pendingDrawOffer = null;
    this.updateDrawButtons();
    this.finishGame({
      type: 'agreement'
    });
  }

  updateSurrenderButtons() {
    const enabled = this.matchRunning && !this.matchFinished;
    const setState = button => {
      if (!button) {
        return;
      }
      button.disabled = !enabled;
    };
    setState(this.blackSurrenderButton);
    setState(this.whiteSurrenderButton);
  }

  updateDrawButtons() {
    const active = this.matchRunning && !this.matchFinished;
    const setState = (button, color) => {
      if (!button) {
        return;
      }
      if (!active) {
        button.disabled = true;
        button.textContent = 'Offer Draw';
        return;
      }
      if (!this.pendingDrawOffer) {
        button.disabled = false;
        button.textContent = 'Offer Draw';
        return;
      }
      if (this.pendingDrawOffer === color) {
        button.disabled = false;
        button.textContent = 'Cancel Offer';
      } else {
        button.disabled = false;
        button.textContent = 'Accept Draw';
      }
    };
    setState(this.blackDrawButton, 'black');
    setState(this.whiteDrawButton, 'white');
  }

  clearPendingDrawOffer() {
    if (this.pendingDrawOffer) {
      this.pendingDrawOffer = null;
      this.updateDrawButtons();
    }
  }

  detectAutomaticDraw() {
    if (!this.engine) {
      return null;
    }
    if (this.isFiftyMoveDraw()) {
      return { type: 'fiftyMove' };
    }
    if (this.isThreefoldRepetition()) {
      return { type: 'threefold' };
    }
    if (this.isInsufficientMaterial()) {
      return { type: 'insufficient' };
    }
    return null;
  }

  isFiftyMoveDraw() {
    const history = this.engine?.history || [];
    if (!history.length) {
      return false;
    }
    let halfMoves = 0;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const entry = history[i];
      if (!entry) {
        break;
      }
      const isPawnMove = entry.piece?.type === 'pawn';
      const isCapture = Boolean(entry.captured);
      if (isPawnMove || isCapture) {
        break;
      }
      halfMoves += 1;
    }
    return halfMoves >= 100;
  }

  isThreefoldRepetition() {
    if (!this.engine || typeof this.engine.createSnapshot !== 'function') {
      return false;
    }
    const counts = new Map();
    const pushSnapshot = snapshot => {
      if (!snapshot) {
        return;
      }
      const key = this.snapshotKey(snapshot);
      counts.set(key, (counts.get(key) || 0) + 1);
    };
    const history = this.engine.history || [];
    history.forEach(entry => pushSnapshot(entry.snapshot));
    pushSnapshot(this.engine.createSnapshot());
    for (const value of counts.values()) {
      if (value >= 3) {
        return true;
      }
    }
    return false;
  }

  snapshotKey(snapshot) {
    if (!snapshot || !snapshot.boardState) {
      return '';
    }
    const rows = snapshot.boardState
      .map(row =>
        row
          .map(cell => (cell ? `${cell.color[0]}${cell.type}` : '--'))
          .join('')
      )
      .join('|');
    const castle = [
      snapshot.castleRights?.white?.king ? '1' : '0',
      snapshot.castleRights?.white?.queen ? '1' : '0',
      snapshot.castleRights?.black?.king ? '1' : '0',
      snapshot.castleRights?.black?.queen ? '1' : '0'
    ].join('');
    const enPassant = snapshot.enPassantTarget
      ? `${snapshot.enPassantTarget.row}${snapshot.enPassantTarget.col}`
      : '--';
    return `${rows}-${snapshot.currentTurn}-${castle}-${enPassant}`;
  }

  isInsufficientMaterial() {
    const board = this.engine?.boardState;
    if (!board) {
      return false;
    }
    const pieces = [];
    for (let row = 1; row <= 8; row += 1) {
      for (let col = 1; col <= 8; col += 1) {
        const cell = board[row - 1][col - 1];
        if (cell) {
          pieces.push({ ...cell, row, col });
        }
      }
    }
    const nonKingPieces = pieces.filter(piece => piece.type !== 'king');
    if (!nonKingPieces.length) {
      return true;
    }
    if (nonKingPieces.length === 1) {
      const type = nonKingPieces[0].type;
      if (type === 'bishop' || type === 'knight') {
        return true;
      }
    }
    if (nonKingPieces.length === 2) {
      const bothBishops = nonKingPieces.every(piece => piece.type === 'bishop');
      if (bothBishops) {
        const colorA = (nonKingPieces[0].row + nonKingPieces[0].col) % 2;
        const colorB = (nonKingPieces[1].row + nonKingPieces[1].col) % 2;
        if (colorA === colorB) {
          return true;
        }
      }
    }
    return false;
  }

  startMatch() {
    this.remainingTime.black = 300000;
    this.remainingTime.white = 300000;
    this.matchRunning = true;
    this.matchFinished = false;
    this.pendingDrawOffer = null;
    this.boardLocked = false;
    this.applyBoardLockState();
    this.updateSurrenderButtons();
    this.updateDrawButtons();
    this.updateTimerDisplay('black');
    this.updateTimerDisplay('white');
    this.startTimer('white');
  }

  handleTimerUpdate(status) {
    if (!this.matchRunning || this.matchFinished || !status) {
      return;
    }
    const nextColor = status.turn === 'black' ? 'black' : 'white';
    if (nextColor !== this.activeTimerColor) {
      this.startTimer(nextColor);
    }
    if (this.pendingDrawOffer && this.pendingDrawOffer === nextColor) {
      this.clearPendingDrawOffer();
    }
  }

  startTimer(color) {
    this.stopTimer();
    this.activeTimerColor = color;
    let lastMark = performance.now();
    this.timerInterval = setInterval(() => {
      const now = performance.now();
      const delta = now - lastMark;
      lastMark = now;
      this.remainingTime[color] = Math.max(
        0,
        this.remainingTime[color] - delta
      );
      this.updateTimerDisplay(color);
      if (this.remainingTime[color] <= 0) {
        this.handleTimeLoss(color);
      }
    }, 200);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay(color) {
    const target =
      color === 'black' ? this.blackTimerDisplay : this.whiteTimerDisplay;
    if (!target) {
      return;
    }
    target.textContent = this.formatTime(this.remainingTime[color]);
  }

  formatTime(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  handleTimeLoss(color) {
    const winner = color === 'white' ? 'Black' : 'White';
    this.finishGame({
      type: 'timeout',
      winner
    });
  }

  evaluateGameEnd(status) {
    if (!status || this.matchFinished || !this.matchRunning) {
      return;
    }
    if (status.checkmate) {
      const loser = status.turn === 'white' ? 'White' : 'Black';
      const winner = loser === 'White' ? 'Black' : 'White';
      this.finishGame({
        type: 'checkmate',
        winner
      });
      return;
    }
    if (status.stalemate) {
      this.finishGame({
        type: 'stalemate'
      });
      return;
    }
    const automatic = this.detectAutomaticDraw();
    if (automatic) {
      this.finishGame(automatic);
    }
  }

  finishGame(result) {
    if (this.matchFinished) {
      if (result && !this.endModal) {
        this.showEndModal(result);
      }
      return;
    }
    this.matchFinished = true;
    this.matchRunning = false;
    this.stopTimer();
    this.freezeBoard();
    this.disableControlButtons();
    this.boardLocked = true;
    this.applyBoardLockState();
    this.clearPendingDrawOffer();
    this.updateDrawButtons();
    this.updateSurrenderButtons();
    if (result) {
      this.showEndModal(result);
    }
  }

  disableControlButtons() {
    this.undoButton?.setAttribute('disabled', 'true');
    this.redoButton?.setAttribute('disabled', 'true');
    this.blackReadyButton?.setAttribute('disabled', 'true');
    this.whiteReadyButton?.setAttribute('disabled', 'true');
    this.blackDrawButton?.setAttribute('disabled', 'true');
    this.whiteDrawButton?.setAttribute('disabled', 'true');
    this.blackSurrenderButton?.setAttribute('disabled', 'true');
    this.whiteSurrenderButton?.setAttribute('disabled', 'true');
  }

  freezeBoard() {
    if (this.boardElement && !this.boardFrozen) {
      this.boardElement.classList.add('board--frozen');
      this.boardFrozen = true;
    }
  }

  applyBoardLockState() {
    if (!this.boardElement) {
      return;
    }
    if (this.boardLocked) {
      this.boardElement.classList.add('board--locked');
    } else {
      this.boardElement.classList.remove('board--locked');
    }
  }

  showEndModal(result) {
    this.closeEndModal();
    const overlay = document.createElement('div');
    overlay.classList.add('game-end-overlay');
    const dialog = document.createElement('div');
    dialog.classList.add('game-end-dialog');
    const message = document.createElement('p');
    message.classList.add('game-end-dialog__message');
    message.textContent = this.getEndMessage(result);
    const controls = document.createElement('div');
    controls.classList.add('game-end-dialog__controls');
    const restartBtn = document.createElement('button');
    restartBtn.type = 'button';
    restartBtn.classList.add('game-end-btn', 'game-end-btn--restart');
    restartBtn.textContent = 'Restart Game';
    restartBtn.addEventListener('click', () => this.restartGame());
    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.classList.add('game-end-btn', 'game-end-btn--view');
    viewBtn.textContent = 'View Board';
    viewBtn.addEventListener('click', () => this.closeEndModal());
    controls.appendChild(restartBtn);
    controls.appendChild(viewBtn);
    dialog.appendChild(message);
    dialog.appendChild(controls);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        event.stopPropagation();
      }
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.classList.add('game-end-overlay--visible');
    });
    this.endModal = overlay;
  }

  getEndMessage(result) {
    if (!result) {
      return 'Game Over';
    }
    if (result.type === 'checkmate') {
      return result.winner === 'White'
        ? 'Game Over: White Wins'
        : 'Game Over: Black Wins';
    }
    if (result.type === 'stalemate') {
      return 'Draw: Stalemate';
    }
    if (result.type === 'timeout') {
      return result.winner
        ? `Time Out: ${result.winner} Wins`
        : 'Time Out';
    }
    if (result.type === 'agreement') {
      return 'Draw: Agreed';
    }
    if (result.type === 'threefold') {
      return 'Draw: Threefold Repetition';
    }
    if (result.type === 'fiftyMove') {
      return 'Draw: 50-Move Rule';
    }
    if (result.type === 'insufficient') {
      return 'Draw: Insufficient Material';
    }
    if (result.type === 'resignation') {
      return result.winner === 'White'
        ? 'Game Over: White Wins (Resignation)'
        : 'Game Over: Black Wins (Resignation)';
    }
    return 'Game Over';
  }

  closeEndModal() {
    if (this.endModal) {
      this.endModal.classList.remove('game-end-overlay--visible');
      const modal = this.endModal;
      this.endModal = null;
      setTimeout(() => modal.remove(), 200);
    }
  }

  restartGame() {
    window.location.reload();
  }
}

export { Buttons };
