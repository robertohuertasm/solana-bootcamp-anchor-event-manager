use crate::collections::event::{
    Event, SEED_EVENT, SEED_EVENT_MINT, SEED_PROFITS_VAULT, SEED_TREASURY_VAULT,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct CreateEvent<'info> {
    /// PDA for the event
    #[account(init, payer = authority, seeds = [SEED_EVENT.as_bytes(), authority.key().as_ref()],  bump, space = 8 + Event::INIT_SPACE)]
    pub event: Account<'info, Event>,

    /// PDA for the event mint
    #[account(init, payer = authority, seeds = [SEED_EVENT_MINT.as_bytes(), event.key().as_ref()],  bump, mint::decimals = 0, mint::authority = event)]
    pub event_mint: Account<'info, Mint>,

    /// PDA for the treasury vault
    #[account(init, payer = authority, seeds = [SEED_TREASURY_VAULT.as_bytes(), event.key().as_ref()],  bump, token::mint = accepted_mint, token::authority = event)]
    pub treasury_vault: Account<'info, TokenAccount>,

    /// PDA for the profits vault
    #[account(init, payer = authority, seeds = [SEED_PROFITS_VAULT.as_bytes(), event.key().as_ref()],  bump, token::mint = accepted_mint, token::authority = event)]
    pub profits_vault: Account<'info, TokenAccount>,

    /// The mint for the event's tickets
    pub accepted_mint: Account<'info, Mint>,

    /// CHECK: unsure about this being safe. Double check this.
    /// See https://www.anchor-lang.com/docs/the-accounts-struct#safety-checks
    #[account(mut)]
    pub authority: AccountInfo<'info>,

    pub rent: Sysvar<'info, Rent>,

    /// The system program
    pub system_program: Program<'info, System>,

    /// The token program
    pub token_program: Program<'info, Token>,
}

pub fn create_event(ctx: Context<CreateEvent>, name: String, ticket_price: u64) -> Result<()> {
    let event = &mut ctx.accounts.event;

    event.name = name;
    event.ticket_price = ticket_price;
    event.is_active = true;

    event.authority = ctx.accounts.authority.key();
    event.accepted_mint = ctx.accounts.accepted_mint.key();

    event.event_bump = ctx.bumps.event;
    event.event_mint_bump = ctx.bumps.event_mint;
    event.treasury_vault_bump = ctx.bumps.treasury_vault;
    event.profits_vault_bump = ctx.bumps.profits_vault;

    Ok(())
}
