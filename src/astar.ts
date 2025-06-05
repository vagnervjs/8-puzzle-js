import type { BoardState, SearchNode, SearchNodeAction, PosMap } from './types';
import { GOAL_STATE, NUM_SQUARES, getSquareNumberFromIndex, getIndexFromSquareNumber } from './puzzleLogic';

/**
 * Calculates the Manhattan distance heuristic for a given board state.
 * The Manhattan distance is the sum of the distances of each tile
 * from its goal position.
 * @param boardState The current configuration of the puzzle board.
 * @param goalState The target configuration of the puzzle board (usually {@link GOAL_STATE}).
 * @param numSquares The total number of squares in the puzzle (e.g., 9 for an 8-puzzle).
 * @returns The total Manhattan distance for the given board state.
 */
export function getManhattanDistance(
  boardState: BoardState,
  goalState: BoardState,
  numSquares: number
): number {
  let totalDistance: number = 0;
  const dimension: number = Math.sqrt(numSquares);

  if (dimension !== Math.floor(dimension)) {
    console.error("numSquares must be a perfect square for Manhattan distance calculation.");
    return Infinity; // Or throw error
  }

  for (let i = 0; i < boardState.length; i++) {
    const tileValue: number | null = boardState[i];
    // Only calculate distance for actual tiles, not the empty space (0) or nulls
    if (tileValue !== 0 && tileValue !== null) {
      const currentRow: number = Math.floor(i / dimension);
      const currentCol: number = i % dimension;

      const targetIndex: number = goalState.indexOf(tileValue);
      if (targetIndex === -1) {
        // This case should ideally not happen if boardState and goalState are valid
        console.warn(`Tile value ${tileValue} not found in goal state during Manhattan calculation.`);
        continue;
      }
      const targetRow: number = Math.floor(targetIndex / dimension);
      const targetCol: number = targetIndex % dimension;

      totalDistance += Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
    }
  }
  return totalDistance;
}

/**
 * Internal helper function to create {@link SearchNode} objects for the A* algorithm.
 * @param state The board state for this node.
 * @param parent The parent node in the search tree, or `null` for the start node.
 * @param action The action taken to reach this state from the parent, or `null` for the start node.
 * @param g The cost from the start node to this node (depth).
 * @param h The heuristic estimate (Manhattan distance) from this node to the goal.
 * @returns A new {@link SearchNode} object.
 */
function _createSearchNode(
  state: BoardState,
  parent: SearchNode | null,
  action: SearchNodeAction | null,
  g: number,
  h: number
): SearchNode {
  return { state, parent, action, g, h, f: g + h };
}

/**
 * Internal helper function to compare two board state arrays for equality.
 * @param arr1 The first board state array.
 * @param arr2 The second board state array.
 * @returns `true` if the arrays are identical, `false` otherwise.
 */
function areArraysEqual(arr1: BoardState, arr2: BoardState): boolean {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}

/**
 * Internal helper function to reconstruct the path of actions from the start node to the goal node.
 * It traverses backwards from the goal node using parent references.
 * @param node The goal {@link SearchNode} from which to reconstruct the path.
 * @returns An array of {@link SearchNodeAction} objects representing the sequence of moves.
 */
function reconstructPath(node: SearchNode): SearchNodeAction[] {
  const path: SearchNodeAction[] = [];
  let currentNode: SearchNode | null = node;
  while (currentNode && currentNode.parent) { // Ensure currentNode and its parent are not null
    if (currentNode.action) { // Ensure action is not null
      path.unshift(currentNode.action);
    }
    currentNode = currentNode.parent;
  }
  return path;
}

/**
 * Performs an A* search to find the optimal sequence of moves to solve the puzzle.
 * @param initialState The starting configuration of the puzzle board ({@link BoardState}).
 * @param adjacencyMap A {@link PosMap} defining the adjacency of squares, used to generate valid moves.
 * @returns An array of {@link SearchNodeAction} objects representing the solution path.
 *          Returns an empty array if the `initialState` is already the {@link GOAL_STATE}.
 *          Returns `null` if no solution path is found.
 */
export function performAStarSearch(
  initialState: BoardState,
  adjacencyMap: PosMap
): SearchNodeAction[] | null {
  if (areArraysEqual(initialState, GOAL_STATE)) {
    return []; // Already solved
  }

  const startNode: SearchNode = _createSearchNode(
    initialState,
    null,
    null,
    0,
    getManhattanDistance(initialState, GOAL_STATE, NUM_SQUARES)
  );

  // The openSet stores nodes to be evaluated, prioritized by their f-score.
  const openSet: SearchNode[] = [startNode];
  // The closedSet stores states that have already been evaluated, to prevent cycles and redundant work.
  // States are stored as strings for efficient Set lookups.
  const closedSet: Set<string> = new Set();
  closedSet.add(initialState.toString());

  while (openSet.length > 0) {
    // Simple array sort acts as a basic priority queue (less efficient for large sets).
    openSet.sort((a, b) => a.f - b.f);
    const currentNode: SearchNode | undefined = openSet.shift(); // Get node with the lowest f-score

    if (!currentNode) {
      // This should not be reached if openSet.length > 0, but it satisfies TypeScript's strict null checks.
      return null;
    }

    // Goal check
    if (areArraysEqual(currentNode.state, GOAL_STATE)) {
      return reconstructPath(currentNode);
    }

    // Find the empty square (tile '0') to generate successor states
    const emptyIdx: number = currentNode.state.indexOf(0);
    if (emptyIdx === -1) {
      console.error("A* Search Error: No empty square (0) found in the current state:", currentNode.state);
      return null; // Invalid state, should not occur
    }

    const emptySquareNumber: number = getSquareNumberFromIndex(emptyIdx); // 1-indexed for adjacencyMap
    const movablePieceSquareNumbers: number[] | undefined = adjacencyMap[emptySquareNumber];

    if (!movablePieceSquareNumbers) {
      console.error(`A* Search Error: No adjacency information found for square number ${emptySquareNumber}.`);
      continue; // Skip this node if adjacency info is missing
    }

    for (const movablePieceSquareNum of movablePieceSquareNumbers) {
      const pieceToMoveIndex: number = getIndexFromSquareNumber(movablePieceSquareNum); // 0-indexed for board state

      const tileValueMoved: number | null = currentNode.state[pieceToMoveIndex];
      if (tileValueMoved === null) {
        // This should not happen in a valid board state where only 0 is potentially "empty"
        console.warn(`A* Search Warning: Attempted to move a null tile from index ${pieceToMoveIndex}.`);
        continue;
      }

      // Create a new board state by applying the move
      const neighborState: BoardState = [...currentNode.state];
      neighborState[emptyIdx] = tileValueMoved;       // Move tile to the empty spot
      neighborState[pieceToMoveIndex] = 0;            // Old spot of the tile becomes empty

      const neighborStateStr: string = neighborState.toString();
      if (closedSet.has(neighborStateStr)) {
        continue; // Already evaluated this state
      }

      const gScore: number = currentNode.g + 1; // Cost to reach this neighbor
      const hScore: number = getManhattanDistance(neighborState, GOAL_STATE, NUM_SQUARES);
      const fScore: number = gScore + hScore;

      // Check if a node with this state is already in the openSet with a lower f-score
      let existingNodeInOpenSetIndex: number = -1;
      for (let i = 0; i < openSet.length; i++) {
          const openNode = openSet[i]; // Type guard for openSet[i]
          if (openNode && areArraysEqual(openNode.state, neighborState)) {
              existingNodeInOpenSetIndex = i;
              break;
          }
      }

      if (existingNodeInOpenSetIndex !== -1) {
          const existingNode = openSet[existingNodeInOpenSetIndex]; // Type guard
          if (existingNode && existingNode.f <= fScore) {
              continue; // Found existing node with better or equal f-score
          } else {
              // This path is better; remove the old node from openSet
              openSet.splice(existingNodeInOpenSetIndex, 1);
          }
      }

      const action: SearchNodeAction = {
        tileValue: tileValueMoved,
        fromIndex: pieceToMoveIndex,
        toIndex: emptyIdx
      };
      const neighborNode: SearchNode = _createSearchNode(neighborState, currentNode, action, gScore, hScore);

      openSet.push(neighborNode);
      closedSet.add(neighborStateStr); // Add to closedSet when it's scheduled for evaluation
    }
  }
  return null; // No solution found
}
