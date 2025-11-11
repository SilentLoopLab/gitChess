import { Board } from './board.js';
import { Pieces } from './pieces.js';
import { Buttons } from './buttons.js';
import { ChessEngine } from './engine/Engine.js';

document.addEventListener('DOMContentLoaded', () => {
  const chessBoard = new Board();
  const pieces = new Pieces(chessBoard.board);
  pieces.createPieces();
  const engine = new ChessEngine(document.getElementById('board'));
  const buttons = new Buttons(engine);
  buttons.init();
});
