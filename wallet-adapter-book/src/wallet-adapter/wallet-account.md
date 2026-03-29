# Wallet Account

Known as an [Account](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAccount.html), it contains the details of a account. 

## Structure

```rust,no_run
#[derive(Clone, Default, PartialEq)]
pub struct WalletAccount {
    pub(crate) address: String,
    pub(crate) public_key: [u8; 32],
    pub(crate) chains: Vec<String>,
    pub(crate) features: Vec<String>,
    pub(crate) label: Option<String>,
    pub(crate) icon: Option<WalletIcon>,
    //...
}
```

### address field 

Contains a Base58 address String of the connected account

### public key

Contains the 32 byte array Ed25519 public key of the connected account

### label

Optional user-friendly descriptive label or name for the account. This may be displayed by the frontend app.

### icon

An optional [WalletIcon](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletIcon.html)

### chains

A sequence of [Clusters](https://docs.rs/wallet-adapter/latest/wallet_adapter/enum.Cluster.html) supported by the account.

### features

The features of the wallet standard supported by the account

## Methods on Wallet Account type

Let's initialize a `WalletAdapter` and assume we already connected to a browser extension wallet.

```rust,no_run
use wallet_adapter::{WalletAdapter, WalletError};

// Initialize wallet adapter
let adapter = WalletAdapter::init()?;

// Get the connection information 
// (we assumed we already connected to a browser extension wallet)
let connection_info = adapter.connection_info().await;
// Get the connected account that we will use in the examples below
// rather than repeating this processes again
let connected_account = connection_info.connected_account()?;
```

### Get the wallet label

```rust,no_run
account.label();
```

### Get the `optional` account icon

```rust,no_run
account.icon();
```

### Get the Bas58 address of the icon

```rust,no_run
account.address();
```

### Get the shortened address eg, `1Xfg...DghU`

```rust,no_run
account.shorten_address()?;

// Call to_string() method to convert it from a Cow<str> to a String
account.shorten_address()?.to_string();
```

### Get the Ed25519 32 byte array public key

```rust,no_run
account.public_key();
```

### Get the chains supported by the account

```rust,no_run
account.chains();
```

#### Check whether the account supports mainnet

```rust,no_run
account.mainnet();
```

#### Check whether the account supports testnet

```rust,no_run
account.testnet();
```

#### Check whether the account supports devnet

```rust,no_run
account.devnet();
```

#### Check whether the account supports localnet

```rust,no_run
account.localnet();
```

### Get the features of the wallet-standard supported by the account

```rust,no_run
account.features();
```

#### Check if the account supports `standard:connect` feature

```rust,no_run
account.standard_connect();
```

#### Check if the account supports `standard:disconnect` feature

```rust,no_run
account.standard_disconnect();
```

#### Check if the account supports `standard:events` feature

```rust,no_run
account.standard_events();
```

#### Check if the account supports `solana:signIn` feature

```rust,no_run
account.solana_signin();
```

#### Check if the account supports `solana:signMessage` feature

```rust,no_run
account.solana_sign_message();
```

#### Check if the account supports `solana:signTransaction` feature

```rust,no_run
account.solana_sign_transaction();
```

#### Check if the account supports `solana:signAndSendTransaction` feature

```rust,no_run
account.solana_sign_and_send_transaction();
```
