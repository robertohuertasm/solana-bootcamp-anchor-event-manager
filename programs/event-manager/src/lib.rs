use anchor_lang::prelude::*;

declare_id!("7pyxedPb29GisxwnJhGNWoeNXUcU9JL1VQFHuHjiHAUS");

#[program]
pub mod event_manager {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
