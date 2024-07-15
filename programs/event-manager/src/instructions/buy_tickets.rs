use crate::event::{Event, SEED_EVENT, SEED_PROFITS_VAULT};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct BuyTickets<'info> {
    /// PDA for the event
    #[account(mut, seeds = [SEED_EVENT.as_bytes(), event.authority.key().as_ref()], bump = event.event_bump, constraint = event.is_active == true @ ErrorCode::EventClosed)]
    pub event: Box<Account<'info, Event>>,

    /// PDA for the profits vault
    #[account(mut, seeds = [SEED_PROFITS_VAULT.as_bytes(), event.key().as_ref()], bump = event.profits_vault_bump)]
    pub profits_vault: Box<Account<'info, TokenAccount>>,

    /// Payer's accepted mint ATA (associated token account)
    #[account(mut, constraint = payer_accepted_mint_ata.mint == event.accepted_mint, constraint = payer_accepted_mint_ata.amount > 0)]
    pub payer_accepted_mint_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_tickets(ctx: Context<BuyTickets>, quantity: u64) -> Result<()> {
    // calculate amount to charge (quantity * token_price)
    let amount = ctx
        .accounts
        .event
        .ticket_price
        .checked_mul(quantity)
        .ok_or(ErrorCode::PriceError)?;

    // Charge the amount
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payer_accepted_mint_ata.to_account_info(),
                to: ctx.accounts.profits_vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        amount,
    )
}

#[error_code]
pub enum ErrorCode {
    #[msg("You can't buy tickets, the Event is already closed")]
    EventClosed,
    #[msg("Something went wrong calculating the price of the tickets, please try again later.")]
    PriceError,
}
