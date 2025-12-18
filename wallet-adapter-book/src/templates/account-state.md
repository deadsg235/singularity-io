# The Account State

This type consists of the user's SOL balance, the user's token accounts info and user's transactions. These three are determined by the public key of the connected account.

## Structure

```rust,no_run
#[derive(Debug, Default, PartialEq)]
pub struct AccountState {
    // The user's float balance formatted as a String
    pub balance: String,
    // The token accounts
    pub token_accounts: Vec<TokenAccountResponse>,
    // The signatures
    pub transactions: Vec<SignaturesResponse>,
}

impl AccountState {
    pub fn token_accounts_is_empty(&self) -> bool {
        self.token_accounts.is_empty()
    }

    pub fn transactions_is_empty(&self) -> bool {
        self.token_accounts.is_empty()
    }

    pub fn token_accounts(&self) -> &[TokenAccountResponse] {
        self.token_accounts.as_slice()
    }

    pub fn transactions(&self) -> &[SignaturesResponse] {
        self.transactions.as_slice()
    }
}

```

## Usage

{{#tabs }}
{{#tab name="Dioxus" }}
```rust,no_run
use dioxus::prelude::*;

// Defined as a global variable
pub(crate) static ACCOUNT_STATE: GlobalSignal<AccountState> =
    Signal::global(|| AccountState::default());

mod another_scope {
    use dioxus::prelude::*;
    use crate::ACCOUNT_STATE;
    
    #[component]
    pub fn MyComponent() -> Element {
        // Get the balance
        ACCOUNT_STATE.read().balance.as_str();

        // Check if the token accounts is empty, can be useful for 
        // display a custom message if there are not transactions for the connected account
        if ACCOUNT_STATE.read().token_accounts_is_empty(){
            // Do something
        }else {
            // Do something
        }

        for token_account in ACCOUNT_STATE.read().token_accounts() {
           // Access the token mint
            token_account.mint();

            // Access the associated token account
            token_account.ata_address();

            // Get the token balance for the ATA.
            token_account.balance();

            // Check if the account is initialized
            token_account.state();
        }

         // Check if the token accounts is empty, can be useful for 
        // display a custom message if there are not token accounts for the connected account
         if ACCOUNT_STATE.read().transactions_is_empty(){
            // Do something here
        }else {
            // Do something here
        }

        for tx in ACCOUNT_STATE.read().transactions() {
            // Get the transaction signature
            tx.signature.clone();
            // Get the transaction block time
            tx.block_time;
            // get the confirmation status
            tx.confirmation_status.clone();
            // Check if the transaction succeeded
            tx.err.is_none();
        }
    }
}
```
{{#endtab }}

{{#tab name="Sycamore" }}
```rust,no_run
use sycamore::prelude::*;
use crate::AccountState;

#[component]
fn App() -> View {
	provide_context(create_signal(AccountState::default()));
}

mod another_scope {
    use sycamore::prelude::*;
    use crate::AccountState;
    
    #[component]
    pub fn MyComponent() -> Element {
		let account_state = use_context::<Signal<AccountState>>();

        // Get the balance
        account_state.get_clone().balance.as_str();

        // Check if the token accounts is empty, can be useful for 
        // display a custom message if there are not transactions for the connected account
        if account_state.get_clone().read().token_accounts_is_empty(){
            // Do something
        }else {
            // Do something
        }

        for token_account in account_state.get_clone().read().token_accounts() {
           // Access the token mint
            token_account.mint();

            // Access the associated token account
            token_account.ata_address();

            // Get the token balance for the ATA.
            token_account.balance();

            // Check if the account is initialized
            token_account.state();
        }

         // Check if the token accounts is empty, can be useful for 
        // display a custom message if there are not token accounts for the connected account
         if account_state.get_clone().transactions_is_empty(){
            // Do something here
        }else {
            // Do something here
        }

        for tx in account_state.get_clone().transactions() {
            // Get the transaction signature
            tx.signature.clone();
            // Get the transaction block time
            tx.block_time;
            // get the confirmation status
            tx.confirmation_status.clone();
            // Check if the transaction succeeded
            tx.err.is_none();
        }
    }
}
```
{{#endtab }}

{{#tab name="Yew" }}
```rust,no_run
use yew::prelude::*;
use crate::AccountInfoData;

#[function_component(App)]
pub fn accounts() -> Html {
	let account_info_state = use_reducer(|| AccountInfoData::default());

     // Get the balance
    account_info_state.balance.as_str();

    // Check if the token accounts is empty, can be useful for 
    // display a custom message if there are not transactions for the connected account
    if account_info_state.token_accounts_is_empty(){
        // Do something
    }else {
        // Do something
    }

    for token_account in account_info_state.token_accounts() {
       // Access the token mint
        token_account.mint();

        // Access the associated token account
        token_account.ata_address();

        // Get the token balance for the ATA.
        token_account.balance();

        // Check if the account is initialized
        token_account.state();
    }

     // Check if the token accounts is empty, can be useful for 
    // display a custom message if there are not token accounts for the connected account
     if account_info_state.transactions_is_empty(){
        // Do something here
    }else {
        // Do something here
    }

    for tx in account_info_state.transactions() {
        // Get the transaction signature
        tx.signature.clone();
        // Get the transaction block time
        tx.block_time;
        // get the confirmation status
        tx.confirmation_status.clone();
        // Check if the transaction succeeded
        tx.err.is_none();
    }
}
```
{{#endtab }}
{{#endtabs }}
