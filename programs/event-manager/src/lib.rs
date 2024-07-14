mod collections;
mod instructions;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("7pyxedPb29GisxwnJhGNWoeNXUcU9JL1VQFHuHjiHAUS");

#[program]
pub mod event_manager {

    use super::*;

    pub fn create_event(ctx: Context<CreateEvent>, name: String, ticket_price: u64) -> Result<()> {
        instructions::create_event(ctx, name, ticket_price)
    }

    pub fn sponsor(ctx: Context<Sponsor>, quantity: u64) -> Result<()> {
        instructions::sponsor(ctx, quantity)
    }
}
