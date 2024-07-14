import { AnchorProvider, web3 } from '@coral-xyz/anchor';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

export const createFundedWallet = async (
  provider: AnchorProvider,
  amount = 1, // SOL amount
): Promise<web3.Keypair> => {
  // create new user key pair
  const user = new web3.Keypair();

  // transfer SOL from provider wallet to the new user wallet
  await provider.sendAndConfirm(
    new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey, // provider wallet
        toPubkey: user.publicKey, // new user wallet
        lamports: amount * web3.LAMPORTS_PER_SOL, // amount in lamports
      }),
    ),
  );

  // return user key pair with funds
  return user;
};

// Create new Token (Mint Account)
export const createMint = async (
  provider: AnchorProvider,
  decimals = 0, // no decimals
): Promise<web3.PublicKey> => {
  // token key pair
  const tokenMint = new web3.Keypair();
  // calculate rent
  const lamportsForMint =
    await provider.connection.getMinimumBalanceForRentExemption(
      MintLayout.span, // Mint layout
    );

  // Allocate mint and wallet account
  await provider.sendAndConfirm(
    new web3.Transaction()
      .add(
        // create mint account
        web3.SystemProgram.createAccount({
          programId: TOKEN_PROGRAM_ID, // program_id
          space: MintLayout.span, // space
          fromPubkey: provider.wallet.publicKey, // payer
          newAccountPubkey: tokenMint.publicKey, // token address
          lamports: lamportsForMint, // rent
        }),
      )
      .add(
        // initialize mint account
        createInitializeMintInstruction(
          tokenMint.publicKey, // token address
          decimals, // decimals
          provider.wallet.publicKey, // mint authority
          provider.wallet.publicKey, // freeze authority
        ),
      ),
    [tokenMint], // signer
  );
  //returns new Token address
  return tokenMint.publicKey;
};

// finds the ATA and mint <amount> tokens
export const createAssociatedTokenAccount = async (
  provider: AnchorProvider,
  mint: PublicKey, // mint of the ATA
  amount: number | bigint, // amount to mint
  user: Keypair, // owner of the ATA
): Promise<PublicKey | undefined> => {
  // find ATA
  const userAssociatedTokenAccount = await getAssociatedTokenAddress(
    mint, // mint
    user.publicKey, // owner
  );

  // Create ATA for the user and mint some tokens
  await provider.sendAndConfirm(
    new Transaction()
      .add(
        // create ATA
        createAssociatedTokenAccountInstruction(
          user.publicKey, // payer
          userAssociatedTokenAccount, // ATA
          user.publicKey, // owner
          mint, // mint
        ),
      )
      .add(
        // mint tokens
        createMintToInstruction(
          mint, // mint
          userAssociatedTokenAccount, // ATA
          provider.wallet.publicKey, // mint authority
          amount, // amount to mint
        ),
      ),
    [user], // signer
  );

  return userAssociatedTokenAccount; // return ATA
};
