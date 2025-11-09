class Board {
  constructor() {
    this.board = document.getElementById('board');
    this.createBoard();
  }

  createBoard() {
    const board = this.board;
    for (let row = 8; row > 0; --row) {
      for (let col = 8; col > 0; --col) {
        const square = document.createElement('div');
        square.classList.add('square');
        let color;
        if ((row + col) & 1) {
          color = "black";
        } else {
          color = "white";
        }
        square.classList.add(color);
        this.createBoardSpans(square, row, col, color);
        square.dataset.row = row;
        square.dataset.col = col;
        board.appendChild(square);
      }
    }
  }

  createBoardSpans(square, row, col, color) {
    if (col === 8) {
      const span = document.createElement('span');
      span.classList.add("numbers");
      span.classList.add(`letters-${color}`);
      span.textContent = row;
      square.appendChild(span);
    }
    if (row === 1) {
      const span = document.createElement('span');
      span.classList.add("letters");
      span.classList.add(`letters-${color}`);
      span.textContent = String.fromCharCode(105 - col);
      square.appendChild(span);
    }
  }
}

class Pieces {
  constructor(boardElement) {
    this.boardElement = boardElement;
    this.pieceFolder = './images';
  }

  createPieces() {
    if (!this.boardElement) {
      return;
    }
    const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let col = 1; col <= 8; col++) {
      this.addPiece(1, col, `w${backRank[col - 1]}`);
      this.addPiece(2, col, 'wp');
      this.addPiece(7, col, 'bp');
      this.addPiece(8, col, `b${backRank[col - 1]}`);
    }
  }

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

let board = new Board();
const pieces = new Pieces(board.board);
pieces.createPieces();
