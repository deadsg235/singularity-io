# Connection Info

The [ConnectionInfo](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.ConnectionInfo.html) contains the [connected wallet](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.Wallet.html) and [connected account](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAccount.html) information as discussed in the previous section.



Let's initialize a `WalletAdapter` and get the `ConnectionInfo`

```rust,no_run
use wallet_adapter::WalletAdapter;

// Initialize the wallet adapter
let adapter = WalletAdapter::init()?;
let connection_info = adapter.connection_info();
```

Calling the [WalletAdapter.connection_info()](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAdapter.html#method.connection_info) method returns a [RwLockReadGuard<'_, ConnectionInfo>](https://docs.rs/async-lock/latest/async_lock/struct.RwLockReadGuard.html) because the `WalletAdapter`s internal structure for connection info is `Arc<RwLock<ConnectionInfo>>` which enforces strong consistency guarantees when the type is used in background tasks.

#### Getting the connected wallet

The [connected wallet](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.Wallet.html) exists if the method `WalletAdapter.connect()` was called successfully therefore is a connection to a browser wallet was not established, this field is `Option::None`

```rust,no_run
// WalletAdapter automatically converts this to an Result<&Wallet, WalletError>
// so that when the field is `Option::None`, an error `WalletError::WalletNotFound` is returned
connection_info.connected_wallet()?;

// To get an Option<&Wallet>
// However, use `connected_wallet()` in order to provide feedback of a formatted error 
connection_info.connected_wallet_raw()?;
```

#### Getting the connected account

The [connected account](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAccount.html) exists if the method `WalletAdapter.connect()` was called successfully therefore is a connection to a browser wallet was not established, this field is `Option::None`

```rust,no_run
// WalletAdapter automatically converts this to an Result<&WalletAccount, WalletError>
// so that when the field is `Option::None`, an error `WalletError::AccountNotFound` is returned
connection_info.connected_account()?;

// To get an Option<&WalletAccount>
// However, use `connected_account()` in order to provide feedback of a formatted error 
connection_info.connected_account_raw()?;
```
