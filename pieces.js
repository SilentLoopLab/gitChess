class Pieces {
  // Stores the board reference and image location for piece sprites
  constructor(boardElement) {
    this.boardElement = boardElement;
    this.pieceFolder = './images';
  }

  // Places all starting pieces for both colors onto the board
  createPieces() {
    if (!this.boardElement) {
      return;
    }
    const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let file = 1; file <= 8; file++) {
      const boardCol = 9 - file;
      this.addPiece(1, boardCol, `w${backRank[file - 1]}`);
      this.addPiece(2, boardCol, 'wp');
      this.addPiece(7, boardCol, 'bp');
      this.addPiece(8, boardCol, `b${backRank[file - 1]}`);
    }
  }

  // Creates a piece image and appends it to the given square
  addPiece(row, col, pieceCode) {
    const square = this.boardElement.querySelector(
      `.square[data-row="${row}"][data-col="${col}"]`
    );
    if (!square) {
      return;
    }
    const img = document.createElement('img');
    img.src = `${this.pieceFolder}/${pieceCode}.svg`;
    img.alt = pieceCode;
    img.classList.add('piece');
    square.appendChild(img);
  }
}

export { Pieces }
