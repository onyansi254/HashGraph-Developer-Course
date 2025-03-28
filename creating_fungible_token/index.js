const {
    Client,
    PrivateKey,
    AccountCreateTransaction,
    AccountBalanceQuery,
    Hbar,
    TransferTransaction,
    TokenCreateTransaction, // Fixed: Re-added necessary imports
    TokenType,
    TokenAssociateTransaction, // Fixed: Re-added necessary imports
    TokenSupplyType // Fixed: Re-added necessary imports
} = require("@hashgraph/sdk");

require("dotenv").config();

async function environmentSetup() {
    // Grab your Hedera testnet account ID and Private key from your .env file
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    // If we weren't able to grab it, throw an error
    if (!myAccountId || !myPrivateKey) {
        throw new Error(
            "Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present"
        );
    }

    // Create your Hedera Testnet Client
    const client = Client.forTestnet();

    // Set your account as the client's operator
    client.setOperator(myAccountId, PrivateKey.fromString(myPrivateKey)); // Fixed: Ensuring correct operator key usage

    // Set the default maximum transaction fee (in Hbar)
    client.setDefaultMaxTransactionFee(new Hbar(100));

    // Set the maximum payment for queries (in Hbar)
    client.setMaxQueryPayment(new Hbar(50));

    // Create new keys
    const newAccountPrivateKey = PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    // Create a new account
    const newAccount = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.fromTinybars(100))
        .execute(client);

    // Get the receipt to retrieve the account ID
    const newAccountReceipt = await newAccount.getReceipt(client); // Fixed: Getting receipt correctly
    const newAccountId = newAccountReceipt.accountId; // Fixed: Extracting account ID correctly

    // Log the account ID
    console.log("The new account ID is: " + newAccountId);

    // Creating new supply key so you can create a new token called USDB
    const supplyKey = PrivateKey.generate();

    // CREATE FUNGIBLE TOKEN (STABLECOIN)
    let tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName("USD Bar")
        .setTokenSymbol("USDB")
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(2)
        .setInitialSupply(10000)
        .setTreasuryAccountId(myAccountId)
        .setSupplyType(TokenSupplyType.Infinite)
        .setSupplyKey(supplyKey)
        .freezeWith(client);

    // Sign with treasury key
    let tokenCreateSign = await tokenCreateTx.sign(PrivateKey.fromString(myPrivateKey)); // Fixed: `privateKey.fromString()` → `PrivateKey.fromString()`

    // Submit the transaction
    let tokenCreateSubmit = await tokenCreateSign.execute(client);

    // Get the transaction receipt
    let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);

    // Get the token ID
    let tokenId = tokenCreateRx.tokenId;

    // Log the token ID to the console
    console.log(`- Created token with ID: ${tokenId} \n`);

    // Associate the new account with the token
    const transaction = await new TokenAssociateTransaction()
        .setAccountId(newAccountId) // Fixed: Now `newAccountId` is properly defined
        .setTokenIds([tokenId])
        .freezeWith(client);

    // Sign transaction
    const signTx = await transaction.sign(newAccountPrivateKey);
    const txResponse = await signTx.execute(client);
    const associationReceipt = await txResponse.getReceipt(client);
    const transactionStatus = associationReceipt.status;

    console.log("Transaction of association was: " + transactionStatus);

    //  BALANCE CHECK
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log(`- New's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);

    // Transfer fungible token to new account
    const transferTransaction = await new TransferTransaction()
        .addTokenTransfer(tokenId, myAccountId, -10)
        .addTokenTransfer(tokenId, newAccountId, 10) // Fixed: `newAccountId` is now correctly defined
        .freezeWith(client);

    const signTransferTx = await transferTransaction.sign(PrivateKey.fromString(myPrivateKey)); // Fixed: `privateKey.fromString()` → `PrivateKey.fromString()`
    const transferTxResponse = await signTransferTx.execute(client);
    const transferReceipt = await transferTxResponse.getReceipt(client);
    const transferStatus = transferReceipt.status;

    console.log("The status of the token transfer is: " + transferStatus);

    //BALANCE CHECK
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log(`- New's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
}

// Run the function
environmentSetup();
