import type { BoardState, PosMap } from './types';

/** The total number of squares on the puzzle board (e.g., 9 for a 3x3 grid). */
export const NUM_SQUARES: number = 9;

/** The number of actual puzzle pieces (excluding the empty square). */
export const NUM_PIECES: number = NUM_SQUARES - 1;

/**
 * The target configuration of the puzzle board representing the solved state.
 * The empty square is represented by `0`. Values are 1-indexed tile numbers,
 * and their positions in the array are 0-indexed.
 */
export const GOAL_STATE: BoardState = [1, 2, 3, 4, 5, 6, 7, 8, 0];

/**
 * Adjacency list for the squares on the puzzle board.
 * Keys are 1-indexed square numbers. Values are arrays of 1-indexed square numbers
 * that are adjacent (i.e., a piece can move from an adjacent square into the key square if it's empty).
 */
export const POS_ADJACENCY: PosMap = {
  1: [2, 4], 2: [1, 3, 5], 3: [2, 6],
  4: [1, 7, 5], 5: [2, 4, 6, 8], 6: [3, 5, 9],
  7: [4, 8], 8: [7, 5, 9], 9: [8, 6]
};

/**
 * Checks if the provided board state matches the {@link GOAL_STATE}.
 * @param boardState The current state of the board, as a `BoardState` array.
 * @returns `true` if the board is solved, `false` otherwise.
 */
export function isSolved(boardState: BoardState): boolean {
  if (boardState.length !== GOAL_STATE.length) return false;
  for (let i = 0; i < GOAL_STATE.length; i++) {
    if (boardState[i] !== GOAL_STATE[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Applies a move to a given board state and returns a new board state representing the result.
 * This function does not mutate the original `currentBoardState`.
 * The tile at `pieceToMoveIndex` is swapped with the empty space (0) at `targetEmptyIndex`.
 * @param currentBoardState The current state of the board before the move.
 * @param pieceToMoveIndex The 0-indexed board position of the piece that is intended to be moved.
 * @param targetEmptyIndex The 0-indexed board position of the empty square where the piece will move.
 * @returns A new `BoardState` array representing the board after the move.
 *          If the move is invalid (e.g., target is not empty, piece is null),
 *          it logs an error and returns a copy of the original board state.
 * @throws Will not throw an error directly but logs to console on invalid move.
 *         Consider stricter error handling if necessary for the application.
 */
export function applyMove(
  currentBoardState: BoardState,
  pieceToMoveIndex: number,
  targetEmptyIndex: number
): BoardState {
  const newBoardState = [...currentBoardState]; // Create a copy to ensure immutability
  const tileValue = newBoardState[pieceToMoveIndex];

  // Validate the move
  if (tileValue === null) {
    console.error(
        "Invalid move: Attempted to move a 'null' tile.",
        { currentBoardState, pieceToMoveIndex, targetEmptyIndex }
    );
    return newBoardState; // Return original state copy on error
  }
  if (newBoardState[targetEmptyIndex] !== 0) {
    console.error(
        "Invalid move: Target square is not empty.",
        { currentBoardState, pieceToMoveIndex, targetEmptyIndex, targetValue: newBoardState[targetEmptyIndex] }
    );
    return newBoardState; // Return original state copy on error
  }

  // Perform the swap
  newBoardState[targetEmptyIndex] = tileValue;
  newBoardState[pieceToMoveIndex] = 0; // The piece's original spot becomes empty

  return newBoardState;
}

/**
 * Converts a 0-indexed board array index to its corresponding 1-indexed square number.
 * This is useful when relating board array positions to UI elements or `POS_ADJACENCY` keys.
 * @param index0 The 0-indexed position in the `BoardState` array.
 * @returns The corresponding 1-indexed square number (e.g., index 0 maps to square 1).
 */
export function getSquareNumberFromIndex(index0: number): number {
    return index0 + 1;
}

/**
 * Converts a 1-indexed square number to its corresponding 0-indexed board array index.
 * This is useful for accessing elements within the `BoardState` array using a square number.
 * @param squareNumber1 The 1-indexed square number (e.g., as used in UI or `POS_ADJACENCY`).
 * @returns The corresponding 0-indexed position in the `BoardState` array (e.g., square 1 maps to index 0).
 */
export function getIndexFromSquareNumber(squareNumber1: number): number {
    return squareNumber1 - 1;
}
