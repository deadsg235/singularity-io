# wallet

A type that describes a [browser extension wallet](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.Wallet.html) that implements the wallet-standard.

Registered wallets are stored using this type.

## Structure

```rust,no_run
#[derive(Clone, Default, PartialEq, Eq)]
pub struct Wallet {
    name: String,
    version: SemverVersion,
    icon: Option<WalletIcon>,
    accounts: Vec<WalletAccount>,
    chains: Vec<Cluster>,
    pub(crate) features: Features,
    //....
}
```

### Wallet Field

Describes the name of the wallet as a UTF-8 String.

### version field

The [Semantic Version](https://semver.org/) of the wallet-standard this wallet supports.

### icon field

An optional [wallet icon](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletIcon.html) encoded as Base64 image.

### accounts field

A sequence of accounts [wallet accounts](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAccount.html) provided by the connected wallet

### chains field

A sequence of [Clusters](https://docs.rs/wallet-adapter/latest/wallet_adapter/enum.Cluster.html) supported by the wallet.

### features field

The features of the wallet-standard supported by the wallet

## Methods on Wallet type

Let's initialize a `WalletAdapter` and assume we already connected to a browser extension wallet.

```rust,no_run
use wallet_adapter::{WalletAdapter, WalletError};

// Initialize wallet adapter
let adapter = WalletAdapter::init()?;

// Get the connection information 
// (we assumed we already connected to a browser extension wallet)
let connection_info = adapter.connection_info().await;

// If you just want to test out a wallet you can 
// 1. Get all wallets that registered themselves
let wallet = adapter.wallets().get(0).ok_or(WalletError::Op("No wallets found"))?;
// 2. Get a certain wallet by it's name, let's assume Solflare is installed
let wallet = adapter.get_wallet("sOlFlare").await?; // The wallet name is case-insensitive

// Get the connected wallet that we will use in the examples below
// rather than repeating this processes again
let wallet = connection_info.connected_wallet()?;
```

### Get the wallet name

```rust,no_run
wallet.name();
```

### Get the `optional` wallet icon

```rust,no_run
wallet.icon();
```

### Get the SemVer version of the wallet-standard supported by the wallet

```rust,no_run
wallet.version();
```

### Get the accounts if any are connected

```rust,no_run
wallet.accounts();
```

### Get the chains supported by the wallet

```rust,no_run
wallet.chains();
```

#### Check whether the wallet supports mainnet

```rust,no_run
wallet.mainnet();
```

#### Check whether the wallet supports testnet

```rust,no_run
wallet.testnet();
```

#### Check whether the wallet supports devnet

```rust,no_run
wallet.devnet();
```

#### Check whether the wallet supports localnet

```rust,no_run
wallet.localnet();
```

### Get the features of the wallet-standard supported by the wallet

```rust,no_run
wallet.features();
```

#### Check if the wallet supports `standard:connect` feature

```rust,no_run
wallet.standard_connect();
```

#### Check if the wallet supports `standard:disconnect` feature

```rust,no_run
wallet.standard_disconnect();
```

#### Check if the wallet supports `standard:events` feature

```rust,no_run
wallet.standard_events();
```

#### Check if the wallet supports `solana:signIn` feature

```rust,no_run
wallet.solana_signin();
```

#### Check if the wallet supports `solana:signMessage` feature

```rust,no_run
wallet.solana_sign_message();
```

#### Check if the wallet supports `solana:signTransaction` feature

```rust,no_run
wallet.solana_sign_transaction();
```

#### Check if the wallet supports `solana:signAndSendTransaction` feature

```rust,no_run
wallet.solana_sign_and_send_transaction();
```
