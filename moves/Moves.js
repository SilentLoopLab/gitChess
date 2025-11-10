const ROOK_VECTORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

const BISHOP_VECTORS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1]
];

const KNIGHT_JUMPS = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1]
];

const KING_STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1]
];

class Moves {
  // Initializes default move context for castling and en passant info
  constructor() {
    this.context = {
      castleRights: {
        white: { king: true, queen: true },
        black: { king: true, queen: true }
      },
      enPassantTarget: null
    };
  }

  // Updates the internal context with the latest game metadata
  setContext(context = {}) {
    const mergedCastle = {
      white: {
        king:
          context.castleRights?.white?.king ??
          this.context.castleRights.white.king,
        queen:
          context.castleRights?.white?.queen ??
          this.context.castleRights.white.queen
      },
      black: {
        king:
          context.castleRights?.black?.king ??
          this.context.castleRights.black.king,
        queen:
          context.castleRights?.black?.queen ??
          this.context.castleRights.black.queen
      }
    };
    this.context = {
      ...this.context,
      ...context,
      castleRights: mergedCastle
    };
  }

  // Returns all legal moves for the piece at the given square
  getPossibleMoves(boardState, fromRow, fromCol) {
    const piece = this.getPiece(boardState, fromRow, fromCol);
    if (!piece) {
      return [];
    }
    const generator = {
      pawn: () => this.generatePawnMoves(boardState, fromRow, fromCol, piece),
      rook: () => this.generateSlidingMoves(boardState, fromRow, fromCol, piece, ROOK_VECTORS),
      bishop: () => this.generateSlidingMoves(boardState, fromRow, fromCol, piece, BISHOP_VECTORS),
      queen: () => this.generateSlidingMoves(boardState, fromRow, fromCol, piece, [...ROOK_VECTORS, ...BISHOP_VECTORS]),
      knight: () => this.generateKnightMoves(boardState, fromRow, fromCol, piece),
      king: () => this.generateKingMoves(boardState, fromRow, fromCol, piece)
    }[piece.type];
    if (!generator) {
      return [];
    }
    const rawMoves = generator();
    return rawMoves.filter(move =>
      this.isMoveLegal(boardState, fromRow, fromCol, move, piece.color)
    );
  }

  // Simulates a move and ensures it does not leave the king in check
  isMoveLegal(boardState, fromRow, fromCol, move, color) {
    const nextState = this.simulate(boardState, fromRow, fromCol, move);
    return !this.isKingInCheck(nextState, color);
  }

  // Generates forward, capture, double, and en passant pawn moves
  generatePawnMoves(boardState, row, col, piece) {
    const moves = [];
    const direction = piece.color === 'white' ? 1 : -1;
    const startRow = piece.color === 'white' ? 2 : 7;
    const oneStep = row + direction;
    if (this.isInside(oneStep, col) && !this.getPiece(boardState, oneStep, col)) {
      moves.push(
        this.withPromotion(oneStep, col, piece.color, { type: 'move' })
      );
      const twoStep = row + direction * 2;
      if (row === startRow && !this.getPiece(boardState, twoStep, col)) {
        moves.push({ row: twoStep, col, type: 'double' });
      }
    }
    [-1, 1].forEach(delta => {
      const targetRow = row + direction;
      const targetCol = col + delta;
      if (!this.isInside(targetRow, targetCol)) {
        return;
      }
      const target = this.getPiece(boardState, targetRow, targetCol);
      if (target && target.color !== piece.color) {
        moves.push(
          this.withPromotion(targetRow, targetCol, piece.color, { type: 'capture' })
        );
      } else if (
        this.context.enPassantTarget &&
        this.context.enPassantTarget.row === targetRow &&
        this.context.enPassantTarget.col === targetCol
      ) {
        moves.push({ row: targetRow, col: targetCol, type: 'enPassant' });
      }
    });
    return moves;
  }

  // Generates all L-shaped jumps available to a knight
  generateKnightMoves(boardState, row, col, piece) {
    const moves = [];
    KNIGHT_JUMPS.forEach(([dr, dc]) => {
      const targetRow = row + dr;
      const targetCol = col + dc;
      if (!this.isInside(targetRow, targetCol)) {
        return;
      }
      const target = this.getPiece(boardState, targetRow, targetCol);
      if (!target) {
        moves.push({ row: targetRow, col: targetCol, type: 'move' });
      } else if (target.color !== piece.color) {
        moves.push({ row: targetRow, col: targetCol, type: 'capture' });
      }
    });
    return moves;
  }

  // Walks rays in each vector direction for bishops, rooks, or queens
  generateSlidingMoves(boardState, row, col, piece, vectors) {
    const moves = [];
    vectors.forEach(([dr, dc]) => {
      let targetRow = row + dr;
      let targetCol = col + dc;
      while (this.isInside(targetRow, targetCol)) {
        const target = this.getPiece(boardState, targetRow, targetCol);
        if (!target) {
          moves.push({ row: targetRow, col: targetCol, type: 'move' });
        } else {
          if (target.color !== piece.color) {
            moves.push({ row: targetRow, col: targetCol, type: 'capture' });
          }
          break;
        }
        targetRow += dr;
        targetCol += dc;
      }
    });
    return moves;
  }

  // Collects adjacent king steps and any available castling moves
  generateKingMoves(boardState, row, col, piece) {
    const moves = [];
    KING_STEPS.forEach(([dr, dc]) => {
      const targetRow = row + dr;
      const targetCol = col + dc;
      if (!this.isInside(targetRow, targetCol)) {
        return;
      }
      const target = this.getPiece(boardState, targetRow, targetCol);
      if (!target) {
        moves.push({ row: targetRow, col: targetCol, type: 'move' });
      } else if (target.color !== piece.color) {
        moves.push({ row: targetRow, col: targetCol, type: 'capture' });
      }
    });
    moves.push(...this.generateCastleMoves(boardState, row, col, piece));
    return moves;
  }

  // Determines which castling options remain legal for the king
  generateCastleMoves(boardState, row, col, piece) {
    const moves = [];
    const rights = this.context.castleRights[piece.color];
    if (!rights) {
      return moves;
    }
    if (rights.king && this.canCastle(boardState, piece.color, 'king')) {
      moves.push({ row, col: col + 2, type: 'castle', side: 'king' });
    }
    if (rights.queen && this.canCastle(boardState, piece.color, 'queen')) {
      moves.push({ row, col: col - 2, type: 'castle', side: 'queen' });
    }
    return moves;
  }

  // Checks path clearance, safety, and rook presence for castling
  canCastle(boardState, color, side) {
    const row = color === 'white' ? 1 : 8;
    const rookCol = side === 'king' ? 8 : 1;
    if (this.isKingInCheck(boardState, color)) {
      return false;
    }
    const between =
      side === 'king' ? [6, 7] : [4, 3, 2];
    for (const col of between) {
      if (this.getPiece(boardState, row, col)) {
        return false;
      }
    }
    const safety =
      side === 'king' ? [5, 6, 7] : [5, 4, 3];
    const opponent = color === 'white' ? 'black' : 'white';
    for (const col of safety) {
      if (this.isSquareAttacked(boardState, row, col, opponent)) {
        return false;
      }
    }
    const rook = this.getPiece(boardState, row, rookCol);
    return rook && rook.type === 'rook' && rook.color === color && !rook.hasMoved;
  }

  // Flags pawn moves that reach the final rank for promotion
  withPromotion(row, col, color, move) {
    const promotionRow = color === 'white' ? 8 : 1;
    if (row === promotionRow) {
      return { ...move, row, col, type: move.type === 'capture' ? 'promotionCapture' : 'promotion' };
    }
    return { ...move, row, col };
  }

  // Applies a move on a cloned board to inspect resulting state
  simulate(boardState, fromRow, fromCol, move) {
    const clone = boardState.map(row =>
      row.map(cell => (cell ? { ...cell } : null))
    );
    const piece = { ...this.getPiece(clone, fromRow, fromCol) };
    clone[fromRow - 1][fromCol - 1] = null;
    if (move.type === 'castle') {
      const rookFromCol = move.side === 'king' ? 8 : 1;
      const rookToCol = move.side === 'king' ? 6 : 4;
      const rook = { ...this.getPiece(clone, fromRow, rookFromCol) };
      clone[fromRow - 1][rookFromCol - 1] = null;
      clone[fromRow - 1][rookToCol - 1] = { ...rook, hasMoved: true };
      clone[move.row - 1][move.col - 1] = { ...piece, hasMoved: true };
      return clone;
    }
    if (move.type === 'enPassant') {
      const direction = piece.color === 'white' ? 1 : -1;
      const captureRow = move.row - direction;
      clone[captureRow - 1][move.col - 1] = null;
    }
    const targetType =
      move.type === 'promotion' || move.type === 'promotionCapture'
        ? 'queen'
        : piece.type;
    clone[move.row - 1][move.col - 1] = {
      ...piece,
      type: targetType,
      hasMoved: true
    };
    return clone;
  }

  // Determines whether the specified color's king is attacked
  isKingInCheck(boardState, color) {
    const king = this.findKing(boardState, color);
    if (!king) {
      return false;
    }
    const opponent = color === 'white' ? 'black' : 'white';
    return this.isSquareAttacked(boardState, king.row, king.col, opponent);
  }

  // Tests if a given square is attacked by the opposing color
  isSquareAttacked(boardState, row, col, attackerColor) {
    const pawnDir = attackerColor === 'white' ? 1 : -1;
    const pawnRow = row - pawnDir;
    for (const delta of [-1, 1]) {
      const pawnCol = col + delta;
      if (
        this.isInside(pawnRow, pawnCol) &&
        this.matches(boardState, pawnRow, pawnCol, attackerColor, 'pawn')
      ) {
        return true;
      }
    }
    for (const [dr, dc] of KNIGHT_JUMPS) {
      const targetRow = row + dr;
      const targetCol = col + dc;
      if (
        this.isInside(targetRow, targetCol) &&
        this.matches(boardState, targetRow, targetCol, attackerColor, 'knight')
      ) {
        return true;
      }
    }
    if (this.scanLines(boardState, row, col, attackerColor, BISHOP_VECTORS, ['bishop', 'queen'])) {
      return true;
    }
    if (this.scanLines(boardState, row, col, attackerColor, ROOK_VECTORS, ['rook', 'queen'])) {
      return true;
    }
    for (const [dr, dc] of KING_STEPS) {
      const targetRow = row + dr;
      const targetCol = col + dc;
      if (
        this.isInside(targetRow, targetCol) &&
        this.matches(boardState, targetRow, targetCol, attackerColor, 'king')
      ) {
        return true;
      }
    }
    return false;
  }

  // Scans ray directions for sliding attackers of certain types
  scanLines(boardState, row, col, attackerColor, vectors, types) {
    for (const [dr, dc] of vectors) {
      let targetRow = row + dr;
      let targetCol = col + dc;
      while (this.isInside(targetRow, targetCol)) {
        const piece = this.getPiece(boardState, targetRow, targetCol);
        if (piece) {
          if (piece.color === attackerColor && types.includes(piece.type)) {
            return true;
          }
          break;
        }
        targetRow += dr;
        targetCol += dc;
      }
    }
    return false;
  }

  // Helper to check if a square contains a specific piece type
  matches(boardState, row, col, color, type) {
    const piece = this.getPiece(boardState, row, col);
    return piece && piece.color === color && piece.type === type;
  }

  // Locates the king coordinates for the requested color
  findKing(boardState, color) {
    for (let row = 1; row <= 8; row += 1) {
      for (let col = 1; col <= 8; col += 1) {
        const piece = this.getPiece(boardState, row, col);
        if (piece && piece.color === color && piece.type === 'king') {
          return { row, col };
        }
      }
    }
    return null;
  }

  // Validates that a coordinate lies within the 8x8 board
  isInside(row, col) {
    return row >= 1 && row <= 8 && col >= 1 && col <= 8;
  }

  // Returns the piece object stored at the given coordinate
  getPiece(boardState, row, col) {
    return boardState[row - 1]?.[col - 1] || null;
  }
}

export { Moves };
