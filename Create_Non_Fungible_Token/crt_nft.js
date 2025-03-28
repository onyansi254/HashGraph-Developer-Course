const {
    Client,
    PrivateKey,
    AccountCreateTransaction,
    AccountBalanceQuery,
    Hbar,
    TransferTransaction,
    TokenCreateTransaction, 
    TokenType,
    TokenAssociateTransaction,
    TokenSupplyType,    
    TokenMintTransaction,
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

    //1.Create the NFT
    const nftCreate = await new TokenCreateTransaction()
        .setTokenName("Hedera Token Test")
        .setTokenSymbol("HTT")
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(myAccountId)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(250)
        .setSupplyKey(supplyKey)
        .freezeWith(client);

    //Log the tsupply key
    console.log("- supply key: " + supplyKey);

    //Sign the transaction with the treasury key
    const nftCreateTxSign = await nftCreate.sign(PrivateKey.fromString(myPrivateKey));

    //Submit the transaction to a Hedera network
    const nftCreateSubmit = await nftCreateTxSign.execute(client);

    //Get the transaction receipt
    const nftCreateRx = await nftCreateSubmit.getReceipt(client);

    //Get the token ID
    const tokenId = nftCreateRx.tokenId;

    //Log the token ID
    console.log("Created NFT with Token ID: " + tokenId);

    
    
    //2. Max transaction fee as a constant
    const maxTransactionFee = new Hbar(20);

    //IPFS content identifiers for which we will create a NFT
    const CID = [
    Buffer.from(
        "ipfs://bafyreiao6ajgsfji6qsgbqwdtjdu5gmul7tv2v3pd6kjgcw5o65b2ogst4/metadata.json"
    ),
    Buffer.from(
        "ipfs://bafyreic463uarchq4mlufp7pvfkfut7zeqsqmn3b2x3jjxwcjqx6b5pk7q/metadata.json"
    ),
    Buffer.from(
        "ipfs://bafyreihhja55q6h2rijscl3gra7a3ntiroyglz45z5wlyxdzs6kjh2dinu/metadata.json"
    ),
    Buffer.from(
        "ipfs://bafyreidb23oehkttjbff3gdi4vz7mjijcxjyxadwg32pngod4huozcwphu/metadata.json"
    ),
    Buffer.from(
        "ipfs://bafyreie7ftl6erd5etz5gscfwfiwjmht3b52cevdrf7hjwxx5ddns7zneu/metadata.json"
    )
    ];
        
    // MINT NEW BATCH OF NFTs
    const mintTx = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata(CID) //Batch minting - UP TO 10 NFTs in single tx
        .setMaxTransactionFee(maxTransactionFee)
        .freezeWith(client);

    //Sign the transaction with the supply key
    const mintTxSign = await mintTx.sign(supplyKey);

    //Submit the transaction to a Hedera network
    const mintTxSubmit = await mintTxSign.execute(client);

    //Get the transaction receipt
    const mintRx = await mintTxSubmit.getReceipt(client);

    //Log the serial number
    console.log("Created NFT " + tokenId + " with serial number: " + mintRx.serials);


    //Create the associate transaction and sign with Alice's key 
    const associateAccoutTxSubmit = await new TokenAssociateTransaction()
        .setAccountId(newAccountId)
        .setTokenIds([tokenId])
        .freezeWith(client)
        .sign(newAccountPrivateKey);

    //Submit the transaction to a Hedera network
    const associateAccountTxSubmit = await associateAccoutTxSubmit.execute(client);

    //Get the transaction receipt
    const associateAccountRx = await associateAccountTxSubmit.getReceipt(client);

    //Confirm the transaction was successful
    console.log(`NFT association with new account: ${associateAccountRx.status}\n`);


    //BALANCE CHECK
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log(`- New's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    

    // Transfer the NFT from treasury to Alice
    // Sign with the treasury key to authorize the transfer
    const tokenTransferTx = await new TransferTransaction()
        .addNftTransfer(tokenId, 1, myAccountId, newAccountId)
        .freezeWith(client)
        .sign(PrivateKey.fromString(myPrivateKey));

    const tokenTransferSubmit = await tokenTransferTx.execute(client);
    const tokenTransferRx = await tokenTransferSubmit.getReceipt(client);

    console.log(`\nNFT transfer from Treasury to New account: ${tokenTransferRx.status} \n`);

    // // Check the balance of the treasury account after the transfer
    // var balanceCheckTx = await new AccountBalanceQuery().setAccountId(treasuryId).execute(client);
    // console.log(`Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);

    // // Check the balance of Alice's account after the transfer
    // var balanceCheckTx = await new AccountBalanceQuery().setAccountId(aliceId).execute(client);
    // console.log(`Alice's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);

    //BALANCE CHECK
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log(`- New's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    

}

// Run the function
environmentSetup();