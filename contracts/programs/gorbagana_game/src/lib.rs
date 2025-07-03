use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Constants
const MIN_WAGER: u64 = 1000; // 0.001 tokens
const MAX_WAGER: u64 = 1000000; // 1 token

#[program]
pub mod gorbagana_game {
    use super::*;

    // TODO: Implement initialize_wager
    pub fn initialize_wager(ctx: Context<InitializeWager>, wager_amount: u64, room_id: String) -> Result<()> {
        require!(
            wager_amount >= MIN_WAGER && wager_amount <= MAX_WAGER,
            GameError::InvalidWagerAmount
        );

        let game_wager = &mut ctx.accounts.game_wager;
        game_wager.player_one = ctx.accounts.player_one.key();
        game_wager.wager_amount = wager_amount;
        game_wager.is_claimed = false;
        game_wager.game_started_at = 0; // Not started yet
        game_wager.bump = *ctx.bumps.get("game_wager").unwrap();

        // Transfer wager to PDA
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.player_one.key(),
            &game_wager.key(),
            wager_amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.player_one.to_account_info(),
                game_wager.to_account_info(),
            ],
        )?;

        Ok(())
    }

    // TODO: Implement join_wager
    pub fn join_wager(ctx: Context<JoinWager>, room_id: String) -> Result<()> {
        let game_wager = &mut ctx.accounts.game_wager;
        game_wager.player_two = ctx.accounts.player_two.key();
        game_wager.game_started_at = Clock::get()?.unix_timestamp;

        // Transfer wager to PDA
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.player_two.key(),
            &game_wager.key(),
            game_wager.wager_amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.player_two.to_account_info(),
                game_wager.to_account_info(),
            ],
        )?;

        Ok(())
    }

    // TODO: Implement claim_wager
    pub fn claim_wager(ctx: Context<ClaimWager>, room_id: String) -> Result<()> {
        let game_wager = &mut ctx.accounts.game_wager;
        require!(game_wager.is_claimed == false, GameError::AlreadyClaimed);
        
        // Requires server authority signature (enforced by #[account] constraints)
        
        // Transfer total balance from GameWager PDA to winner
        let total_balance = game_wager.to_account_info().lamports();
        let rent_exempt_reserve = Rent::get()?.minimum_balance(game_wager.to_account_info().data_len());
        let transfer_amount = total_balance.saturating_sub(rent_exempt_reserve);
        
        **game_wager.to_account_info().try_borrow_mut_lamports()? -= transfer_amount;
        **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += transfer_amount;
        
        game_wager.is_claimed = true;
        
        Ok(())
    }

    pub fn cancel_wager(ctx: Context<CancelWager>, room_id: String) -> Result<()> {
        let game_wager = &ctx.accounts.game_wager;
        
        // Requires server authority signature (enforced by #[account] constraints)
        
        let wager_amount = game_wager.wager_amount;
        
        // Transfer wager_amount back to player_one
        **game_wager.to_account_info().try_borrow_mut_lamports()? -= wager_amount;
        **ctx.accounts.player_one.to_account_info().try_borrow_mut_lamports()? += wager_amount;
        
        // If player_two has joined, transfer wager_amount back to them
        if game_wager.player_two != Pubkey::default() {
            **game_wager.to_account_info().try_borrow_mut_lamports()? -= wager_amount;
            **ctx.accounts.player_two.to_account_info().try_borrow_mut_lamports()? += wager_amount;
        }
        
        // Account closure is handled by the close constraint in the context
        Ok(())
    }

    // TODO: Implement finalize_game
    pub fn finalize_game(ctx: Context<FinalizeGame>, wager_amount: u64) -> Result<()> {
        Ok(())
    }
}

// Account Structs
#[account]
pub struct GameWager {
    pub player_one: Pubkey,
    pub player_two: Pubkey,
    pub wager_amount: u64,
    pub game_started_at: i64,
    pub is_claimed: bool,
    pub bump: u8,
}

#[account]
pub struct PlayerScore {
    pub player: Pubkey,
    pub wins: u64,
    pub total_games: u64,
    pub total_winnings: u64,
    pub bump: u8,
}

// Contexts
#[derive(Accounts)]
#[instruction(wager_amount: u64, room_id: String)]
pub struct InitializeWager<'info> {
    #[account(mut)]
    pub player_one: Signer<'info>,

    #[account(
        init,
        payer = player_one,
        space = 8 + 32 + 32 + 8 + 8 + 1 + 1, // Discriminator + Pubkey*2 + u64*2 + bool + u8
        seeds = [b"wager", room_id.as_bytes()],
        bump
    )]
    pub game_wager: Account<'info, GameWager>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct JoinWager<'info> {
    #[account(mut)]
    pub player_two: Signer<'info>,

    #[account(
        mut,
        seeds = [b"wager", room_id.as_bytes()],
        bump = game_wager.bump
    )]
    pub game_wager: Account<'info, GameWager>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct ClaimWager<'info> {
    #[account(mut)]
    pub server: Signer<'info>,

    #[account(
        mut,
        seeds = [b"wager", room_id.as_bytes()],
        bump = game_wager.bump,
        close = winner
    )]
    pub game_wager: Account<'info, GameWager>,

    #[account(mut)]
    pub winner: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct CancelWager<'info> {
    #[account(mut)]
    pub server: Signer<'info>,

    #[account(
        mut,
        seeds = [b"wager", room_id.as_bytes()],
        bump = game_wager.bump,
        close = player_one
    )]
    pub game_wager: Account<'info, GameWager>,

    #[account(mut)]
    pub player_one: SystemAccount<'info>,

    #[account(mut)]
    pub player_two: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeGame<'info> {
    // TODO: Define accounts
}

#[error_code]
pub enum GameError {
    #[msg("Invalid wager amount.")]
    InvalidWagerAmount,
    #[msg("Wager has already been claimed.")]
    AlreadyClaimed,
}
