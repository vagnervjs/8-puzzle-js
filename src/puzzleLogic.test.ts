import { describe, it, expect } from 'vitest';
import {
    isSolved,
    applyMove,
    getSquareNumberFromIndex,
    getIndexFromSquareNumber,
    GOAL_STATE,
    NUM_SQUARES
} from './puzzleLogic'; // Assuming path is correct if test file is in src/
import type { BoardState } from './types';

describe('isSolved', () => {
    it('should return true for a solved board (GOAL_STATE)', () => {
        expect(isSolved(GOAL_STATE)).toBe(true);
    });

    it('should return false for an unsolved board', () => {
        const unsolvedBoard: BoardState = [1, 2, 3, 4, 5, 6, 0, 7, 8]; // One move away
        expect(isSolved(unsolvedBoard)).toBe(false);
    });

    it('should return false for another unsolved board', () => {
        const unsolvedBoard: BoardState = [8, 7, 6, 5, 4, 3, 2, 1, 0];
        expect(isSolved(unsolvedBoard)).toBe(false);
    });

    it('should return false if board length is incorrect', () => {
        const shortBoard: BoardState = [1,2,3,4,5,6,7,8];
        expect(isSolved(shortBoard)).toBe(false);
    });
});

describe('applyMove', () => {
    it('should correctly apply a valid move', () => {
        const initialBoard: BoardState = [1, 2, 3, 4, 5, 6, 7, 0, 8]; // 0 is at index 7
        const pieceToMoveIndex = 8; // Piece '8'
        const targetEmptyIndex = 7; // Current empty spot
        const expectedState: BoardState = [1, 2, 3, 4, 5, 6, 7, 8, 0];

        const newState = applyMove(initialBoard, pieceToMoveIndex, targetEmptyIndex);
        expect(newState).toEqual(expectedState);
    });

    it('should swap the piece and the empty space', () => {
        const initialBoard: BoardState = [1, 0, 2, 3, 4, 5, 6, 7, 8]; // 0 is at index 1
        const pieceToMoveIndex = 0; // Piece '1'
        const targetEmptyIndex = 1;

        const newState = applyMove(initialBoard, pieceToMoveIndex, targetEmptyIndex);
        expect(newState[targetEmptyIndex]).toBe(1);
        expect(newState[pieceToMoveIndex]).toBe(0);
    });

    it('should return a new board state instance', () => {
        const initialBoard: BoardState = [1, 2, 3, 4, 0, 5, 6, 7, 8];
        const pieceToMoveIndex = 5; // Piece '5'
        const targetEmptyIndex = 4;

        const newState = applyMove(initialBoard, pieceToMoveIndex, targetEmptyIndex);
        expect(newState).not.toBe(initialBoard); // Check for immutability
    });

    it('should not modify the original board state', () => {
        const initialBoard: BoardState = [1, 2, 3, 4, 0, 5, 6, 7, 8];
        const originalBoardCopy = [...initialBoard];
        const pieceToMoveIndex = 5;
        const targetEmptyIndex = 4;

        applyMove(initialBoard, pieceToMoveIndex, targetEmptyIndex);
        expect(initialBoard).toEqual(originalBoardCopy); // Original should be unchanged
    });

    it('should return original state if trying to move to a non-empty target', () => {
        const initialBoard: BoardState = [1, 2, 3, 4, 5, 0, 6, 7, 8]; // 0 at index 5
        const pieceToMoveIndex = 0; // piece '1'
        const targetNonEmptyIndex = 1; // piece '2'
        const newState = applyMove(initialBoard, pieceToMoveIndex, targetNonEmptyIndex);
        expect(newState).toEqual(initialBoard); // State should be unchanged
    });

    it('should return original state if trying to move a null piece (if board allows nulls)', () => {
        const initialBoard: BoardState = [1, null, 3, 0, 5, 6, 7, 8, 2]; // null at index 1, 0 at index 3
        const pieceToMoveIndex = 1; // the null piece
        const targetEmptyIndex = 3;
        const newState = applyMove(initialBoard, pieceToMoveIndex, targetEmptyIndex);
        expect(newState).toEqual(initialBoard);
    });
});

describe('coordinate conversions', () => {
    it('getSquareNumberFromIndex should convert 0-indexed to 1-indexed', () => {
        expect(getSquareNumberFromIndex(0)).toBe(1);
        expect(getSquareNumberFromIndex(8)).toBe(9);
        expect(getSquareNumberFromIndex(4)).toBe(5);
    });

    it('getIndexFromSquareNumber should convert 1-indexed to 0-indexed', () => {
        expect(getIndexFromSquareNumber(1)).toBe(0);
        expect(getIndexFromSquareNumber(9)).toBe(8);
        expect(getIndexFromSquareNumber(5)).toBe(4);
    });
});
