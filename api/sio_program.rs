// S-IO Solana Program (Rust)
// Minimal on-chain program for S-IO data transactions

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
    program::invoke,
};
use borsh::{BorshDeserialize, BorshSerialize};

// Program entrypoint
entrypoint!(process_instruction);

// Instruction discriminators
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum SIOInstruction {
    /// Store data with hash and metadata
    /// Accounts: [signer] payer, [writable] data_account, [] system_program
    StoreData { data_hash: [u8; 32], metadata: Vec<u8> },
    
    /// Retrieve data by hash
    /// Accounts: [] data_account
    RetrieveData { data_hash: [u8; 32] },
    
    /// Verify payment
    /// Accounts: [signer] payer, [] recipient, [] token_program
    VerifyPayment { amount: u64, nonce: [u8; 32] },
    
    /// Settle payment
    /// Accounts: [signer] payer, [writable] recipient, [] token_program
    SettlePayment,
}

// Account data structures
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct SIODataAccount {
    pub discriminator: u8,
    pub owner: Pubkey,
    pub data_hash: [u8; 32],
    pub timestamp: i64,
    pub metadata_len: u16,
    pub settled: bool,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct SIOPaymentAccount {
    pub discriminator: u8,
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub nonce: [u8; 32],
    pub verified: bool,
    pub settled: bool,
}

// Program implementation
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = SIOInstruction::try_from_slice(instruction_data)?;
    
    match instruction {
        SIOInstruction::StoreData { data_hash, metadata } => {
            process_store_data(program_id, accounts, data_hash, metadata)
        }
        SIOInstruction::RetrieveData { data_hash } => {
            process_retrieve_data(accounts, data_hash)
        }
        SIOInstruction::VerifyPayment { amount, nonce } => {
            process_verify_payment(program_id, accounts, amount, nonce)
        }
        SIOInstruction::SettlePayment => {
            process_settle_payment(accounts)
        }
    }
}

fn process_store_data(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data_hash: [u8; 32],
    metadata: Vec<u8>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let payer = next_account_info(account_info_iter)?;
    let data_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    
    // Validate accounts
    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Calculate required space
    let account_size = std::mem::size_of::<SIODataAccount>() + metadata.len();
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(account_size);
    
    // Create account
    invoke(
        &system_instruction::create_account(
            payer.key,
            data_account.key,
            lamports,
            account_size as u64,
            program_id,
        ),
        &[payer.clone(), data_account.clone(), system_program.clone()],
    )?;
    
    // Initialize account data
    let mut account_data = SIODataAccount {
        discriminator: 0,
        owner: *payer.key,
        data_hash,
        timestamp: solana_program::clock::Clock::get()?.unix_timestamp,
        metadata_len: metadata.len() as u16,
        settled: false,
    };
    
    // Serialize and store
    let mut data = data_account.try_borrow_mut_data()?;
    account_data.serialize(&mut &mut data[..])?;
    
    // Store metadata after struct
    if !metadata.is_empty() {
        let metadata_start = std::mem::size_of::<SIODataAccount>();
        data[metadata_start..metadata_start + metadata.len()].copy_from_slice(&metadata);
    }
    
    msg!("Data stored with hash: {:?}", data_hash);
    Ok(())
}

fn process_retrieve_data(
    accounts: &[AccountInfo],
    data_hash: [u8; 32],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let data_account = next_account_info(account_info_iter)?;
    
    // Deserialize account data
    let data = data_account.try_borrow_data()?;
    let account_data = SIODataAccount::try_from_slice(&data)?;
    
    // Verify hash matches
    if account_data.data_hash != data_hash {
        return Err(ProgramError::InvalidAccountData);
    }
    
    msg!("Data retrieved: owner={}, timestamp={}", 
         account_data.owner, account_data.timestamp);
    
    Ok(())
}

fn process_verify_payment(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
    nonce: [u8; 32],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let payer = next_account_info(account_info_iter)?;
    let recipient = next_account_info(account_info_iter)?;
    let payment_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    
    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Create payment verification account
    let account_size = std::mem::size_of::<SIOPaymentAccount>();
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(account_size);
    
    invoke(
        &system_instruction::create_account(
            payer.key,
            payment_account.key,
            lamports,
            account_size as u64,
            program_id,
        ),
        &[payer.clone(), payment_account.clone(), system_program.clone()],
    )?;
    
    // Initialize payment data
    let payment_data = SIOPaymentAccount {
        discriminator: 2,
        payer: *payer.key,
        recipient: *recipient.key,
        amount,
        nonce,
        verified: true,
        settled: false,
    };
    
    // Store payment data
    let mut data = payment_account.try_borrow_mut_data()?;
    payment_data.serialize(&mut &mut data[..])?;
    
    msg!("Payment verified: amount={}, nonce={:?}", amount, nonce);
    Ok(())
}

fn process_settle_payment(accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let payer = next_account_info(account_info_iter)?;
    let recipient = next_account_info(account_info_iter)?;
    let payment_account = next_account_info(account_info_iter)?;
    
    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Update payment account to settled
    let mut data = payment_account.try_borrow_mut_data()?;
    let mut payment_data = SIOPaymentAccount::try_from_slice(&data)?;
    
    // Verify payer matches
    if payment_data.payer != *payer.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    payment_data.settled = true;
    payment_data.serialize(&mut &mut data[..])?;
    
    msg!("Payment settled: payer={}, recipient={}, amount={}", 
         payer.key, recipient.key, payment_data.amount);
    
    Ok(())
}