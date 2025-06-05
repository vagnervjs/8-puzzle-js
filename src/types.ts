/**
 * Defines the mapping of a square's number (1-indexed) to an array of
 * its adjacent square numbers. Used to determine valid moves.
 * Example: `1: [2, 4]` means square 1 is adjacent to squares 2 and 4.
 */
export interface PosMap {
  [key: number]: number[];
}

/**
 * Represents an action taken by the A* solver or a player, typically moving a tile.
 */
export interface SearchNodeAction {
  /** The numerical value of the tile that was moved. */
  tileValue: number;
  /** The 0-based index in the `BoardState` array where the tile was originally located. */
  fromIndex: number;
  /** The 0-based index in the `BoardState` array where the tile moved to (which was the empty spot). */
  toIndex: number;
}

/**
 * Represents a node within the A* search algorithm's state space.
 * Each node corresponds to a particular configuration of the puzzle.
 */
export interface SearchNode {
  /** The current configuration of the puzzle board for this node. */
  state: BoardState;
  /** The parent node from which this node was reached; `null` for the start node. */
  parent: SearchNode | null;
  /** The action (move) taken from the parent to reach this node's state; `null` for the start node. */
  action: SearchNodeAction | null;
  /** The cost from the start node to reach this node (effectively the depth of the node). */
  g: number;
  /** The heuristic estimate (e.g., Manhattan distance) of the cost from this node to the goal state. */
  h: number;
  /** The total estimated cost of the solution path through this node (f = g + h). */
  f: number;
}

/**
 * Represents the state of the puzzle board as a 1D array of numbers.
 * Each number corresponds to a tile value, or `0` to represent the empty square.
 * `null` can be used to indicate an error or an uninitialized state for a square,
 * though typically the board should always contain numbers (0-8 for an 8-puzzle).
 * The array is 0-indexed, corresponding to square positions (e.g., index 0 is square 1).
 */
export type BoardState = (number | null)[];
