# `WalletAdapter` struct
Contains types and implements methods to dispatch events, listen for events and perform actions specified by the `wallet-standard`.

#### Structure
```rust,no_run
#[derive(Debug, Clone)]

pub struct WalletAdapter {
    window: Window,
    document: Document,
    storage: WalletStorage,
    connection_info: ConnectionInfoInner,
    wallet_events: WalletEventReceiver,
    wallet_events_sender: WalletEventSender,
    //...
}
```

#### window
Represents an optional [Browser Window Object](https://docs.rs/web-sys/latest/web_sys/struct.Window.html) object.
Handles both Dispatch (`wallet-standard:app-ready`) and listen (`wallet-standard:register-wallet`) events.
If the Browser window is not found the `WalletError::MissingAccessToBrowserWindow` error is returned.

#### document
Represent the [Browser Document Object](https://docs.rs/web-sys/latest/web_sys/struct.Document.html).
If the document object is not found the `WalletError::MissingAccessToBrowserDocument` is returned.

#### storage field
[WalletStorage](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletStorage.html#) is where the registered wallets are stored. It is an in-memory store of the registered wallets whose key is a hash that ensures no two wallets with the same name can be registered. All wallet names are case-insensitive.
The internal structure is:
```rust,no_run
Rc<RefCell<HashMap<blake3::Hash, Wallet>>>
```
Only the register event adds to the storage. 

 - Methods on storage
```rust.no_run
use wallet_adapter::WalletAdapter;

// Initializing a wallet adapter
let adapter = WalletAdapter::init()?;

// Fetch the account storage
let storage = adapter.storage();

// Cheaply clone the storage since it's an Rc<RefCell<T>>
storage.clone_inner();

// Get all the wallets
storage.get_wallets();

// Get a wallet
storage.get_wallet("pHantom"); // wallet names are case-insensitive so this still works
```

#### connection_info field
This field represents the [ConnectionInfo](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.ConnectionInfo.html) struct which contains the connected wallet and connected account.

It's internal structure:

```rust,no_run
#[derive(Debug, Clone, Default, PartialEq, Eq, PartialOrd, Ord)]
pub struct ConnectionInfo {
    wallet: Option<Wallet>,
    account: Option<WalletAccount>,
    previous_accounts: Vec<WalletAccount>,
}
```

- `wallet` field holds a [connected wallet](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.Wallet.html). When `WalletAdapter.connect()` method is called and a connection with a browser wallet is established successfully, this field is `Option::Some(Wallet)` else it is `Option::None`
- `account` field holds a [connected account](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAccount.html). When `WalletAdapter.connect()` method is called and a connection with a browser wallet is established successfully, this field is `Option::Some(WalletAccount)` else it is `Option::None`
- `previous_accounts` field contains a sequence of connected accounts. Some browser extension wallets emit events that can emit a connected event without disconnecting previous accounts. This account can be used to check if it is part of the sequence in the `previous_accounts` field therefore the `WalletAdapter` can emit the events `Reconnected` and `AccountChanged`.

#### wallet_events field

An [asynchronous listener](https://docs.rs/wallet-adapter/latest/wallet_adapter/type.WalletEventReceiver.html) of type:
```rust
pub type WalletEventReceiver = async_channel::Receiver<wallet_adapter::WalletEvent>;
```

It is an asynchronous type that can be used to listen for [events](https://docs.rs/wallet-adapter/latest/wallet_adapter/enum.WalletEvent.html) emitted by the [WalletAdapter](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAdapter.html) and can be accessed using the [WalletAdapter.events()](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAdapter.html#method.events) method. 

#### wallet_events_sender

An [async sender](https://docs.rs/wallet-adapter/latest/wallet_adapter/type.WalletEventSender.html) of type:

```rust
pub type WalletEventSender = Sender<WalletEvent>;
```

It is an asynchronous type that is used to send [wallet events](https://docs.rs/wallet-adapter/latest/wallet_adapter/enum.WalletEvent.html) to an [asynchronous listener](https://docs.rs/wallet-adapter/latest/wallet_adapter/type.WalletEventReceiver.html).

## Usage

### Initializing a WalletAdapter struct

```rust,no_run
use wallet_adapter::WalletAdapter;

let adapter = WalletAdapter::init()?;
```

### Fetching the browser extension wallets that registered themselves

```rust,no_run
// Get all wallets that were registered successfully
let wallets = adapter.wallets();

// Get a single wallet by it's name.
// Not that wallet names are case-insensitive
adapter.get_wallet("soLFlarE");
```

### Listen for WalletEvents

```rust,no_run
let events = adapter.events().clone(); // This is a cheap clone
if let Ok(event) = events.recv().await {
    // Do something with events from `wallet_adapter::WalletEvents` type
}
```

### Connect a wallet

`````rust,no_run
// Here `wallet` is the `Wallet` type is passed in from the dapp
// when the wallet presented to the user was clicked on or selected depending on the event
adapter.connect(wallet).await?; 

// You can also connect a wallet by it's name,
// if the wallet is not registered this will return an error
adapter.connect_by_ name("sOlFlare").await?; // wallet names are case-insensitive
`````

### Disconnect a wallet

```rust,no_run
adapter.disconnect().await; // This will purge the `ConnectionInfo` of any connected wallets and accounts
```

### Get the connection information

```rust,no_run
let connection_info = adapter.connection_info().await?;
```

### Check if a wallet is connected

```rust,no_run
adapter.is_connected();
```

### Perform operations as defined by the wallet-standard features

With the connection information, we no longer need to mutate anything within the `WalletAdapter` allowing for easy use of the operations event inside types that move other types outside of their scope. Remember, `ConnectionInfo` is wrapped in a `Arc<async_lock::RwLock<T>>` meaning that is is cheap to clone and safe to use in background tasks.

#### Authenticate/Authorize a user with Sign In With Solana (SIWS)

This method requires a [SigninInput](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.SigninInput.html) and a 32 byte Ed25519 public key and it returns a [SignInOutput](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.SignInOutput.html) if the data signed by the browser wallet is the same as the data requested, otherwise an error is returned.

You can read more about all the options available for the `SigninInput` from the [Sign In With Solana (SIWS) standard](https://github.com/JamiiDao/sign-in-with-solana).

***NOTE***: *Some wallets require the `address` field of the `SigninInput` or an error `MessageResponseMismatch` which is as a result of the sent message not corresponding with the signed message*

```rust,no_run
use wallet_adapter::{SigninInput, Cluster};

// Get the Ed25519 public key of the connected account
let public_key = adapter.connection_info().await.connected_account()?.public_key();

// Check if wallet supports SIWS
adapter.solana_signin()?; 

// Initialize a new `SigninInput`
let mut signin_input = SigninInput::new();

// Sets a randomly generated nonce.
// The nonce is cryptographically secure as long as the OS generating the nonce
// does it in a cryptographically secure manner.
signin_input.set_nonce();
let nonce = signin_input.nonce()?.clone();

let community = "JamiiDAO";
let user_id = "X48K48";
let message = String::new()
    + "Community: "
    + community
    + "USER ID: "
    + user_id
    + "SESSION: "
    + nonce.as_str();

let window = adapter.window(); //Access the browser window

signin_input
    .set_domain(&window)? // The browser window is required in order to fetch the domain
    .set_statement(&message)
    .set_chain_id(Cluster::DevNet) // Set the Solana network, here it is set to `solana:devnet`
    // NOTE: Some wallets require this field or the wallet adapter
    // will return an error `MessageResponseMismatch` which is as
    // a result of the sent message not corresponding with the signed message
    .set_address(&address)?;

let output = adapter.sign_in(input, public_key).await?;
```

#### Sign a Message

Sign a message encoded as bytes. This takes in some bytes and returns [SignedMessageOutput](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.SignedMessageOutput.html) containing the signed message. If the signed message doesn't match the requested message an error is returned.

```rust,no_run
let message = "Solana Foundation is awesome!";

adapter.signMessage(message.as_bytes()).await?;
```

#### Sign a Transaction

This takes in an serialized transaction as bytes and returns a Vector of bytes of the signed transaction. If the signed transaction does not match then an error is returned. Let's simulate transfer of lamports transaction.

Add `bincode` to the dependencies in `Cargo.toml` file

```rust,no_run
use solana_sdk::{pubkey::Pubkey, system_instruction, transaction::Transaction};
use wallet_adapter::Cluster;

// How many lamports to transfer
let lamports = 500_000_000u64;

// Public key of the connected account
let public_key = adapter.connection_info().connected_account()?.address();
let pubkey = Pubkey::new_from_array(public_key);


// Simulate a recipient using a random public key,
// Not that lamports sent to this address will be lost
let recipient_pubkey = Pubkey::new_from_array(Utils::public_key_rand());

// Construct the instruction
let instr = system_instruction::transfer(&pubkey, &recipient_pubkey, lamports);
let tx = Transaction::new_with_payer(&[instr], Some(&pubkey));
let tx_bytes = bincode::serialize(&tx).unwrap();
let cluster = Cluster::DevNet;

adapter.sign_transaction(&tx_bytes, Some(cluster)).await?;
```

#### Sign and send a Transaction

This takes in an serialized transaction as bytes, a cluster and [SendOptions](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.SendOptions.html) and returns an [Ed25519 Signature](https://docs.rs/ed25519/latest/ed25519/struct.Signature.html) of the signed transaction. If the signed transaction does not match then an error is returned. 

The [SendOptions](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.SendOptions.html) include the `max retries`, `preflight_commitment` and `skip_preflight` fields.

Let's simulate transfer of lamports transaction.

Add `bincode` to the dependencies in `Cargo.toml` file

```rust,no_run
use solana_sdk::{pubkey::Pubkey, system_instruction, transaction::Transaction};
use wallet_adapter::{Cluster, SendOptions};

// How many lamports to transfer
let lamports = 500_000_000u64;

// Public key of the connected account
let public_key = adapter.connection_info().connected_account()?.address();
let pubkey = Pubkey::new_from_array(public_key);


// Simulate a recipient using a random public key,
// Not that lamports sent to this address will be lost
let recipient_pubkey = Pubkey::new_from_array(Utils::public_key_rand());

let send_options = SendOptions::default();

// Construct the instruction
let instr = system_instruction::transfer(&pubkey, &recipient_pubkey, lamports);
let tx = Transaction::new_with_payer(&[instr], Some(&pubkey));
let tx_bytes = bincode::serialize(&tx).unwrap();
let cluster = Cluster::DevNet;

// Returns an Ed25519 signature
let signature = adapter.sign_and_send_transaction(&tx_bytes, cluster, send_options).await?;
```

### Verification of signin, sign message and sign transaction requests

All sign requests are verified using the public key of the connected account. If the signature fails then an error informing the user of signature mismatch is returned.

### Checking for features supported by the connected wallet

```rust,no_run
// Check if the connected wallet supports `standard:connect`
adapter.standard_connect().await?;

// Check if the connected wallet supports `standard:disconnect`
adapter.standard_disconnect().await?;

// Check if the connected wallet supports `solana:signIn`
adapter.solana_signin().await?;

// Check if the connected wallet supports `solana:signIn`
adapter.solana_signin().await?;

// Check if the connected wallet supports `solana:signMessage`
adapter.solana_sign_message().await?;

// Check if the connected wallet supports `solana:signTransaction`
adapter.solana_sign_transaction().await?;

// Check if the connected wallet supports `solana:signAndSendTransaction`
adapter.solana_sign_and_send_transaction.await?;
```

### Checking for supported chains e.g. `solana:mainnet`

```rust,no_run
// Check if the connected wallet supports `solana:mainnet`
adapter.mainnet().await?;

// Check if the connected wallet supports `solana:testnet`
adapter.testnet().await?;

// Check if the connected wallet supports `solana:devnet`
adapter.devnet().await?;

// Check if the connected wallet supports `solana:localnet`
adapter.localnet().await?;
```