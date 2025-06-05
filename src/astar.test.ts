import { describe, it, expect } from 'vitest';
import { getManhattanDistance, performAStarSearch } from './astar';
import { GOAL_STATE, POS_ADJACENCY, NUM_SQUARES } from './puzzleLogic';
import type { BoardState, SearchNodeAction } from './types';

describe('getManhattanDistance', () => {
    it('should return 0 for a solved board (GOAL_STATE)', () => {
        expect(getManhattanDistance(GOAL_STATE, GOAL_STATE, NUM_SQUARES)).toBe(0);
    });

    it('should calculate correct distance for a simple unsolved board (one move away)', () => {
        // 1 2 3
        // 4 5 6
        // 7 0 8  (Piece 8 needs to move one step left)
        const board: BoardState = [1, 2, 3, 4, 5, 6, 7, 0, 8];
        // Piece 8 is at index 8 (row 2, col 2). Goal is index 7 (row 2, col 1). Distance = 1.
        expect(getManhattanDistance(board, GOAL_STATE, NUM_SQUARES)).toBe(1);
    });

    it('should calculate correct distance for another example', () => {
        // 1 2 3
        // 4 5 0
        // 7 8 6 (Piece 6 needs to move one step up)
        const board: BoardState = [1, 2, 3, 4, 5, 0, 7, 8, 6];
        // Piece 6 is at index 8 (row 2, col 2). Goal is index 5 (row 1, col 2). Distance = 1.
        expect(getManhattanDistance(board, GOAL_STATE, NUM_SQUARES)).toBe(1);
    });

    it('should calculate correct distance for a board a few moves away', () => {
        // Example:
        // 1 2 3
        // 4 0 5
        // 7 8 6
        // Piece 5: current (1,2), goal (1,1) -> dist 1
        // Piece 6: current (2,2), goal (2,1) -> dist 1
        // Total = 2
        const board: BoardState = [1, 2, 3, 4, 0, 5, 7, 8, 6];
        expect(getManhattanDistance(board, GOAL_STATE, NUM_SQUARES)).toBe(2);
    });

    it('should calculate correct distance for a more complex board', () => {
        // 4 1 2
        // 0 5 3
        // 7 8 6
        // Tile 4: current (0,0), goal (1,0) -> 1
        // Tile 1: current (0,1), goal (0,0) -> 1
        // Tile 2: current (0,2), goal (0,1) -> 1
        // Tile 5: current (1,1), goal (1,1) -> 0
        // Tile 3: current (1,2), goal (0,2) -> 1
        // Tile 6: current (2,2), goal (2,1) -> 1
        // Total = 1+1+1+0+1+1 = 5
        const board: BoardState = [4, 1, 2, 0, 5, 3, 7, 8, 6];
        expect(getManhattanDistance(board, GOAL_STATE, NUM_SQUARES)).toBe(5);
    });
});

describe('performAStarSearch', () => {
    it('should return an empty path for an already solved board', () => {
        const path = performAStarSearch(GOAL_STATE, POS_ADJACENCY);
        expect(path).toEqual([]); // A* returns empty array for already solved state
    });

    it('should find a solution for a board one move away', () => {
        const initialState: BoardState = [1, 2, 3, 4, 5, 6, 7, 0, 8]; // Piece 8 moves to empty spot
        const path = performAStarSearch(initialState, POS_ADJACENCY);
        expect(path).not.toBeNull();
        expect(path?.length).toBe(1);
        if (path) { // Type guard
            // Expected action: Tile 8 (value) moves from index 8 (fromIndex) to index 7 (toIndex)
            expect(path[0]).toEqual({ tileValue: 8, fromIndex: 8, toIndex: 7 });
        }
    });

    it('should find a solution for a board two moves away', () => {
        // 1 2 3
        // 4 0 5
        // 7 8 6
        // Optimal path:
        // 1. Tile 5 moves up (from index 5 to 4) -> [1,2,3,4,5,0,7,8,6]
        // 2. Tile 6 moves up (from index 8 to 5) -> [1,2,3,4,5,6,7,8,0] = GOAL
        const initialState: BoardState = [1, 2, 3, 4, 0, 5, 7, 8, 6];
        const path = performAStarSearch(initialState, POS_ADJACENCY);
        expect(path).not.toBeNull();
        expect(path?.length).toBe(2);
        if (path) {
            expect(path[0]).toEqual({ tileValue: 5, fromIndex: 5, toIndex: 4 });
            expect(path[1]).toEqual({ tileValue: 6, fromIndex: 8, toIndex: 5 });
        }
    });

    // This test can be slow if A* is not efficient or the state is far from goal.
    // For now, a moderately complex board (known small number of moves)
    it('should find a solution for a moderately complex board (Luttons.com #4, 4 moves)', () => {
        // 1 2 0
        // 4 5 3
        // 7 8 6
        // Expected solution path:
        // 1. Tile 3 to empty: [1,2,3, 4,5,0, 7,8,6] (action: {tile:3, from:5, to:2})
        // 2. Tile 6 to empty: [1,2,3, 4,5,6, 7,8,0] (action: {tile:6, from:8, to:5})
        // This is the example from the previous test. Let's use a different one.
        // Start:
        // 1 2 3
        // 0 4 5
        // 7 8 6
        // Path:
        // 1. 4 right: 1 2 3 / 4 0 5 / 7 8 6 (action: {tile:4, from:4, to:3})
        // 2. 5 up:    1 2 3 / 4 5 0 / 7 8 6 (action: {tile:5, from:5, to:4})
        // 3. 6 up:    1 2 3 / 4 5 6 / 7 8 0 (action: {tile:6, from:8, to:5})
        const initialState: BoardState = [1, 2, 3, 0, 4, 5, 7, 8, 6];
        const path = performAStarSearch(initialState, POS_ADJACENCY);
        expect(path).not.toBeNull();
        expect(path?.length).toBe(3); // Length of path to solve
         if (path) {
            expect(path[0]).toEqual({ tileValue: 4, fromIndex: 4, toIndex: 3 });
            expect(path[1]).toEqual({ tileValue: 5, fromIndex: 5, toIndex: 4 });
            expect(path[2]).toEqual({ tileValue: 6, fromIndex: 8, toIndex: 5 });
        }
    });

    it('should return null for a known unsolvable board', () => {
        // This configuration is unsolvable for an 8-puzzle if the blank is considered part of the permutation.
        // The standard check involves counting inversions.
        // If goal is 1,2,3,4,5,6,7,8,0 (blank last), this state has an odd number of inversions
        // if blank is considered to be in its final row.
        // Goal (0 last): 1 2 3 4 5 6 7 8 (0) -> 0 inversions (even)
        // State: 8 1 2 0 4 3 7 6 5
        // Inversions for (8 1 2 4 3 7 6 5):
        // 8: (1,2,4,3,7,6,5) -> 7
        // 1: () -> 0
        // 2: () -> 0
        // 4: (3) -> 1
        // 3: () -> 0
        // 7: (6,5) -> 2
        // 6: (5) -> 1
        // 5: () -> 0
        // Total = 7+1+2+1 = 11 (odd)
        // If grid width is odd (3), unsolvable if inversions are odd (assuming blank is on an even row from bottom, 0-indexed).
        // Blank is at index 3 (row 1). Row 1 is an even row from bottom (0, 1, 2).
        // So odd inversions + blank on even row from bottom (0-indexed) -> unsolvable.
        const unsolvableState: BoardState = [8, 1, 2, 0, 4, 3, 7, 6, 5];
        const path = performAStarSearch(unsolvableState, POS_ADJACENCY);
        expect(path).toBeNull(); // A* should exhaust options and find no solution
    });
});
