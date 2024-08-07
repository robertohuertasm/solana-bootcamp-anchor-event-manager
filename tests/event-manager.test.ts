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

  // authority's accepted mint ATA
  let authorityAcceptedMintAta: PublicKey;

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
      20,
      sponsorAlice,
    );
    sponsorAliceEventMintATA = await getAssociatedTokenAddress(
      eventMint,
      sponsorAlice.publicKey,
    );

    // authority's accepted mint ATA
    authorityAcceptedMintAta = await getAssociatedTokenAddress(
      acceptedMint,
      provider.wallet.publicKey,
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
    let aliceAcceptedMintAccount = await getAccount(
      provider.connection,
      sponsorAliceAcceptedMintATA,
    );
    expect(aliceAcceptedMintAccount.amount).to.be.equal(BigInt(20));

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

    aliceAcceptedMintAccount = await getAccount(
      provider.connection,
      sponsorAliceAcceptedMintATA,
    );
    expect(aliceAcceptedMintAccount.amount).to.be.equal(BigInt(15));

    const treasuryVaultAccount = await getAccount(
      provider.connection,
      treasuryVault,
    );
    expect(treasuryVaultAccount.amount).to.be.equal(BigInt(5));
  });

  it('Alice should get some tickets when buying', async () => {
    let aliceAcceptedMintAccount = await getAccount(
      provider.connection,
      sponsorAliceAcceptedMintATA,
    );
    expect(aliceAcceptedMintAccount.amount).to.be.equal(BigInt(15));

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

    const profitsVaultAccount = await getAccount(
      provider.connection,
      profitsVault,
    );
    expect(profitsVaultAccount.amount).to.be.equal(BigInt(5));

    aliceAcceptedMintAccount = await getAccount(
      provider.connection,
      sponsorAliceAcceptedMintATA,
    );
    expect(aliceAcceptedMintAccount.amount).to.be.equal(BigInt(10));

    const aliceEventAccount = await getAccount(
      provider.connection,
      sponsorAliceEventMintATA,
    );
    expect(aliceEventAccount.amount).to.be.equal(BigInt(5));
  });

  it('correctly withdraws funds', async () => {
    let treasuryVaultAccount = await getAccount(
      provider.connection,
      treasuryVault,
    );
    expect(treasuryVaultAccount.amount).to.be.equal(BigInt(5));

    const amount = new BN(1);
    await program.methods
      .withdrawFunds(amount)
      .accountsPartial({
        acceptedMint,
        authority: provider.wallet.publicKey,

        treasuryVault,
        event,
        authorityAcceptedMintAta,
      })
      .rpc();

    treasuryVaultAccount = await getAccount(provider.connection, treasuryVault);
    expect(treasuryVaultAccount.amount).to.be.equal(BigInt(4));

    const authorityAcceptedMintAtaAccount = await getAccount(
      provider.connection,
      authorityAcceptedMintAta,
    );

    expect(authorityAcceptedMintAtaAccount.amount).to.be.equal(BigInt(1));
  });

  it('closes the event', async () => {
    await program.methods
      .closeEvent()
      .accountsPartial({
        authority: provider.wallet.publicKey,

        event,
      })
      .rpc();

    // show new event info
    const eventAccount = await program.account.event.fetch(event);
    expect(eventAccount.isActive).to.be.false;
  });

  it("Alice can't buy tickets if the event is closed", async () => {
    let error: anchor.AnchorError;
    const quantity = new BN(2);
    try {
      await program.methods
        .buyTickets(quantity)
        .accountsPartial({
          authority: sponsorAlice.publicKey,
          payerAcceptedMintAta: sponsorAliceAcceptedMintATA,

          event,
          profitsVault,
        })
        .signers([sponsorAlice])
        .rpc();
      expect.fail(
        'Expected an error when trying to buy tickets from a closed event',
      );
    } catch (error) {
      expect(error).to.be.not.undefined;
      expect(error).to.be.instanceOf(anchor.AnchorError);
      expect((error as anchor.AnchorError).error.errorCode.code).to.be.eq(
        'EventClosed',
      );
      expect((error as anchor.AnchorError).error.errorCode.number).to.be.eq(
        program.idl.errors[0].code,
      );
    }
  });
});
