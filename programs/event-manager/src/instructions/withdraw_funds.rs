use crate::event::{Event, SEED_EVENT, SEED_TREASURY_VAULT};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct WithdrawFunds<'info> {
    /// PDA for the event
    #[account(mut,seeds = [SEED_EVENT.as_bytes(), authority.key().as_ref()],  bump = event.event_bump)]
    pub event: Box<Account<'info, Event>>,

    pub accepted_mint: Box<Account<'info, Mint>>,

    /// Authority's accepted mint ATA (associated token account)
    #[account(init_if_needed, payer = authority, associated_token::mint = accepted_mint,        associated_token::authority = authority)]
    pub authority_accepted_mint_ata: Box<Account<'info, TokenAccount>>,

    /// PDA for the treasury vault
    #[account(mut, seeds = [SEED_TREASURY_VAULT.as_bytes(), event.key().as_ref()], bump = event.treasury_vault_bump, constraint = treasury_vault.amount >= amount)]
    pub treasury_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn withdraw_funds(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.treasury_vault.to_account_info(),
                to: ctx.accounts.authority_accepted_mint_ata.to_account_info(),
                authority: ctx.accounts.event.to_account_info(),
            },
            &[&[
                SEED_EVENT.as_bytes(),
                ctx.accounts.event.authority.as_ref(),
                &[ctx.accounts.event.event_bump],
            ]],
        ),
        amount, // amount to withdraw
    )
}
