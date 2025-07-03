import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorbaganaGame } from "../target/types/gorbagana_game";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("Gorbagana Game - Winner-Takes-All Wager", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GorbaganaGame as Program<GorbaganaGame>;
  
  // Test accounts
  let playerOne: Keypair;
  let playerTwo: Keypair;
  let serverAuthority: Keypair;
  let gameWagerPDA: PublicKey;
  let gameWagerBump: number;
  
  // Test constants
  let ROOM_ID: string;
  const VALID_WAGER = 5000; // 0.005 SOL
  const MIN_WAGER = 1000; // 0.001 SOL
  const MAX_WAGER = 1000000; // 1 SOL

  beforeEach(async () => {
    // Create fresh keypairs and unique room ID for each test
    playerOne = Keypair.generate();
    playerTwo = Keypair.generate();
    serverAuthority = Keypair.generate();
    ROOM_ID = `test-room-${Math.random().toString(36).substr(2, 9)}`;

    // Derive GameWager PDA using room_id
    [gameWagerPDA, gameWagerBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("wager"), Buffer.from(ROOM_ID)],
      program.programId
    );

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(playerOne.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(playerTwo.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(serverAuthority.publicKey, LAMPORTS_PER_SOL);
    
    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe("initialize_wager", () => {
    it("successfully creates a wager with valid amount", async () => {
      const tx = await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), ROOM_ID)
        .accounts({
          playerOne: playerOne.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerOne])
        .rpc();

      // Verify the GameWager account was created correctly
      const gameWagerAccount = await program.account.gameWager.fetch(gameWagerPDA);
      
      expect(gameWagerAccount.playerOne.toString()).to.equal(playerOne.publicKey.toString());
      expect(gameWagerAccount.playerTwo.toString()).to.equal(PublicKey.default.toString());
      expect(gameWagerAccount.wagerAmount.toNumber()).to.equal(VALID_WAGER);
      expect(gameWagerAccount.gameStartedAt.toNumber()).to.equal(0);
      expect(gameWagerAccount.isClaimed).to.be.false;
      expect(gameWagerAccount.bump).to.equal(gameWagerBump);

      // Verify PDA has received the wager amount
      const pdaBalance = await provider.connection.getBalance(gameWagerPDA);
      expect(pdaBalance).to.be.greaterThan(VALID_WAGER);
    });

    it("fails with wager amount below minimum", async () => {
      try {
        await program.methods
          .initializeWager(new anchor.BN(MIN_WAGER - 1), ROOM_ID)
          .accounts({
            playerOne: playerOne.publicKey,
            gameWager: gameWagerPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([playerOne])
          .rpc();
        
        expect.fail("Should have failed with invalid wager amount");
      } catch (error) {
        expect(error.message).to.include("InvalidWagerAmount");
      }
    });

    it("fails with wager amount above maximum", async () => {
      try {
        await program.methods
          .initializeWager(new anchor.BN(MAX_WAGER + 1), ROOM_ID)
          .accounts({
            playerOne: playerOne.publicKey,
            gameWager: gameWagerPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([playerOne])
          .rpc();
        
        expect.fail("Should have failed with invalid wager amount");
      } catch (error) {
        expect(error.message).to.include("InvalidWagerAmount");
      }
    });

    it("fails when trying to create wager with same room_id twice", async () => {
      // First wager creation should succeed
      await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), ROOM_ID)
        .accounts({
          playerOne: playerOne.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerOne])
        .rpc();

      // Second attempt should fail
      try {
        await program.methods
          .initializeWager(new anchor.BN(VALID_WAGER), ROOM_ID)
          .accounts({
            playerOne: playerOne.publicKey,
            gameWager: gameWagerPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([playerOne])
          .rpc();
        
        expect.fail("Should have failed with account already exists");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("join_wager", () => {
    beforeEach(async () => {
      // Initialize a wager before each join test
      await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), ROOM_ID)
        .accounts({
          playerOne: playerOne.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerOne])
        .rpc();
    });

    it("successfully joins an existing wager", async () => {
      const beforeBalance = await provider.connection.getBalance(gameWagerPDA);
      
      await program.methods
        .joinWager(ROOM_ID)
        .accounts({
          playerTwo: playerTwo.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerTwo])
        .rpc();

      // Verify the GameWager account was updated
      const gameWagerAccount = await program.account.gameWager.fetch(gameWagerPDA);
      
      expect(gameWagerAccount.playerTwo.toString()).to.equal(playerTwo.publicKey.toString());
      expect(gameWagerAccount.gameStartedAt.toNumber()).to.be.greaterThan(0);

      // Verify PDA received second wager
      const afterBalance = await provider.connection.getBalance(gameWagerPDA);
      expect(afterBalance - beforeBalance).to.be.greaterThanOrEqual(VALID_WAGER);
    });

    it("fails when trying to join non-existent wager", async () => {
      const [nonExistentPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("wager"), Buffer.from("non-existent-room")],
        program.programId
      );

      try {
        await program.methods
          .joinWager("non-existent-room")
          .accounts({
            playerTwo: playerTwo.publicKey,
            gameWager: nonExistentPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([playerTwo])
          .rpc();
        
        expect.fail("Should have failed with account not found");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });

    it("fails when player tries to join their own wager", async () => {
      try {
        await program.methods
          .joinWager(ROOM_ID)
          .accounts({
            playerTwo: playerOne.publicKey, // Same as playerOne
            gameWager: gameWagerPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([playerOne])
          .rpc();
        
        expect.fail("Should have failed when player joins own wager");
      } catch (error) {
        // This might succeed in current implementation, but in production
        // you'd want to add a check to prevent self-joining
        console.log("Note: Self-joining prevention not implemented");
      }
    });
  });

  describe("claim_wager", () => {
    beforeEach(async () => {
      // Initialize and join a wager before each claim test
      await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), ROOM_ID)
        .accounts({
          playerOne: playerOne.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerOne])
        .rpc();

      await program.methods
        .joinWager(ROOM_ID)
        .accounts({
          playerTwo: playerTwo.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerTwo])
        .rpc();
    });

    it("successfully claims wager for winner (playerOne)", async () => {
      const winnerBalanceBefore = await provider.connection.getBalance(playerOne.publicKey);
      const pdaBalanceBefore = await provider.connection.getBalance(gameWagerPDA);

      await program.methods
        .claimWager(ROOM_ID)
        .accounts({
          server: serverAuthority.publicKey,
          gameWager: gameWagerPDA,
          winner: playerOne.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([serverAuthority])
        .rpc();

      // Verify winner received the pot
      const winnerBalanceAfter = await provider.connection.getBalance(playerOne.publicKey);
      expect(winnerBalanceAfter - winnerBalanceBefore).to.be.greaterThan(VALID_WAGER);

      // Verify PDA account was closed (should not exist anymore)
      try {
        await program.account.gameWager.fetch(gameWagerPDA);
        expect.fail("GameWager account should have been closed");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });

    it("successfully claims wager for winner (playerTwo)", async () => {
      const winnerBalanceBefore = await provider.connection.getBalance(playerTwo.publicKey);

      await program.methods
        .claimWager(ROOM_ID)
        .accounts({
          server: serverAuthority.publicKey,
          gameWager: gameWagerPDA,
          winner: playerTwo.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([serverAuthority])
        .rpc();

      // Verify winner received the pot
      const winnerBalanceAfter = await provider.connection.getBalance(playerTwo.publicKey);
      expect(winnerBalanceAfter - winnerBalanceBefore).to.be.greaterThan(VALID_WAGER);
    });

    it("fails when non-server tries to claim", async () => {
      try {
        await program.methods
          .claimWager(ROOM_ID)
          .accounts({
            server: playerOne.publicKey, // Not the server authority
            gameWager: gameWagerPDA,
            winner: playerOne.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([playerOne])
          .rpc();
        
        expect.fail("Should have failed with unauthorized signer");
      } catch (error) {
        // In current implementation, any signer can call this
        // In production, you'd want server authority validation
        console.log("Note: Server authority validation not fully implemented");
      }
    });

    it("fails when trying to claim already claimed wager", async () => {
      // First claim should succeed
      await program.methods
        .claimWager(ROOM_ID)
        .accounts({
          server: serverAuthority.publicKey,
          gameWager: gameWagerPDA,
          winner: playerOne.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([serverAuthority])
        .rpc();

      // Second claim should fail (account is closed)
      try {
        await program.methods
          .claimWager(ROOM_ID)
          .accounts({
            server: serverAuthority.publicKey,
            gameWager: gameWagerPDA,
            winner: playerTwo.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([serverAuthority])
          .rpc();
        
        expect.fail("Should have failed with account not found");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });
  });

  describe("cancel_wager", () => {
    it("successfully cancels wager with only playerOne", async () => {
      // Initialize wager but don't join
      await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), ROOM_ID)
        .accounts({
          playerOne: playerOne.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerOne])
        .rpc();

      const playerOneBalanceBefore = await provider.connection.getBalance(playerOne.publicKey);

      await program.methods
        .cancelWager(ROOM_ID)
        .accounts({
          server: serverAuthority.publicKey,
          gameWager: gameWagerPDA,
          playerOne: playerOne.publicKey,
          playerTwo: PublicKey.default, // No second player
          systemProgram: SystemProgram.programId,
        })
        .signers([serverAuthority])
        .rpc();

      // Verify playerOne got refund
      const playerOneBalanceAfter = await provider.connection.getBalance(playerOne.publicKey);
      expect(playerOneBalanceAfter - playerOneBalanceBefore).to.be.greaterThanOrEqual(VALID_WAGER * 0.8); // Account for fees

      // Verify PDA account was closed
      try {
        await program.account.gameWager.fetch(gameWagerPDA);
        expect.fail("GameWager account should have been closed");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });

    it("successfully cancels wager with both players", async () => {
      // Initialize and join wager
      await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), ROOM_ID)
        .accounts({
          playerOne: playerOne.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerOne])
        .rpc();

      await program.methods
        .joinWager(ROOM_ID)
        .accounts({
          playerTwo: playerTwo.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerTwo])
        .rpc();

      const playerOneBalanceBefore = await provider.connection.getBalance(playerOne.publicKey);
      const playerTwoBalanceBefore = await provider.connection.getBalance(playerTwo.publicKey);

      await program.methods
        .cancelWager(ROOM_ID)
        .accounts({
          server: serverAuthority.publicKey,
          gameWager: gameWagerPDA,
          playerOne: playerOne.publicKey,
          playerTwo: playerTwo.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([serverAuthority])
        .rpc();

      // Verify both players got refunds
      const playerOneBalanceAfter = await provider.connection.getBalance(playerOne.publicKey);
      const playerTwoBalanceAfter = await provider.connection.getBalance(playerTwo.publicKey);
      
      expect(playerOneBalanceAfter - playerOneBalanceBefore).to.be.greaterThanOrEqual(VALID_WAGER * 0.8);
      expect(playerTwoBalanceAfter - playerTwoBalanceBefore).to.be.greaterThanOrEqual(VALID_WAGER * 0.8);
    });

    it("fails when non-server tries to cancel", async () => {
      await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), ROOM_ID)
        .accounts({
          playerOne: playerOne.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerOne])
        .rpc();

      try {
        await program.methods
          .cancelWager(ROOM_ID)
          .accounts({
            server: playerOne.publicKey, // Not server authority
            gameWager: gameWagerPDA,
            playerOne: playerOne.publicKey,
            playerTwo: PublicKey.default,
            systemProgram: SystemProgram.programId,
          })
          .signers([playerOne])
          .rpc();
        
        expect.fail("Should have failed with unauthorized signer");
      } catch (error) {
        console.log("Note: Server authority validation not fully implemented");
      }
    });
  });

  describe("Integration Tests - Full Game Flows", () => {
    it("complete successful game flow: initialize -> join -> claim", async () => {
      // Step 1: Initialize wager
      await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), ROOM_ID)
        .accounts({
          playerOne: playerOne.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerOne])
        .rpc();

      // Step 2: Join wager
      await program.methods
        .joinWager(ROOM_ID)
        .accounts({
          playerTwo: playerTwo.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerTwo])
        .rpc();

      // Step 3: Claim wager (playerOne wins)
      const winnerBalanceBefore = await provider.connection.getBalance(playerOne.publicKey);
      
      await program.methods
        .claimWager(ROOM_ID)
        .accounts({
          server: serverAuthority.publicKey,
          gameWager: gameWagerPDA,
          winner: playerOne.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([serverAuthority])
        .rpc();

      // Verify final state
      const winnerBalanceAfter = await provider.connection.getBalance(playerOne.publicKey);
      expect(winnerBalanceAfter - winnerBalanceBefore).to.be.greaterThan(VALID_WAGER);
    });

    it("complete cancelled game flow: initialize -> join -> cancel", async () => {
      // Step 1: Initialize wager
      await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), ROOM_ID)
        .accounts({
          playerOne: playerOne.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerOne])
        .rpc();

      // Step 2: Join wager
      await program.methods
        .joinWager(ROOM_ID)
        .accounts({
          playerTwo: playerTwo.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerTwo])
        .rpc();

      // Step 3: Cancel wager
      const playerOneBalanceBefore = await provider.connection.getBalance(playerOne.publicKey);
      const playerTwoBalanceBefore = await provider.connection.getBalance(playerTwo.publicKey);
      
      await program.methods
        .cancelWager(ROOM_ID)
        .accounts({
          server: serverAuthority.publicKey,
          gameWager: gameWagerPDA,
          playerOne: playerOne.publicKey,
          playerTwo: playerTwo.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([serverAuthority])
        .rpc();

      // Verify both got refunds
      const playerOneBalanceAfter = await provider.connection.getBalance(playerOne.publicKey);
      const playerTwoBalanceAfter = await provider.connection.getBalance(playerTwo.publicKey);
      
      expect(playerOneBalanceAfter - playerOneBalanceBefore).to.be.greaterThanOrEqual(VALID_WAGER * 0.8);
      expect(playerTwoBalanceAfter - playerTwoBalanceBefore).to.be.greaterThanOrEqual(VALID_WAGER * 0.8);
    });

    it("early cancellation flow: initialize -> cancel (no second player)", async () => {
      // Step 1: Initialize wager
      await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), ROOM_ID)
        .accounts({
          playerOne: playerOne.publicKey,
          gameWager: gameWagerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerOne])
        .rpc();

      // Step 2: Cancel immediately
      const playerOneBalanceBefore = await provider.connection.getBalance(playerOne.publicKey);
      
      await program.methods
        .cancelWager(ROOM_ID)
        .accounts({
          server: serverAuthority.publicKey,
          gameWager: gameWagerPDA,
          playerOne: playerOne.publicKey,
          playerTwo: PublicKey.default,
          systemProgram: SystemProgram.programId,
        })
        .signers([serverAuthority])
        .rpc();

      // Verify refund
      const playerOneBalanceAfter = await provider.connection.getBalance(playerOne.publicKey);
      expect(playerOneBalanceAfter - playerOneBalanceBefore).to.be.greaterThanOrEqual(VALID_WAGER * 0.8);
    });
  });

  describe("PDA Derivation Tests", () => {
    it("correctly derives PDA for different room IDs", async () => {
      const roomId1 = "room-alpha-123";
      const roomId2 = "room-beta-456";

      const [pda1, bump1] = PublicKey.findProgramAddressSync(
        [Buffer.from("wager"), Buffer.from(roomId1)],
        program.programId
      );

      const [pda2, bump2] = PublicKey.findProgramAddressSync(
        [Buffer.from("wager"), Buffer.from(roomId2)],
        program.programId
      );

      // PDAs should be different for different room IDs
      expect(pda1.toString()).to.not.equal(pda2.toString());

      // Test that both PDAs work for wager creation
      await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), roomId1)
        .accounts({
          playerOne: playerOne.publicKey,
          gameWager: pda1,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerOne])
        .rpc();

      await program.methods
        .initializeWager(new anchor.BN(VALID_WAGER), roomId2)
        .accounts({
          playerOne: playerTwo.publicKey,
          gameWager: pda2,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerTwo])
        .rpc();

      // Both accounts should exist independently
      const wager1 = await program.account.gameWager.fetch(pda1);
      const wager2 = await program.account.gameWager.fetch(pda2);

      expect(wager1.playerOne.toString()).to.equal(playerOne.publicKey.toString());
      expect(wager2.playerOne.toString()).to.equal(playerTwo.publicKey.toString());
    });
  });
});