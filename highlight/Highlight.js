class Highlight {
  // Stores board reference and tracking sets for highlighted squares
  constructor(boardElement) {
    this.boardElement = boardElement;
    this.moveSquares = new Set();
    this.checkSquare = null;
  }

  // Adds visual markers for every provided move target
  highlightMoves(moves = []) {
    this.clearMoveHighlights();
    moves.forEach(move => {
      const square = this.getSquare(move.row, move.col);
      if (!square) {
        return;
      }
      const cls = this.classForMove(move);
      square.classList.add(cls);
      this.moveSquares.add(square);
    });
  }

  // Highlights the king's square when it is under attack
  highlightCheck(kingPosition) {
    if (this.checkSquare) {
      this.checkSquare.classList.remove('king-in-check');
      this.checkSquare = null;
    }
    if (!kingPosition) {
      return;
    }
    const square = this.getSquare(kingPosition.row, kingPosition.col);
    if (square) {
      square.classList.add('king-in-check');
      this.checkSquare = square;
    }
  }

  // Clears both move highlights and any check indicator
  clearHighlights() {
    this.clearMoveHighlights();
    if (this.checkSquare) {
      this.checkSquare.classList.remove('king-in-check');
      this.checkSquare = null;
    }
  }

  // Removes move-related highlight classes from all squares
  clearMoveHighlights() {
    this.moveSquares.forEach(square => {
      square.classList.remove('legal-move');
      square.classList.remove('capture-move');
      square.classList.remove('castle-move');
      square.classList.remove('en-passant-move');
    });
    this.moveSquares.clear();
  }

  // Returns the CSS class representing the move type
  classForMove(move) {
    if (move.type === 'capture' || move.type === 'promotionCapture') {
      return 'capture-move';
    }
    if (move.type === 'castle') {
      return 'castle-move';
    }
    if (move.type === 'enPassant') {
      return 'en-passant-move';
    }
    return 'legal-move';
  }

  // Finds the DOM square element for the given coordinates
  getSquare(row, col) {
    if (!this.boardElement) {
      return null;
    }
    return this.boardElement.querySelector(
      `.square[data-row="${row}"][data-col="${col}"]`
    );
  }
}

export { Highlight };
