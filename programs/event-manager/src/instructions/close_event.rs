use crate::event::{Event, SEED_EVENT};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CloseEvent<'info> {
    /// PDA for the event
    #[account(mut,seeds = [SEED_EVENT.as_bytes(), authority.key().as_ref()],  bump = event.event_bump)]
    pub event: Box<Account<'info, Event>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn close_event(ctx: Context<CloseEvent>) -> Result<()> {
    ctx.accounts.event.is_active = false;
    Ok(())
}
