use crate::event::{Event, SEED_EVENT, SEED_EVENT_MINT, SEED_TREASURY_VAULT};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, transfer, Mint, MintTo, Token, TokenAccount, Transfer},
};

#[derive(Accounts)]
pub struct SponsorEvent<'info> {
    /// PDA for the event
    #[account(mut,seeds = [SEED_EVENT.as_bytes(), event.authority.key().as_ref()],  bump = event.event_bump)]
    pub event: Box<Account<'info, Event>>,

    /// PDA for the event mint
    #[account(mut, seeds = [SEED_EVENT_MINT.as_bytes(), event.key().as_ref()], bump = event.event_mint_bump)]
    pub event_mint: Box<Account<'info, Mint>>,

    /// PDA for the treasury vault
    #[account(mut, seeds = [SEED_TREASURY_VAULT.as_bytes(), event.key().as_ref()], bump = event.treasury_vault_bump)]
    pub treasury_vault: Box<Account<'info, TokenAccount>>,

    /// Payer's accepted mint ATA (associated token account)
    #[account(mut,constraint = payer_accepted_mint_ata.mint == event.accepted_mint,constraint = payer_accepted_mint_ata.amount > 0)]
    pub payer_accepted_mint_ata: Box<Account<'info, TokenAccount>>,

    /// Payer's event mint ATA (associated token account)
    #[account(init_if_needed, payer = authority, associated_token::mint = event_mint,  associated_token::authority = authority)]
    pub payer_event_mint_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,

    // programs
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn sponsor_event(ctx: Context<SponsorEvent>, quantity: u64) -> Result<()> {
    // Transfer the token from the payer's accepted mint ATA to the treasury vault
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payer_accepted_mint_ata.to_account_info(),
                to: ctx.accounts.treasury_vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        quantity,
    )?;

    // Transfer the token to the payer's event mint ATA
    // we need to use the seeds of the event PDA to sign the transaction
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.event_mint.to_account_info(),
                to: ctx.accounts.payer_event_mint_ata.to_account_info(),
                authority: ctx.accounts.event.to_account_info(),
            },
            &[&[
                SEED_EVENT.as_bytes(),
                ctx.accounts.event.authority.as_ref(),
                &[ctx.accounts.event.event_bump],
            ]],
        ),
        quantity,
    )?;

    // increase the quantity of tokens that the sponsors have been exchanging
    ctx.accounts.event.sponsors += quantity;

    Ok(())
}
