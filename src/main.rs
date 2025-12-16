use clap::{Arg, Command};
use serde_json::json;
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_request::TokenAccountsFilter;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
};
use std::str::FromStr;

const RPC_URL: &str = "https://api.mainnet-beta.solana.com";

fn main() -> anyhow::Result<()> {
    let matches = Command::new("solana_bridge")
        .version("0.1.0")
        .about("Solana Wallet Bridge for Singularity.io")
        .subcommand(
            Command::new("connect")
                .about("Connect to wallet")
        )
        .subcommand(
            Command::new("balance")
                .about("Get SOL balance")
                .arg(Arg::new("address").required(true))
        )
        .subcommand(
            Command::new("token_balance")
                .about("Get token balance")
                .arg(Arg::new("address").required(true))
                .arg(Arg::new("mint").required(true))
        )
        .subcommand(
            Command::new("send")
                .about("Send SOL")
                .arg(Arg::new("to").required(true))
                .arg(Arg::new("amount").required(true))
        )
        .subcommand(
            Command::new("create_token")
                .about("Create SPL token")
                .arg(Arg::new("name").required(true))
                .arg(Arg::new("symbol").required(true))
                .arg(Arg::new("decimals").required(true))
        )
        .get_matches();

    match matches.subcommand() {
        Some(("connect", _)) => handle_connect(),
        Some(("balance", sub_m)) => {
            let address = sub_m.get_one::<String>("address").unwrap();
            handle_balance(address)
        }
        Some(("token_balance", sub_m)) => {
            let address = sub_m.get_one::<String>("address").unwrap();
            let mint = sub_m.get_one::<String>("mint").unwrap();
            handle_token_balance(address, mint)
        }
        Some(("send", sub_m)) => {
            let to = sub_m.get_one::<String>("to").unwrap();
            let amount = sub_m.get_one::<String>("amount").unwrap();
            handle_send(to, amount)
        }
        Some(("create_token", sub_m)) => {
            let name = sub_m.get_one::<String>("name").unwrap();
            let symbol = sub_m.get_one::<String>("symbol").unwrap();
            let decimals = sub_m.get_one::<String>("decimals").unwrap();
            handle_create_token(name, symbol, decimals)
        }
        _ => {
            eprintln!("No valid subcommand provided");
            std::process::exit(1);
        }
    }
}

fn handle_connect() -> anyhow::Result<()> {
    // Simulate wallet connection
    let keypair = Keypair::new();
    let public_key = keypair.pubkey().to_string();
    
    let response = json!({
        "success": true,
        "public_key": public_key
    });
    
    println!("{}", response);
    Ok(())
}

fn handle_balance(address: &str) -> anyhow::Result<()> {
    let client = RpcClient::new_with_commitment(RPC_URL.to_string(), CommitmentConfig::confirmed());
    let pubkey = Pubkey::from_str(address)?;
    
    match client.get_balance(&pubkey) {
        Ok(balance) => {
            let sol_balance = balance as f64 / 1_000_000_000.0;
            let response = json!({
                "success": true,
                "balance": sol_balance
            });
            println!("{}", response);
        }
        Err(e) => {
            let response = json!({
                "success": false,
                "error": e.to_string()
            });
            println!("{}", response);
        }
    }
    
    Ok(())
}

fn handle_token_balance(address: &str, mint: &str) -> anyhow::Result<()> {
    let client = RpcClient::new_with_commitment(RPC_URL.to_string(), CommitmentConfig::confirmed());
    let owner_pubkey = Pubkey::from_str(address)?;
    let mint_pubkey = Pubkey::from_str(mint)?;
    
    let filter = TokenAccountsFilter::Mint(mint_pubkey);
    match client.get_token_accounts_by_owner(&owner_pubkey, filter) {
        Ok(accounts) => {
            let balance = if accounts.is_empty() {
                0.0
            } else {
                // Get first token account balance
                let account_pubkey = Pubkey::from_str(&accounts[0].pubkey)?;
                match client.get_token_account_balance(&account_pubkey) {
                    Ok(balance_info) => balance_info.ui_amount.unwrap_or(0.0),
                    Err(_) => 0.0
                }
            };
            
            let response = json!({
                "success": true,
                "balance": balance
            });
            println!("{}", response);
        }
        Err(e) => {
            let response = json!({
                "success": false,
                "error": e.to_string()
            });
            println!("{}", response);
        }
    }
    
    Ok(())
}

fn handle_send(_to: &str, _amount: &str) -> anyhow::Result<()> {
    // Placeholder for send functionality
    let response = json!({
        "success": false,
        "error": "Send functionality requires wallet integration"
    });
    println!("{}", response);
    Ok(())
}

fn handle_create_token(_name: &str, _symbol: &str, _decimals: &str) -> anyhow::Result<()> {
    // Placeholder for token creation
    let response = json!({
        "success": false,
        "error": "Token creation requires wallet integration"
    });
    println!("{}", response);
    Ok(())
}