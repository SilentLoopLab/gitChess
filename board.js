class Board {
  // Grabs the board container and starts building all squares
  constructor() {
    this.board = document.getElementById('board');
    this.createBoard();
  }

  // Creates the 8x8 grid with alternating colors and coordinates
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

  // Adds rank and file labels to the edge squares
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

export { Board };
