import { Moves } from '../moves/Moves.js';
import { Highlight } from '../highlight/Highlight.js';

const TYPE_BY_CODE = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king'
};

const CODE_BY_TYPE = {
  pawn: 'p',
  rook: 'r',
  knight: 'n',
  bishop: 'b',
  queen: 'q',
  king: 'k'
};

class ChessEngine {
  // Initializes helpers, board state mirrors, and default status flags
  constructor(boardElement, options = {}) {
    this.boardElement = boardElement;
    this.imageFolder = options.imageFolder || './images';
    this.moves = new Moves();
    this.highlight = new Highlight(boardElement);
    this.boardState = this.captureBoardState();
    this.currentTurn = 'white';
    this.history = [];
    this.selectedSquare = null;
    this.selectedElement = null;
    this.availableMoves = [];
    this.enPassantTarget = null;
    this.castleRights = {
      white: { king: true, queen: true },
      black: { king: true, queen: true }
    };
    this.status = {
      check: false,
      checkmate: false,
      stalemate: false,
      turn: this.currentTurn
    };
    this.bindEvents();
    this.syncContext();
    this.updateGameStatus();
    this.refreshCheckHighlight();
  }

  // Reads the DOM board to build an internal 2D piece array
  captureBoardState() {
    const state = Array.from({ length: 8 }, () =>
      Array(8).fill(null)
    );
    if (!this.boardElement) {
      return state;
    }
    this.boardElement.querySelectorAll('.square').forEach(square => {
      const row = Number(square.dataset.row);
      const col = Number(square.dataset.col);
      const pieceEl = square.querySelector('.piece');
      if (!pieceEl || !pieceEl.alt) {
        return;
      }
      const parsed = this.parsePiece(pieceEl.alt);
      if (parsed) {
        state[row - 1][col - 1] = parsed;
      }
    });
    return state;
  }

  // Subscribes to click events on board squares for interaction
  bindEvents() {
    if (!this.boardElement) {
      return;
    }
    this.boardElement.addEventListener('click', event => {
      const square = event.target.closest('.square');
      if (!square || square.parentElement !== this.boardElement) {
        return;
      }
      const row = Number(square.dataset.row);
      const col = Number(square.dataset.col);
      this.handleSquareInteraction(row, col);
    });
  }

  // Handles selection logic or executes moves based on clicks
  handleSquareInteraction(row, col) {
    if (this.selectedSquare) {
      if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
        this.clearSelection();
        return;
      }
      const move = this.findMove(row, col);
      if (move) {
        this.movePiece(this.selectedSquare, { row, col }, move);
        return;
      }
    }
    const piece = this.getPiece(row, col);
    if (piece && piece.color === this.currentTurn) {
      this.selectSquare(row, col);
    } else {
      this.clearSelection();
    }
  }

  // Stores the active square and highlights its legal moves
  selectSquare(row, col) {
    this.selectedSquare = { row, col };
    this.availableMoves = this.getMoves(row, col);
    this.highlight.highlightMoves(this.availableMoves);
    this.markSelected(row, col);
  }

  // Removes current selection and any move highlights
  clearSelection() {
    this.selectedSquare = null;
    this.availableMoves = [];
    this.highlight.highlightMoves([]);
    if (this.selectedElement) {
      this.selectedElement.classList.remove('selected-square');
      this.selectedElement = null;
    }
  }

  // Applies the selected styling to the chosen square
  markSelected(row, col) {
    if (this.selectedElement) {
      this.selectedElement.classList.remove('selected-square');
    }
    this.selectedElement = this.getSquare(row, col);
    this.selectedElement?.classList.add('selected-square');
  }

  // Retrieves legal moves for a piece after syncing context
  getMoves(row, col) {
    this.syncContext();
    return this.moves.getPossibleMoves(this.boardState, row, col);
  }

  // Performs a validated move across state, DOM, and history
  movePiece(from, to, move) {
    const piece = this.getPiece(from.row, from.col);
    if (!piece) {
      return;
    }
    const snapshot = this.createSnapshot();
    const captureInfo = this.captureDetails(piece, to, move);
    this.applyStateMove(piece, from, to, move, captureInfo);
    this.applyDomMove(piece, from, to, move);
    this.postMove(piece, from, to, move, snapshot, captureInfo);
  }

  // Determines if the move captures a piece and returns its info
  captureDetails(piece, to, move) {
    if (move.type === 'enPassant') {
      const direction = piece.color === 'white' ? 1 : -1;
      const row = to.row - direction;
      return {
        captured: this.getPiece(row, to.col),
        row,
        col: to.col
      };
    }
    return {
      captured: this.getPiece(to.row, to.col),
      row: to.row,
      col: to.col
    };
  }

  // Updates the internal board, rights, and en passant target
  applyStateMove(piece, from, to, move, captureInfo) {
    this.boardState[from.row - 1][from.col - 1] = null;
    if (move.type === 'enPassant') {
      const direction = piece.color === 'white' ? 1 : -1;
      const captureRow = to.row - direction;
      this.boardState[captureRow - 1][to.col - 1] = null;
    }
    if (move.type === 'castle') {
      const step = move.side === 'king' ? -1 : 1;
      const rookFromCol = move.side === 'king' ? 1 : 8;
      const rookToCol = from.col + step;
      const rook = this.getPiece(from.row, rookFromCol);
      this.boardState[from.row - 1][rookFromCol - 1] = null;
      if (rook) {
        this.boardState[from.row - 1][rookToCol - 1] = {
          ...rook,
          hasMoved: true
        };
      }
    }
    const targetPiece =
      move.type === 'promotion' || move.type === 'promotionCapture'
        ? { ...piece, type: 'queen', hasMoved: true }
        : { ...piece, hasMoved: true };
    this.boardState[to.row - 1][to.col - 1] = targetPiece;
    if (piece.type === 'king') {
      this.castleRights[piece.color].king = false;
      this.castleRights[piece.color].queen = false;
    }
    if (piece.type === 'rook') {
      if (piece.color === 'white' && from.row === 1) {
        if (from.col === 1) {
          this.castleRights.white.queen = false;
        }
        if (from.col === 8) {
          this.castleRights.white.king = false;
        }
      }
      if (piece.color === 'black' && from.row === 8) {
        if (from.col === 1) {
          this.castleRights.black.queen = false;
        }
        if (from.col === 8) {
          this.castleRights.black.king = false;
        }
      }
    }
    if (captureInfo?.captured) {
      this.updateRightsAfterCapture(captureInfo.captured, captureInfo.row, captureInfo.col);
    }
    if (move.type === 'double') {
      const direction = piece.color === 'white' ? 1 : -1;
      this.enPassantTarget = { row: from.row + direction, col: from.col };
    } else {
      this.enPassantTarget = null;
    }
  }

  // Reflects the move visually by manipulating DOM elements
  applyDomMove(piece, from, to, move) {
    const fromSquare = this.getSquare(from.row, from.col);
    const toSquare = this.getSquare(to.row, to.col);
    if (!fromSquare || !toSquare) {
      return;
    }
    if (move.type === 'enPassant') {
      const direction = piece.color === 'white' ? 1 : -1;
      const captureRow = to.row - direction;
      const captureSquare = this.getSquare(captureRow, to.col);
      captureSquare?.querySelector('.piece')?.remove();
    }
    if (move.type !== 'enPassant') {
      toSquare.querySelector('.piece')?.remove();
    }
    const movingPiece = fromSquare.querySelector('.piece');
    if (move.type === 'promotion' || move.type === 'promotionCapture') {
      movingPiece?.remove();
      toSquare.appendChild(this.createPieceElement(piece.color, 'queen'));
    } else if (movingPiece) {
      toSquare.appendChild(movingPiece);
    }
    if (move.type === 'castle') {
      const step = move.side === 'king' ? -1 : 1;
      const rookFromCol = move.side === 'king' ? 1 : 8;
      const rookToCol = from.col + step;
      const rookFromSquare = this.getSquare(from.row, rookFromCol);
      const rookToSquare = this.getSquare(from.row, rookToCol);
      const rookPiece = rookFromSquare?.querySelector('.piece');
      if (rookPiece && rookToSquare) {
        rookToSquare.querySelector('.piece')?.remove();
        rookToSquare.appendChild(rookPiece);
      }
    }
  }

  // Records the move, swaps turn, and refreshes status indicators
  postMove(piece, from, to, move, snapshot, captureInfo) {
    this.history.push({
      from,
      to,
      piece: { ...piece },
      type: move.type,
      move,
      captured: captureInfo?.captured ? { ...captureInfo.captured } : null,
      snapshot
    });
    this.clearSelection();
    this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
    this.syncContext();
    this.updateGameStatus();
    this.refreshCheckHighlight();
  }

  // Highlights the active king if the new position is in check
  refreshCheckHighlight() {
    const checkedColor = this.status.check ? this.currentTurn : null;
    if (checkedColor) {
      const king = this.moves.findKing(this.boardState, checkedColor);
      this.highlight.highlightCheck(king);
    } else {
      this.highlight.highlightCheck(null);
    }
  }

  // Adjusts castle rights when a rook is captured on its home square
  updateRightsAfterCapture(captured, row, col) {
    if (!captured || captured.type !== 'rook') {
      return;
    }
    if (captured.color === 'white') {
      if (row === 1 && col === 1) {
        this.castleRights.white.queen = false;
      }
      if (row === 1 && col === 8) {
        this.castleRights.white.king = false;
      }
    } else {
      if (row === 8 && col === 1) {
        this.castleRights.black.queen = false;
      }
      if (row === 8 && col === 8) {
        this.castleRights.black.king = false;
      }
    }
  }

  // Finds the cached move definition for a target square
  findMove(row, col) {
    return this.availableMoves.find(
      move => move.row === row && move.col === col
    );
  }

  // Returns the tracked piece at the given coordinates
  getPiece(row, col) {
    return this.boardState[row - 1]?.[col - 1] || null;
  }

  // Retrieves the DOM square element for the coordinates
  getSquare(row, col) {
    if (!this.boardElement) {
      return null;
    }
    return this.boardElement.querySelector(
      `.square[data-row="${row}"][data-col="${col}"]`
    );
  }

  // Pushes current castle rights and en passant target to the move generator
  syncContext() {
    this.moves.setContext({
      castleRights: this.castleRights,
      enPassantTarget: this.enPassantTarget
    });
  }

  // Recomputes check, mate, stalemate, and emits a status event
  updateGameStatus() {
    const check = this.isCheck(this.currentTurn);
    const checkmate = this.isCheckmate(this.currentTurn);
    const stalemate = !checkmate && this.isStalemate(this.currentTurn);
    this.status = {
      check,
      checkmate,
      stalemate,
      turn: this.currentTurn
    };
    if (this.boardElement) {
      this.boardElement.dispatchEvent(
        new CustomEvent('chess:status', { detail: this.status })
      );
    }
  }

  // Uses the move generator to see if a king is attacked
  isCheck(color) {
    return this.moves.isKingInCheck(this.boardState, color);
  }

  // Determines if the color is in check with no escape moves
  isCheckmate(color) {
    if (!this.isCheck(color)) {
      return false;
    }
    return !this.hasLegalMoves(color);
  }

  // Determines if the color has no legal moves while not in check
  isStalemate(color) {
    if (this.isCheck(color)) {
      return false;
    }
    return !this.hasLegalMoves(color);
  }

  // Scans every piece of a color to see if any legal move exists
  hasLegalMoves(color) {
    this.syncContext();
    for (let row = 1; row <= 8; row += 1) {
      for (let col = 1; col <= 8; col += 1) {
        const piece = this.getPiece(row, col);
        if (piece && piece.color === color) {
          const moves = this.moves.getPossibleMoves(this.boardState, row, col);
          if (moves.length) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Converts an image alt code into an internal piece descriptor
  parsePiece(alt) {
    const code = alt.slice(0, 2);
    const colorChar = code[0];
    const typeChar = code[1];
    const color = colorChar === 'w' ? 'white' : 'black';
    const type = TYPE_BY_CODE[typeChar];
    if (!type) {
      return null;
    }
    return {
      color,
      type,
      hasMoved: false
    };
  }

  // Creates an <img> element for a promoted or moved piece
  createPieceElement(color, type) {
    const img = document.createElement('img');
    img.classList.add('piece');
    img.alt = `${color === 'white' ? 'w' : 'b'}${CODE_BY_TYPE[type]}`;
    img.src = `${this.imageFolder}/${img.alt}.svg`;
    return img;
  }

  createSnapshot() {
    return {
      boardState: this.cloneBoardState(this.boardState),
      currentTurn: this.currentTurn,
      enPassantTarget: this.enPassantTarget
        ? { ...this.enPassantTarget }
        : null,
      castleRights: {
        white: { ...this.castleRights.white },
        black: { ...this.castleRights.black }
      }
    };
  }

  cloneBoardState(board) {
    return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
  }

  restoreSnapshot(snapshot) {
    if (!snapshot) {
      return;
    }
    this.boardState = this.cloneBoardState(snapshot.boardState);
    this.currentTurn = snapshot.currentTurn;
    this.enPassantTarget = snapshot.enPassantTarget
      ? { ...snapshot.enPassantTarget }
      : null;
    this.castleRights = {
      white: { ...snapshot.castleRights.white },
      black: { ...snapshot.castleRights.black }
    };
  }

  rebuildBoardDom() {
    if (!this.boardElement) {
      return;
    }
    this.boardElement.querySelectorAll('.piece').forEach(img => img.remove());
    for (let row = 1; row <= 8; row += 1) {
      for (let col = 1; col <= 8; col += 1) {
        const piece = this.getPiece(row, col);
        if (!piece) {
          continue;
        }
        const square = this.getSquare(row, col);
        if (!square) {
          continue;
        }
        square.appendChild(this.createPieceElement(piece.color, piece.type));
      }
    }
  }

  undoLastMove() {
    if (!this.history.length) {
      return null;
    }
    const last = this.history.pop();
    this.restoreSnapshot(last.snapshot);
    this.rebuildBoardDom();
    this.clearSelection();
    this.highlight.highlightMoves([]);
    this.highlight.highlightCheck(null);
    this.updateGameStatus();
    return last;
  }

  applyMove(historyEntry) {
    if (!historyEntry) {
      return;
    }
    const from = historyEntry.from;
    const to = historyEntry.to;
    const move = historyEntry.move || {
      row: to.row,
      col: to.col,
      type: historyEntry.type || 'move'
    };
    this.movePiece(from, to, move);
  }
}

export { ChessEngine };
