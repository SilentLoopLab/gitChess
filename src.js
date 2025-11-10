import { Board } from './board.js';
import { Pieces } from './pieces.js';
import { Buttons } from './buttons.js';
import { ChessEngine } from './engine/Engine.js';

let ChessBoard = new Board();
const pieces = new Pieces(ChessBoard.board);
pieces.createPieces();
const buttons = new Buttons();
buttons.init();
new ChessEngine(document.getElementById('board'));
