import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { EventManager } from '../target/types/event_manager';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import {
  createAssociatedTokenAccount,
  createFundedWallet,
  createMint,
} from './utils';
import { expect } from 'chai';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

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

  // sponsor Alice
  let sponsorAlice: Keypair;
  let sponsorAliceAcceptedMintATA: PublicKey;
  let sponsorAliceEventMintATA: PublicKey;

  before(async () => {
    // initialize the accepted mint
    acceptedMint = await createMint(provider);

    // initialize the PDAs
    event = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('event', 'utf-8'), provider.wallet.publicKey.toBuffer()], // seed
      program.programId,
    )[0];

    eventMint = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('event_mint', 'utf-8'), event.toBuffer()], // seed
      program.programId,
    )[0];

    treasuryVault = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('treasury_vault', 'utf-8'), , event.toBuffer()], // seed
      program.programId,
    )[0];

    profitsVault = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('profits_vault', 'utf-8'), , event.toBuffer()], // seed
      program.programId,
    )[0];

    // sponsor Alice initialization
    sponsorAlice = await createFundedWallet(provider, 3);
    sponsorAliceAcceptedMintATA = await createAssociatedTokenAccount(
      provider,
      acceptedMint,
      10,
      sponsorAlice,
    );
    sponsorAliceEventMintATA = await getAssociatedTokenAddress(
      eventMint,
      sponsorAlice.publicKey,
    );
  });

  it('creates a new event', async () => {
    const eventName = 'Event Name';
    const ticketPrice = new BN(1);

    await program.methods
      .createEvent(eventName, ticketPrice)
      // .accounts({
      //   acceptedMint,
      //   authority: provider.wallet.publicKey,
      // })
      .accountsPartial({
        acceptedMint,
        authority: provider.wallet.publicKey,
        event,
        eventMint,
        treasuryVault,
        profitsVault,
      })
      .rpc();

    const eventAccount = await program.account.event.fetch(event);
    // console.log('Event info:', eventAccount);

    expect(eventAccount).to.not.be.undefined;
    expect(eventAccount.name).to.equal(eventName);
    expect(eventAccount.ticketPrice.eq(ticketPrice)).to.be.true;
  });

  it('Alice should get event tokens when sponsoring', async () => {
    let aliceUSDCAccount = await getAccount(
      provider.connection,
      sponsorAliceAcceptedMintATA,
    );
    expect(aliceUSDCAccount.amount).to.be.equal(BigInt(10));

    const quantity = new BN(5);

    await program.methods
      .sponsorEvent(quantity)
      .accountsPartial({
        payerAcceptedMintAta: sponsorAliceAcceptedMintATA,
        authority: sponsorAlice.publicKey,
        event,
        eventMint,
        payerEventMintAta: sponsorAliceEventMintATA,
        treasuryVault,
      })
      .signers([sponsorAlice])
      .rpc();

    const aliceEventAccount = await getAccount(
      provider.connection,
      sponsorAliceEventMintATA,
    );
    expect(aliceEventAccount.amount).to.be.equal(BigInt(5));

    aliceUSDCAccount = await getAccount(
      provider.connection,
      sponsorAliceAcceptedMintATA,
    );
    expect(aliceUSDCAccount.amount).to.be.equal(BigInt(5));
  });

  it('Alice should get some tickets when buying', async () => {
    let aliceUSDCAccount = await getAccount(
      provider.connection,
      sponsorAliceAcceptedMintATA,
    );
    expect(aliceUSDCAccount.amount).to.be.equal(BigInt(5));

    const quantity = new BN(5);

    await program.methods
      .buyTickets(quantity)
      .accountsPartial({
        payerAcceptedMintAta: sponsorAliceAcceptedMintATA,
        authority: sponsorAlice.publicKey,
        event,
        profitsVault,
      })
      .signers([sponsorAlice])
      .rpc();

    const profits_vault = await getAccount(provider.connection, profitsVault);
    expect(profits_vault.amount).to.be.equal(BigInt(5));

    aliceUSDCAccount = await getAccount(
      provider.connection,
      sponsorAliceAcceptedMintATA,
    );
    expect(aliceUSDCAccount.amount).to.be.equal(BigInt(0));

    const aliceEventAccount = await getAccount(
      provider.connection,
      sponsorAliceEventMintATA,
    );
    expect(aliceEventAccount.amount).to.be.equal(BigInt(5));
  });
});
