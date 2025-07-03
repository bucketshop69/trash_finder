use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Constants
const MIN_WAGER: u64 = 1000; // 0.001 tokens
const MAX_WAGER: u64 = 1000000; // 1 token

#[program]
pub mod gorbagana_game {
    use super::*;

    // TODO: Implement initialize_wager
    pub fn initialize_wager(ctx: Context<InitializeWager>, wager_amount: u64) -> Result<()> {
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
    pub fn join_wager(ctx: Context<JoinWager>) -> Result<()> {
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
    pub fn claim_wager(ctx: Context<ClaimWager>) -> Result<()> {
        let game_wager = &mut ctx.accounts.game_wager;
        require!(game_wager.is_claimed == false, GameError::AlreadyClaimed);

        // TODO: Add server authority check

        game_wager.is_claimed = true;

        Ok(())
    }

    // TODO: Implement cancel_wager
    pub fn cancel_wager(ctx: Context<CancelWager>) -> Result<()> {
        let game_wager = &ctx.accounts.game_wager;

        // TODO: Add server authority check

        let amount = game_wager.wager_amount;

        let player_one_info = ctx.accounts.player_one.to_account_info();
        let player_two_info = ctx.accounts.player_two.to_account_info();
        let wager_info = game_wager.to_account_info();

        **wager_info.try_borrow_mut_lamports()? -= amount * 2;
        **player_one_info.try_borrow_mut_lamports()? += amount;
        **player_two_info.try_borrow_mut_lamports()? += amount;

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
#[instruction(wager_amount: u64)]
pub struct InitializeWager<'info> {
    #[account(mut)]
    pub player_one: Signer<'info>,

    #[account(
        init,
        payer = player_one,
        space = 8 + 32 + 32 + 8 + 8 + 1 + 1, // Discriminator + Pubkey*2 + u64*2 + bool + u8
        seeds = [b"wager", player_one.key().as_ref()],
        bump
    )]
    pub game_wager: Account<'info, GameWager>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinWager<'info> {
    #[account(mut)]
    pub player_two: Signer<'info>,

    #[account(
        mut,
        seeds = [b"wager", game_wager.player_one.as_ref()],
        bump = game_wager.bump
    )]
    pub game_wager: Account<'info, GameWager>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimWager<'info> {
    #[account(mut)]
    pub server: Signer<'info>,

    #[account(
        mut,
        seeds = [b"wager", game_wager.player_one.as_ref()],
        bump = game_wager.bump,
        close = winner
    )]
    pub game_wager: Account<'info, GameWager>,

    #[account(mut)]
    pub winner: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelWager<'info> {
    #[account(mut)]
    pub server: Signer<'info>,

    #[account(
        mut,
        seeds = [b"wager", game_wager.player_one.as_ref()],
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
