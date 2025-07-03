# Gorbagana Game - Smart Contract Development Plan (v2)

This document outlines the micro-tasks required to implement the "Winner-Takes-All Wager" and "On-Chain Leaderboard" features, incorporating best practices for PDA usage and scalability.

---

## Feature 1: Winner-Takes-All Wager

This feature requires players to stake a small amount of Gorbagana testnet tokens to enter a game. The winner of the game receives the entire pot.

### 1.1. Smart Contract (Solana Program)

**Location:** `contracts/programs/gorbagana_game/src/lib.rs`

-   [ ] **Task 1: Define `GameWager` PDA and Constants.**
    -   Define `MIN_WAGER` and `MAX_WAGER` constants to ensure wagers are within a reasonable range.
    -   Create a `GameWager` account to store the state of a single game wager. This will be a PDA.
    -   **Seeds:** `[b"wager", room_id.as_bytes()]` (The `room_id` will be a unique string provided by the server).
    -   **Fields:**
        -   `player_one`: `Pubkey`
        -   `player_two`: `Pubkey`
        -   `wager_amount`: `u64`
        -   `game_started_at`: `i64` (Unix timestamp, set when player two joins)
        -   `is_claimed`: `bool`
        -   `bump`: `u8` (To store the canonical bump seed).

-   [ ] **Task 2: Implement `initialize_wager` Instruction.**
    -   **Purpose:** Called by the host player to create a new wager PDA.
    -   **Accounts:**
        -   `[signer]` The host player's wallet.
        -   `[writable]` The `GameWager` PDA.
        -   `system_program`.
    -   **Logic:**
        -   Creates the `GameWager` account using the derived PDA and bump seed.
        -   Transfers the `wager_amount` from the host's wallet to the `GameWager` PDA.
        -   Initializes the account fields.

-   [ ] **Task 3: Implement `join_wager` Instruction.**
    -   **Purpose:** Called by the second player to join an existing wager.
    -   **Accounts:**
        -   `[signer]` The joining player's wallet.
        -   `[writable]` The `GameWager` PDA.
        -   `system_program`.
    -   **Logic:**
        -   Transfers the `wager_amount` from the joiner's wallet to the `GameWager` PDA.
        -   Updates the `player_two` field.

-   [ ] **Task 4: Implement `claim_wager` Instruction.**
    -   **Purpose:** Called by the game server (as a trusted authority) to send the pot to the winner.
    -   **Accounts:**
        -   `[signer]` The server's authority wallet.
        -   `[writable]` The `GameWager` PDA.
        -   `[writable]` The winner's wallet account.
    -   **Logic:**
        -   Requires the signature of the server's authority key.
        -   Transfers the total balance from the `GameWager` PDA to the winner's account.
        -   Closes the `GameWager` account to reclaim rent.

-   [ ] **Task 5: Implement `cancel_wager` Instruction.**
    -   **Purpose:** Called by the server to refund players if the game is cancelled (e.g., due to disconnection).
    -   **Accounts:**
        -   `[signer]` The server's authority wallet.
        -   `[writable]` The `GameWager` PDA.
        -   `[writable]` Player One's wallet account.
        -   `[writable]` Player Two's wallet account.
    -   **Logic:**
        -   Requires the server's authority signature.
        -   Transfers the `wager_amount` back to `player_one`.
        -   If `player_two` has joined, transfers the `wager_amount` back to them.
        -   Closes the `GameWager` account to reclaim rent.

-   [ ] **Task 6: Write Unit Tests.**
    -   **Location:** `contracts/tests/`
    -   Test each instruction, including PDA derivation, transfers, and the new cancellation logic.

### 1.2. Server-Side Integration

-   [ ] **Task 1: Generate a unique `room_id`** for each game to be used as a seed for the PDA.
-   [ ] **Task 2: Pass the `room_id`** to the client when a room is created so it can derive the same PDA.
-   [ ] **Task 3: Update server logic** to call the new contract instructions (`initialize`, `join`, `claim`).

### 1.3. Client-Side Integration

-   [ ] **Task 1: Derive the `GameWager` PDA** on the client using the `room_id` provided by the server.
-   [ ] **Task 2: Construct transactions** using the derived PDA address.
-   [ ] **Task 3: Update UI** to reflect the on-chain wager status.

---

## Feature 2: On-Chain Leaderboard (Scalable)

This feature will store each player's win count in its own dedicated on-chain account for scalability.

### 2.1. Smart Contract (Solana Program)

-   [ ] **Task 1: Define `PlayerScore` PDA.**
    -   Create a `PlayerScore` account to store the stats for a single player.
    -   **Seeds:** `[b"player_score", player_pubkey.as_ref()]`
    -   **Fields:**
        -   `player`: `Pubkey`
        -   `wins`: `u64`
        -   `total_games`: `u64`
        -   `total_winnings`: `u64`
        -   `bump`: `u8`

-   [ ] **Task 2: Implement `finalize_game` Instruction.**
    -   **Purpose:** Called by the server to update stats for both players after a game concludes.
    -   **Accounts:**
        -   `[signer]` The server's authority wallet.
        -   `[writable]` The winner's `PlayerScore` PDA.
        -   `[writable]` The loser's `PlayerScore` PDA.
        -   `[writable]` The payer (server authority).
        -   `system_program`.
    -   **Logic:**
        -   Requires the server's authority signature.
        -   Takes `wager_amount` as an argument.
        -   **For the winner:** Creates their `PlayerScore` account if it doesn't exist, then increments `wins`, `total_games`, and `total_winnings`.
        -   **For the loser:** Creates their `PlayerScore` account if it doesn't exist, then increments `total_games`.

### 2.2. Server-Side Integration

-   [ ] **Task 1: Call `finalize_game`.**
    -   After a game ends, the server will call the `finalize_game` instruction with the winner's and loser's public keys and the wager amount.

### 2.3. Client-Side Integration

-   [ ] **Task 1: Create `Leaderboard.tsx` Component.**
    -   Create a new component to display the leaderboard.

-   [ ] **Task 2: Fetch Leaderboard Data.**
    -   The component will use the `getProgramAccounts` RPC method to fetch all accounts of the `PlayerScore` type.
    -   **Note:** For a hackathon scope, this is acceptable. For a production app with many users, an off-chain indexing service would be more performant.

-   [ ] **Task 3: Display Leaderboard.**
    -   Deserialize and sort the fetched `PlayerScore` accounts by the number of wins.
    -   Render a table showing the player's public key and their total wins.
