mod event;
mod instructions;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("6ojpS5Bg4mEHdeYyJcSutjchTqZrCVhUG2d6nWnxrZrE");

#[program]
pub mod event_manager {

    use super::*;

    pub fn create_event(ctx: Context<CreateEvent>, name: String, ticket_price: u64) -> Result<()> {
        instructions::create_event(ctx, name, ticket_price)
    }

    pub fn sponsor_event(ctx: Context<SponsorEvent>, quantity: u64) -> Result<()> {
        instructions::sponsor_event(ctx, quantity)
    }
}
