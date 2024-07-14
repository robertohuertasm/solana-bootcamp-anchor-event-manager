import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { EventManager } from '../target/types/event_manager';
import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import { createMint } from './utils/mint';
import { expect } from 'chai';

describe('event-manager', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();

  console.log('Provider:', provider.wallet.publicKey.toBase58());

  const program = anchor.workspace.EventManager as Program<EventManager>;

  let acceptedMint: PublicKey;

  // PDAs for the event
  let event: PublicKey;
  let eventMint: PublicKey;
  let treasuryVault: PublicKey;
  let profitsVault: PublicKey;

  before(async () => {
    // initialize the accepted mint
    acceptedMint = await createMint(provider);

    // initialize the PDAs
    event = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('event', 'utf-8')], // seed
      program.programId,
    )[0];

    eventMint = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('event_mint', 'utf-8')], // seed
      program.programId,
    )[0];

    treasuryVault = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('treasury_vault', 'utf-8')], // seed
      program.programId,
    )[0];

    profitsVault = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('profits_vault', 'utf-8')], // seed
      program.programId,
    )[0];
  });

  it('creates a new event', async () => {
    const eventName = 'Event Name';
    const ticketPrice = new BN(1);

    const tx = await program.methods
      .createEvent(eventName, ticketPrice)
      .accountsPartial({
        acceptedMint,
        authority: provider.wallet.publicKey,
        event,
        eventMint,
        treasuryVault,
        profitsVault,
      })
      .rpc();

    console.log('Transaction:', tx);

    const eventAccount = await program.account.event.fetch(event);
    console.log('Event info:', eventAccount);
  });
});
